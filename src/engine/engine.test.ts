import { describe, expect, it } from 'vitest'
import { isDue, isMastered, newSchedulerState, rate, retrievability } from './fsrs'
import { eloUpdate, expectedCorrect, goldilocksScore, kForAnswerCount } from './elo'
import { generateNumericalItem } from './procedural/numerical'
import { generateAbstractItem } from './procedural/abstract'
import { buildSession, WARMUP_ANSWERS, type ItemProgress } from './session'
import { validateItem } from '@/content/validate'
import type { Item } from '@/content/types'

const NOW = new Date('2026-07-18T10:00:00Z')

describe('fsrs wrapper', () => {
  it('a new item is due immediately', () => {
    expect(isDue(newSchedulerState(NOW), NOW)).toBe(true)
  })

  it('rating Good pushes the due date into the future', () => {
    const s = rate(newSchedulerState(NOW), 'good', NOW)
    expect(new Date(s.due).getTime()).toBeGreaterThan(NOW.getTime())
  })

  it('Easy schedules further out than Again', () => {
    const easy = rate(newSchedulerState(NOW), 'easy', NOW)
    const again = rate(newSchedulerState(NOW), 'again', NOW)
    expect(new Date(easy.due).getTime()).toBeGreaterThan(new Date(again.due).getTime())
  })

  it('retrievability decays over time', () => {
    const s = rate(newSchedulerState(NOW), 'good', NOW)
    const soon = retrievability(s, new Date(NOW.getTime() + 864e5))
    const later = retrievability(s, new Date(NOW.getTime() + 30 * 864e5))
    expect(later).toBeLessThan(soon)
  })

  it('repeated Easy ratings eventually reach mastered', () => {
    let s = newSchedulerState(NOW)
    let t = NOW
    for (let i = 0; i < 6; i++) {
      s = rate(s, 'easy', t)
      t = new Date(new Date(s.due).getTime() + 1000)
    }
    expect(isMastered(s)).toBe(true)
  })
})

describe('elo layer', () => {
  it('expectedCorrect is 0.5 when ability equals difficulty', () => {
    expect(expectedCorrect(1, 1)).toBeCloseTo(0.5)
  })

  it('correct answers raise θ and lower item b; wrong answers do the reverse', () => {
    const up = eloUpdate(0, 0, true)
    expect(up.theta).toBeGreaterThan(0)
    expect(up.b).toBeLessThan(0)
    const down = eloUpdate(0, 0, false)
    expect(down.theta).toBeLessThan(0)
    expect(down.b).toBeGreaterThan(0)
  })

  it('k decays with experience', () => {
    expect(kForAnswerCount(10)).toBeGreaterThan(kForAnswerCount(500))
  })

  it('goldilocks prefers items near the target success rate', () => {
    // θ=0: an item at b≈-0.85 gives p≈0.7 (the target); b=3 is far too hard.
    expect(goldilocksScore(0, -0.85)).toBeGreaterThan(goldilocksScore(0, 3))
  })
})

describe('procedural generators', () => {
  it('numerical items are deterministic by seed and schema-valid', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const item = generateNumericalItem(seed)
      expect(validateItem(item), `seed ${seed}`).toEqual([])
      expect(item.options.map((o) => o.key)).toContain(item.correct)
    }
    expect(generateNumericalItem(42)).toEqual(generateNumericalItem(42))
  })

  it('numerical: the correct option is the mathematically computed value', () => {
    // Verify percent-change items against an independent recomputation.
    for (let seed = 1; seed <= 100; seed++) {
      const item = generateNumericalItem(seed)
      if (!item.stem.includes('percentage change in')) continue
      const rows = [...item.stem.matchAll(/^(.+): (\d{4}) → (\d+), (\d{4}) → (\d+)$/gm)]
      const asked = item.stem.match(/percentage change in (.+?)'s/)![1]
      const row = rows.find((r) => r[1] === asked)!
      const expected = ((Number(row[5]) - Number(row[3])) / Number(row[3])) * 100
      const correctText = item.options.find((o) => o.key === item.correct)!.text
      expect(correctText).toBe(`${expected.toFixed(1).replace('-0.0', '0.0')}%`)
    }
  })

  it('abstract items are deterministic by seed, schema-valid, with 4 distinct options', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const item = generateAbstractItem(seed)
      expect(validateItem(item), `seed ${seed}`).toEqual([])
      expect(new Set(item.options.map((o) => o.text)).size).toBe(4)
    }
    expect(generateAbstractItem(7)).toEqual(generateAbstractItem(7))
  })
})

function mkItem(id: string, b: number, domain = 'ai_act.risk_tiers'): Item {
  return {
    id,
    type: 'field_mcq',
    domain,
    competency: ['analysis_problem_solving'],
    difficulty_b: b,
    stem: `Question ${id} about something specific?`,
    options: [
      { key: 'A', text: 'x' },
      { key: 'B', text: 'y' },
      { key: 'C', text: 'z' },
      { key: 'D', text: 'w' },
    ],
    correct: 'A',
    rationale: 'Because A is the right answer here.',
    source: { title: 'src' },
    provenance: { generator: 'hand', run: 'test', reviewed: true },
    version: 1,
  }
}

describe('session generator', () => {
  const bank = [mkItem('i1', -1), mkItem('i2', 0), mkItem('i3', 1), mkItem('i4', 2)]

  it('serves due items before new ones, weakest recall first', () => {
    const overdue = rate(newSchedulerState(new Date('2026-06-01T10:00:00Z')), 'good', new Date('2026-06-01T10:00:00Z'))
    const recent = rate(newSchedulerState(new Date('2026-07-17T10:00:00Z')), 'good', new Date('2026-07-17T10:00:00Z'))
    const progress = new Map<string, ItemProgress>([
      ['i3', { scheduler: recent, b: 1 }],
      ['i4', { scheduler: overdue, b: 2 }],
    ])
    const session = buildSession(bank, progress, {
      size: 4,
      now: new Date('2026-07-18T10:00:00Z'),
      theta: 0,
      answeredCount: 0,
    })
    // i4 (older review → lower recall) before i3; then new items.
    expect(session[0].id).toBe('i4')
    expect(session[1].id).toBe('i3')
    expect(session.slice(2).every((i) => ['i1', 'i2'].includes(i.id))).toBe(true)
  })

  it('warmup curriculum serves new items easy → hard', () => {
    const session = buildSession(bank, new Map(), { size: 4, now: NOW, theta: 0, answeredCount: 0 })
    expect(session.map((i) => i.id)).toEqual(['i1', 'i2', 'i3', 'i4'])
  })

  it('after warmup, new items are picked by Goldilocks fit to θ', () => {
    const session = buildSession(bank, new Map(), {
      size: 1,
      now: NOW,
      theta: 2,
      answeredCount: WARMUP_ANSWERS,
    })
    // θ=2: p(correct) for b=1 is ~0.73, closest to the 0.7 target.
    expect(session[0].id).toBe('i3')
  })

  it('fills spare slots with procedural reasoning items', () => {
    const session = buildSession(bank, new Map(), {
      size: 8,
      now: NOW,
      theta: 0,
      answeredCount: 0,
      seed: 5,
    })
    expect(session).toHaveLength(8)
    const procedural = session.filter((i) => i.id.startsWith('pn_') || i.id.startsWith('pa_'))
    expect(procedural).toHaveLength(4)
  })

  it('focus filter by domain restricts the pool', () => {
    const session = buildSession(bank, new Map(), {
      size: 10,
      now: NOW,
      theta: 0,
      answeredCount: 0,
      domain: 'ai_act',
    })
    expect(session.every((i) => i.domain.startsWith('ai_act'))).toBe(true)
  })

  it('exam draw only serves reviewed items', () => {
    const unreviewed = mkItem('u1', 0)
    unreviewed.provenance = { ...unreviewed.provenance, reviewed: false }
    const session = buildSession([...bank, unreviewed], new Map(), {
      size: 5,
      now: NOW,
      theta: 0,
      answeredCount: 0,
      examDraw: true,
      seed: 3,
    })
    expect(session.some((i) => i.id === 'u1')).toBe(false)
  })
})
