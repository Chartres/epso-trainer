// FSRS wrapper (PRD §7.1) — answers "WHEN do I see this item again?".
// Thin layer over ts-fsrs so the rest of the app deals in plain serializable
// state (Dexie rows) and a 4-button rating, never in library types.

import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs'

export type SelfRating = 'again' | 'hard' | 'good' | 'easy'

/** Serializable FSRS state stored per item in Dexie (dates as ISO strings). */
export interface SchedulerState {
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review?: string
}

const RATING: Record<SelfRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

function scheduler(requestRetention: number) {
  return fsrs(generatorParameters({ request_retention: requestRetention, enable_fuzz: false }))
}

function toCard(s: SchedulerState): Card {
  return {
    ...s,
    due: new Date(s.due),
    last_review: s.last_review ? new Date(s.last_review) : undefined,
  } as Card
}

function fromCard(c: Card): SchedulerState {
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? new Date(c.last_review).toISOString() : undefined,
  }
}

export function newSchedulerState(now: Date): SchedulerState {
  return fromCard(createEmptyCard(now))
}

/** Apply a self-rating; returns the next state (input is not mutated). */
export function rate(
  s: SchedulerState,
  rating: SelfRating,
  now: Date,
  requestRetention = 0.9,
): SchedulerState {
  const rec = scheduler(requestRetention).next(toCard(s), now, RATING[rating])
  return fromCard(rec.card)
}

export function isDue(s: SchedulerState, now: Date): boolean {
  return new Date(s.due).getTime() <= now.getTime()
}

/** Predicted recall probability right now (0..1). */
export function retrievability(s: SchedulerState, now: Date): number {
  return scheduler(0.9).get_retrievability(toCard(s), now, false)
}

/** An item counts as "mastered" once it's in Review state with solid stability. */
export function isMastered(s: SchedulerState, minStabilityDays = 21): boolean {
  return s.state === State.Review && s.stability >= minStabilityDays
}
