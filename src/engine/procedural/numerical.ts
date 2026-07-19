// Procedural numerical reasoning (PRD §6.2): templated data tables with
// computed questions — guaranteed-correct answers, no LLM, infinite supply.
// EPSO numerical = table/chart reading under time pressure; the distractors
// encode the classic traps (wrong base year, wrong row, share vs change).

import type { Item, ItemOption, OptionKey } from '@/content/types'
import { mulberry32, pick, randInt, shuffle, type Rng } from '../rng'

const ENTITIES = [
  ['Czechia', 'Slovakia', 'Austria', 'Poland'],
  ['DG CNECT', 'DG GROW', 'DG EMPL', 'DG AGRI'],
  ['Programme Alpha', 'Programme Beta', 'Programme Gamma', 'Programme Delta'],
  ['Unit A.1', 'Unit B.2', 'Unit C.3', 'Unit D.4'],
] as const

const MEASURES = [
  { noun: 'budget', unit: 'EUR million' },
  { noun: 'staff headcount', unit: 'FTE' },
  { noun: 'grant applications', unit: 'applications' },
  { noun: 'IT spending', unit: 'EUR thousand' },
] as const

interface Table {
  rows: string[]
  y1: number
  y2: number
  v1: number[]
  v2: number[]
  measure: (typeof MEASURES)[number]
}

function makeTable(rng: Rng): Table {
  const rows = [...pick(rng, ENTITIES)]
  const y1 = randInt(rng, 2019, 2023)
  const measure = pick(rng, MEASURES)
  const v1 = rows.map(() => randInt(rng, 120, 980))
  // Percentage changes in ±4..40%, nonzero, distinct enough to rank unambiguously.
  const v2 = v1.map((v) => {
    const pct = randInt(rng, 4, 40) * (rng() < 0.35 ? -1 : 1)
    return Math.max(50, Math.round(v * (1 + pct / 100)))
  })
  return { rows, y1, y2: y1 + 1, v1, v2, measure }
}

function pctChange(a: number, b: number): number {
  return ((b - a) / a) * 100
}

function fmt(n: number): string {
  return n.toFixed(1).replace('-0.0', '0.0')
}

function renderTable(t: Table): string {
  const lines = t.rows.map((r, i) => `${r}: ${t.y1} → ${t.v1[i]}, ${t.y2} → ${t.v2[i]}`)
  return `${t.measure.noun[0].toUpperCase()}${t.measure.noun.slice(1)} (${t.measure.unit}):\n${lines.join('\n')}`
}

/** Build options from a correct value + trap values; dedupes and pads. */
function numericOptions(rng: Rng, correct: number, traps: number[]): { options: ItemOption[]; correctKey: OptionKey } {
  const seen = new Set([fmt(correct)])
  const values: number[] = []
  for (const t of traps) {
    if (values.length >= 3) break
    if (!seen.has(fmt(t)) && Number.isFinite(t)) {
      seen.add(fmt(t))
      values.push(t)
    }
  }
  // Pad with offsets if traps collided.
  let bump = 1
  while (values.length < 3) {
    const cand = correct + bump * (correct >= 0 ? 2.5 : -2.5)
    if (!seen.has(fmt(cand))) {
      seen.add(fmt(cand))
      values.push(cand)
    }
    bump++
  }
  const all = shuffle(rng, [correct, ...values])
  const keys: OptionKey[] = ['A', 'B', 'C', 'D']
  return {
    options: all.map((v, i) => ({ key: keys[i], text: `${fmt(v)}%` })),
    correctKey: keys[all.indexOf(correct)],
  }
}

/** Deterministic from seed: same seed → identical item. */
export function generateNumericalItem(seed: number): Item {
  const rng = mulberry32(seed)
  const t = makeTable(rng)
  const kind = randInt(rng, 0, 2)
  const i = randInt(rng, 0, t.rows.length - 1)
  const row = t.rows[i]

  let stem: string
  let correct: number
  let traps: number[]
  let rationale: string

  if (kind === 0) {
    // % change for one row, y1 → y2.
    correct = pctChange(t.v1[i], t.v2[i])
    traps = [
      pctChange(t.v2[i], t.v1[i]), // wrong base year
      ((t.v2[i] - t.v1[i]) / t.v2[i]) * 100, // change over new value
      correct * 2, // doubled slip
    ]
    stem = `${renderTable(t)}\n\nWhat was the percentage change in ${row}'s ${t.measure.noun} from ${t.y1} to ${t.y2}?`
    rationale = `Change = (${t.v2[i]} − ${t.v1[i]}) / ${t.v1[i]} × 100 = ${fmt(correct)}%. The base is always the EARLIER value (${t.v1[i]}); dividing by the later value or reversing the years gives the trap options.`
  } else if (kind === 1) {
    // Row's share of the y2 total.
    const total = t.v2.reduce((a, b) => a + b, 0)
    const total1 = t.v1.reduce((a, b) => a + b, 0)
    correct = (t.v2[i] / total) * 100
    traps = [
      (t.v1[i] / total1) * 100, // share in the wrong year
      (t.v2[i] / (total - t.v2[i])) * 100, // share of the OTHERS' total
      (t.v2[i] / total1) * 100, // mixed-year slip
    ]
    stem = `${renderTable(t)}\n\nIn ${t.y2}, what share of the total ${t.measure.noun} did ${row} represent?`
    rationale = `Total ${t.y2} = ${t.v2.join(' + ')} = ${total}. Share = ${t.v2[i]} / ${total} × 100 = ${fmt(correct)}%. Read the YEAR the question asks about — the ${t.y1} share is the standard trap.`
  } else {
    // Largest percentage increase across rows.
    const changes = t.rows.map((_, j) => pctChange(t.v1[j], t.v2[j]))
    const bestIdx = changes.indexOf(Math.max(...changes))
    const absIdx = t.rows
      .map((_, j) => t.v2[j] - t.v1[j])
      .reduce((best, v, j, arr) => (v > arr[best] ? j : best), 0)
    correct = changes[bestIdx]
    const bestRow = t.rows[bestIdx]
    stem = `${renderTable(t)}\n\nWhich statement is correct? The largest percentage increase from ${t.y1} to ${t.y2} was recorded by ${bestRow}, at:`
    traps = [changes[absIdx] === correct ? correct + 3.7 : changes[absIdx], pctChange(t.v2[bestIdx], t.v1[bestIdx]), correct / 2]
    rationale = `Percentage change per row: ${t.rows.map((r, j) => `${r} ${fmt(changes[j])}%`).join(', ')}. ${bestRow} leads at ${fmt(correct)}%. Note: the largest ABSOLUTE increase (${t.rows[absIdx]}) is not necessarily the largest percentage increase — that is the intended trap.`
  }

  const { options, correctKey } = numericOptions(rng, correct, traps)
  return {
    id: `pn_${seed}`,
    type: 'reasoning_numerical',
    domain: 'reasoning.numerical',
    competency: ['analysis_problem_solving'],
    difficulty_b: kind === 2 ? 0.5 : 0.2,
    stem,
    options,
    correct: correctKey,
    rationale,
    provenance: { generator: 'procedural', run: 'runtime', reviewed: true },
    version: 1,
  }
}
