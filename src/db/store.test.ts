import { beforeEach, describe, expect, it } from 'vitest'
import { TrainerDB } from './db'
import {
  domainStats,
  exportTelemetry,
  getAnsweredCount,
  getTheta,
  loadProgress,
  localDate,
  recordAnswer,
  streakInfo,
  weakTags,
} from './store'
import type { Item } from '@/content/types'

const NOW = new Date('2026-07-18T10:00:00Z')

function mkItem(id: string, domain: string): Item {
  return {
    id,
    type: 'field_mcq',
    domain,
    competency: ['analysis_problem_solving'],
    difficulty_b: 0.5,
    stem: `Question ${id} with enough length?`,
    options: [
      { key: 'A', text: 'a' },
      { key: 'B', text: 'b' },
      { key: 'C', text: 'c' },
      { key: 'D', text: 'd' },
    ],
    correct: 'A',
    rationale: 'A is correct for reasons.',
    source: { title: 's' },
    provenance: { generator: 'hand', run: 'test', reviewed: true },
    version: 1,
  }
}

let db: TrainerDB
let dbCounter = 0

beforeEach(() => {
  db = new TrainerDB(`test-${++dbCounter}`)
})

describe('recordAnswer', () => {
  it('persists progress, telemetry, day counter and θ in one write', async () => {
    const item = mkItem('x1', 'ai_act.gpai')
    await recordAnswer({ item, correct: true, rating: 'good', ms: 4200 }, NOW, db)

    const progress = await loadProgress(db)
    expect(progress.has('x1')).toBe(true)
    expect(new Date(progress.get('x1')!.scheduler.due).getTime()).toBeGreaterThan(NOW.getTime())
    expect(progress.get('x1')!.b).toBeLessThan(item.difficulty_b)

    expect(await getAnsweredCount(db)).toBe(1)
    expect(await getTheta(db)).toBeGreaterThan(0)

    const { todayAnswered } = await streakInfo(NOW, db)
    expect(todayAnswered).toBe(1)
  })

  it('state persists across a "reload" (fresh Dexie handle, same database)', async () => {
    const item = mkItem('x2', 'ml.llms')
    await recordAnswer({ item, correct: false, rating: 'again', ms: 900 }, NOW, db)
    db.close()

    const reopened = new TrainerDB(`test-${dbCounter}`)
    const progress = await loadProgress(reopened)
    expect(progress.has('x2')).toBe(true)
    expect(await getAnsweredCount(reopened)).toBe(1)
  })
})

describe('derived stats', () => {
  it('weakTags ranks low-accuracy domains first (min answers threshold)', async () => {
    const weak = mkItem('w', 'gdpr.intersection')
    const strong = mkItem('s', 'ml.foundations')
    for (let i = 0; i < 3; i++) {
      await recordAnswer({ item: weak, correct: false, rating: 'again', ms: 1000 }, NOW, db)
      await recordAnswer({ item: strong, correct: true, rating: 'good', ms: 1000 }, NOW, db)
    }
    const tags = await weakTags(3, db)
    expect(tags[0].domain).toBe('gdpr.intersection')
    expect(tags[0].accuracy).toBe(0)
    expect(tags.find((t) => t.domain === 'ml.foundations')!.accuracy).toBe(1)
  })

  it('domainStats reports seen/total and accuracy per domain', async () => {
    const a = mkItem('a', 'ai_act.risk_tiers')
    const b = mkItem('b', 'ai_act.risk_tiers')
    await recordAnswer({ item: a, correct: true, rating: 'good', ms: 1000 }, NOW, db)
    const stats = await domainStats([a, b], NOW, db)
    const row = stats.find((s) => s.domain === 'ai_act.risk_tiers')!
    expect(row.seen).toBe(1)
    expect(row.total).toBe(2)
    expect(row.accuracy).toBe(1)
    expect(row.avgRecall).toBeGreaterThan(0)
  })

  it('streak counts consecutive practice days and survives a not-yet-practiced today', async () => {
    const item = mkItem('st', 'ml.mlops')
    await recordAnswer({ item, correct: true, rating: 'good', ms: 1 }, new Date('2026-07-16T09:00:00Z'), db)
    await recordAnswer({ item, correct: true, rating: 'good', ms: 1 }, new Date('2026-07-17T09:00:00Z'), db)
    // Today (18th) not practiced yet → streak still 2, not 0.
    const info = await streakInfo(new Date('2026-07-18T08:00:00Z'), db)
    expect(info.streak).toBe(2)
    expect(info.todayAnswered).toBe(0)
  })

  it('exportTelemetry bundles weak tags and raw reviews', async () => {
    const item = mkItem('t', 'data_act.core')
    for (let i = 0; i < 3; i++)
      await recordAnswer({ item, correct: false, rating: 'again', ms: 500 }, NOW, db)
    const dump = await exportTelemetry(db)
    expect(dump.reviews).toHaveLength(3)
    expect(dump.weakTags[0].domain).toBe('data_act.core')
  })
})

describe('localDate', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(localDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
