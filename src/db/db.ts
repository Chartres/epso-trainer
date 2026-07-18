// Dexie schema (PRD §9): all state is local-first IndexedDB. Three tables:
// progress (per-item FSRS + Elo state), reviews (append-only telemetry — the
// flywheel's raw material), days (daily counts for goal + streak).

import Dexie, { type EntityTable } from 'dexie'
import type { SchedulerState } from '@/engine/fsrs'

export interface ProgressRow {
  itemId: string
  scheduler: SchedulerState
  b: number
  answers: number
  correctCount: number
}

export interface ReviewRow {
  id?: number
  itemId: string
  type: string
  domain: string
  correct: 0 | 1
  rating: string
  /** Time to answer, ms. */
  ms: number
  /** ISO timestamp. */
  at: string
  theta: number
}

export interface DayRow {
  /** Local date, YYYY-MM-DD. */
  date: string
  answered: number
}

export interface KvRow {
  key: string
  value: unknown
}

/** Pavol's spot-check verdict on a generated item (PRD §6.1 step 5). */
export interface ReviewFlagRow {
  itemId: string
  verdict: 'approved' | 'rejected'
  at: string
}

export class TrainerDB extends Dexie {
  progress!: EntityTable<ProgressRow, 'itemId'>
  reviews!: EntityTable<ReviewRow, 'id'>
  days!: EntityTable<DayRow, 'date'>
  kv!: EntityTable<KvRow, 'key'>
  reviewFlags!: EntityTable<ReviewFlagRow, 'itemId'>

  constructor(name = 'epso-trainer') {
    super(name)
    this.version(1).stores({
      progress: 'itemId',
      reviews: '++id, itemId, domain, at',
      days: 'date',
      kv: 'key',
    })
    this.version(2).stores({
      reviewFlags: 'itemId',
    })
  }
}

export const db = new TrainerDB()
