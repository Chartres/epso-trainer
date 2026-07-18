import { describe, expect, it } from 'vitest'
import { loadBank } from './bank'
import { stemSimilarity, validateBank, validateItem } from './validate'
import type { Item } from './types'

const valid: Item = {
  id: 'test_0001',
  type: 'field_mcq',
  domain: 'ai_act.risk_tiers',
  competency: ['analysis_problem_solving'],
  difficulty_b: 0.5,
  stem: 'Which approach does the AI Act take to regulate systems?',
  options: [
    { key: 'A', text: 'Risk-based' },
    { key: 'B', text: 'Sector-based' },
    { key: 'C', text: 'Licence-based' },
    { key: 'D', text: 'Voluntary' },
  ],
  correct: 'A',
  rationale: 'The AI Act scales obligations with risk level.',
  source: { title: 'Reg. 2024/1689' },
  provenance: { generator: 'hand', run: '2026-07-18', reviewed: true },
  version: 1,
}

describe('validateItem', () => {
  it('accepts a well-formed item', () => {
    expect(validateItem(valid)).toEqual([])
  })

  it('rejects a correct key that matches no option', () => {
    const errs = validateItem({ ...valid, correct: 'E' })
    expect(errs.some((e) => e.problem.includes('exactly one option'))).toBe(true)
  })

  it('rejects duplicate option texts', () => {
    const errs = validateItem({
      ...valid,
      options: valid.options.map((o) => ({ ...o, text: 'Same' })),
    })
    expect(errs.some((e) => e.problem.includes('duplicate option texts'))).toBe(true)
  })

  it('requires a rationale (control of error)', () => {
    const errs = validateItem({ ...valid, rationale: '' })
    expect(errs.some((e) => e.problem.includes('rationale'))).toBe(true)
  })

  it('requires a source citation on field_mcq items', () => {
    const errs = validateItem({ ...valid, source: undefined })
    expect(errs.some((e) => e.problem.includes('source'))).toBe(true)
  })
})

describe('validateBank', () => {
  it('flags duplicate ids', () => {
    const errs = validateBank([valid, { ...valid }])
    expect(errs.some((e) => e.problem === 'duplicate id')).toBe(true)
  })

  it('flags near-duplicate stems in the same domain', () => {
    const clone = { ...valid, id: 'test_0002', stem: valid.stem + ' exactly' }
    expect(validateBank([valid, clone]).some((e) => e.problem.includes('near-duplicate'))).toBe(true)
  })

  it('similarity is low for unrelated stems', () => {
    expect(stemSimilarity(valid.stem, 'Completely different question about GDPR fines')).toBeLessThan(0.3)
  })
})

describe('shipped seed bank', () => {
  it('every item passes validation and the bank has no duplicates', () => {
    const items = loadBank()
    expect(items.length).toBeGreaterThanOrEqual(20)
    for (const item of items) expect(validateItem(item)).toEqual([])
    expect(validateBank(items)).toEqual([])
  })
})
