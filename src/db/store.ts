// Store: the one write path for answering an item, plus the derived reads the
// screens need (progress by domain, streak, weak tags). All functions take an
// injectable db + clock so tests run on fake-indexeddb with a fixed date.

import type { Item } from '@/content/types'
import { domainGroup } from '@/content/types'
import { newSchedulerState, rate, isMastered, retrievability, type SelfRating } from '@/engine/fsrs'
import { eloUpdate, kForAnswerCount } from '@/engine/elo'
import type { ItemProgress } from '@/engine/session'
import { db as defaultDb, type TrainerDB, type ReviewRow, type ReviewFlagRow } from './db'

export const DEFAULT_DAILY_GOAL = 40
const DEFAULT_THETA = 0

export interface AnswerInput {
  item: Item
  correct: boolean
  rating: SelfRating
  ms: number
}

export function localDate(now: Date): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function getTheta(db: TrainerDB = defaultDb): Promise<number> {
  const row = await db.kv.get('theta')
  return typeof row?.value === 'number' ? row.value : DEFAULT_THETA
}

export async function getAnsweredCount(db: TrainerDB = defaultDb): Promise<number> {
  return db.reviews.count()
}

export async function getRetention(db: TrainerDB = defaultDb): Promise<number> {
  const row = await db.kv.get('requestRetention')
  return typeof row?.value === 'number' ? row.value : 0.9
}

export async function setRetention(v: number, db: TrainerDB = defaultDb): Promise<void> {
  await db.kv.put({ key: 'requestRetention', value: v })
}

export async function getDailyGoal(db: TrainerDB = defaultDb): Promise<number> {
  const row = await db.kv.get('dailyGoal')
  return typeof row?.value === 'number' ? row.value : DEFAULT_DAILY_GOAL
}

/** Load all per-item progress as the map the session generator consumes. */
export async function loadProgress(db: TrainerDB = defaultDb): Promise<Map<string, ItemProgress>> {
  const rows = await db.progress.toArray()
  return new Map(rows.map((r) => [r.itemId, { scheduler: r.scheduler, b: r.b }]))
}

/**
 * The single write path for an answer: FSRS reschedule, Elo θ/b update,
 * telemetry append, day counter. Procedural items (pn_/pa_ ids) get progress
 * rows too — they just never recur, so only their telemetry matters.
 */
export async function recordAnswer(
  input: AnswerInput,
  now: Date,
  db: TrainerDB = defaultDb,
): Promise<void> {
  const { item, correct, rating, ms } = input
  const retention = await getRetention(db)
  const answeredCount = await getAnsweredCount(db)
  const theta = await getTheta(db)

  const existing = await db.progress.get(item.id)
  const scheduler = rate(existing?.scheduler ?? newSchedulerState(now), rating, now, retention)
  const b0 = existing?.b ?? item.difficulty_b
  const { theta: theta1, b: b1 } = eloUpdate(theta, b0, correct, kForAnswerCount(answeredCount))

  await db.transaction('rw', [db.progress, db.reviews, db.days, db.kv], async () => {
    await db.progress.put({
      itemId: item.id,
      scheduler,
      b: b1,
      answers: (existing?.answers ?? 0) + 1,
      correctCount: (existing?.correctCount ?? 0) + (correct ? 1 : 0),
    })
    await db.reviews.add({
      itemId: item.id,
      type: item.type,
      domain: item.domain,
      correct: correct ? 1 : 0,
      rating,
      ms,
      at: now.toISOString(),
      theta: theta1,
    })
    const date = localDate(now)
    const day = await db.days.get(date)
    await db.days.put({ date, answered: (day?.answered ?? 0) + 1 })
    await db.kv.put({ key: 'theta', value: theta1 })
  })
}

export interface DomainStats {
  domain: string
  group: string
  seen: number
  total: number
  accuracy: number
  mastered: number
  avgRecall: number
}

/** Mastery + predicted-recall per domain, for the Progress screen. */
export async function domainStats(
  bank: Item[],
  now: Date,
  db: TrainerDB = defaultDb,
): Promise<DomainStats[]> {
  const progress = await db.progress.toArray()
  const byId = new Map(progress.map((r) => [r.itemId, r]))
  const byDomain = new Map<string, Item[]>()
  for (const it of bank) {
    if (it.type === 'eufte_scenario') continue
    const list = byDomain.get(it.domain) ?? []
    list.push(it)
    byDomain.set(it.domain, list)
  }
  const out: DomainStats[] = []
  for (const [domain, items] of byDomain) {
    let seen = 0
    let answers = 0
    let correct = 0
    let mastered = 0
    let recallSum = 0
    for (const it of items) {
      const row = byId.get(it.id)
      if (!row) continue
      seen++
      answers += row.answers
      correct += row.correctCount
      if (isMastered(row.scheduler)) mastered++
      recallSum += retrievability(row.scheduler, now)
    }
    out.push({
      domain,
      group: domainGroup(domain),
      seen,
      total: items.length,
      accuracy: answers ? correct / answers : 0,
      mastered,
      avgRecall: seen ? recallSum / seen : 0,
    })
  }
  return out.sort((a, b) => a.domain.localeCompare(b.domain))
}

export interface WeakTag {
  domain: string
  answers: number
  accuracy: number
}

/**
 * Weak-tag report (PRD §6.4): domains ranked by accuracy over recent reviews.
 * This is the export that steers the next authoring run.
 */
export async function weakTags(minAnswers = 3, db: TrainerDB = defaultDb): Promise<WeakTag[]> {
  const reviews = await db.reviews.toArray()
  const agg = new Map<string, { n: number; c: number }>()
  for (const r of reviews) {
    const a = agg.get(r.domain) ?? { n: 0, c: 0 }
    a.n++
    a.c += r.correct
    agg.set(r.domain, a)
  }
  return [...agg.entries()]
    .filter(([, a]) => a.n >= minAnswers)
    .map(([domain, a]) => ({ domain, answers: a.n, accuracy: a.c / a.n }))
    .sort((x, y) => x.accuracy - y.accuracy)
}

export interface StreakInfo {
  todayAnswered: number
  goal: number
  streak: number
}

/**
 * Streak = consecutive days (ending today or yesterday) with any practice.
 * Free by design: a missed day pauses rather than shames (no loss-aversion).
 */
export async function streakInfo(now: Date, db: TrainerDB = defaultDb): Promise<StreakInfo> {
  const goal = await getDailyGoal(db)
  const days = await db.days.toArray()
  const byDate = new Map(days.map((d) => [d.date, d.answered]))
  const todayAnswered = byDate.get(localDate(now)) ?? 0
  let streak = 0
  const cursor = new Date(now)
  // Today counts if practiced; otherwise start from yesterday (streak not yet lost).
  if (!byDate.get(localDate(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (byDate.get(localDate(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return { todayAnswered, goal, streak }
}

/**
 * Record (or toggle off) a spot-check verdict on an item. Approvals make an
 * unreviewed item Mock-eligible on this device immediately; rejections pull it
 * from all sessions. `tools/apply-review.mjs` applies exported verdicts to the
 * committed packs, closing the loop in git.
 */
export async function setReviewFlag(
  itemId: string,
  verdict: 'approved' | 'rejected' | null,
  now: Date,
  db: TrainerDB = defaultDb,
): Promise<void> {
  if (verdict === null) await db.reviewFlags.delete(itemId)
  else await db.reviewFlags.put({ itemId, verdict, at: now.toISOString() })
}

export async function loadReviewFlags(db: TrainerDB = defaultDb): Promise<Map<string, 'approved' | 'rejected'>> {
  const rows = await db.reviewFlags.toArray()
  return new Map(rows.map((r) => [r.itemId, r.verdict]))
}

/** Full telemetry export (PRD §6.4) — feeds the authoring loop. */
export async function exportTelemetry(db: TrainerDB = defaultDb): Promise<{
  exportedAt: string
  weakTags: WeakTag[]
  reviewFlags: ReviewFlagRow[]
  reviews: ReviewRow[]
}> {
  return {
    exportedAt: new Date().toISOString(),
    weakTags: await weakTags(3, db),
    reviewFlags: await db.reviewFlags.toArray(),
    reviews: await db.reviews.toArray(),
  }
}
