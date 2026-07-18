import { beforeEach, describe, expect, it } from 'vitest'
import { TrainerDB } from './db'
import { exportTelemetry, loadReviewFlags, setReviewFlag } from './store'
import { buildSession } from '@/engine/session'
import type { Item } from '@/content/types'

const NOW = new Date('2026-07-18T10:00:00Z')

function mkItem(id: string, reviewed: boolean): Item {
  return {
    id,
    type: 'field_mcq',
    domain: 'ai_act.gpai',
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
    provenance: { generator: 'claude-code', run: 'g1', reviewed },
    version: 1,
  }
}

let db: TrainerDB
let n = 0
beforeEach(() => {
  db = new TrainerDB(`flags-${++n}`)
})

describe('review flags', () => {
  it('set, toggle off, and export verdicts', async () => {
    await setReviewFlag('x1', 'approved', NOW, db)
    await setReviewFlag('x2', 'rejected', NOW, db)
    expect(await loadReviewFlags(db)).toEqual(
      new Map([
        ['x1', 'approved'],
        ['x2', 'rejected'],
      ]),
    )
    await setReviewFlag('x1', null, NOW, db)
    expect((await loadReviewFlags(db)).has('x1')).toBe(false)
    const dump = await exportTelemetry(db)
    expect(dump.reviewFlags).toEqual([{ itemId: 'x2', verdict: 'rejected', at: NOW.toISOString() }])
  })

  it('approved unreviewed items become exam-draw eligible; rejected leave all pools', () => {
    const bank = [mkItem('u1', false), mkItem('u2', false), mkItem('r1', true)]
    const flags = new Map<string, 'approved' | 'rejected'>([
      ['u1', 'approved'],
      ['r1', 'rejected'],
    ])
    const mock = buildSession(bank, new Map(), {
      size: 10,
      now: NOW,
      theta: 0,
      answeredCount: 0,
      examDraw: true,
      seed: 2,
      reviewFlags: flags,
      types: ['field_mcq'],
    })
    expect(mock.map((i) => i.id)).toEqual(['u1'])

    const practice = buildSession(bank, new Map(), {
      size: 10,
      now: NOW,
      theta: 0,
      answeredCount: 0,
      reviewFlags: flags,
      types: ['field_mcq'],
    })
    expect(practice.some((i) => i.id === 'r1')).toBe(false)
    expect(practice.some((i) => i.id === 'u2')).toBe(true)
  })
})
