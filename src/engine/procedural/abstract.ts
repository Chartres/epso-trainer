// Procedural abstract reasoning (PRD §6.2): rule-based symbol sequences with a
// computed next term. Text-rendered shapes keep it dependency-free and offline;
// the skill trained is rule extraction (progression, cycling, interleaving).

import type { Item, ItemOption, OptionKey } from '@/content/types'
import { mulberry32, pick, randInt, shuffle, type Rng } from '../rng'

const SYMBOLS = ['▲', '●', '■', '★', '◆'] as const
type Sym = (typeof SYMBOLS)[number]

interface Rule {
  name: string
  terms: string[] // 4 shown + the 5th correct term at index 4
  explain: string
}

function cell(sym: Sym, count: number): string {
  return sym.repeat(count)
}

/** Rule 1: fixed symbol, count arithmetic progression (+k). */
function ruleCountProgression(rng: Rng): Rule {
  const sym = pick(rng, SYMBOLS)
  const start = randInt(rng, 1, 3)
  const k = randInt(rng, 1, 2)
  const terms = [0, 1, 2, 3, 4].map((i) => cell(sym, start + i * k))
  return {
    name: 'count-progression',
    terms,
    explain: `The symbol stays ${sym}; the count increases by ${k} each step (${start}, ${start + k}, ${start + 2 * k}, …), so the next term has ${start + 4 * k} symbols.`,
  }
}

/** Rule 2: symbol cycles through a fixed set, count constant. */
function ruleSymbolCycle(rng: Rng): Rule {
  const cycle = shuffle(rng, SYMBOLS).slice(0, 3) as Sym[]
  const count = randInt(rng, 2, 4)
  const terms = [0, 1, 2, 3, 4].map((i) => cell(cycle[i % 3], count))
  return {
    name: 'symbol-cycle',
    terms,
    explain: `The count stays at ${count}; the symbol cycles ${cycle.join(' → ')} and repeats, so position 5 shows ${cycle[4 % 3]}.`,
  }
}

/** Rule 3: interleaved — symbol cycles AND count cycles independently. */
function ruleInterleaved(rng: Rng): Rule {
  const cycle = shuffle(rng, SYMBOLS).slice(0, 2) as Sym[]
  const counts = [randInt(rng, 1, 2), randInt(rng, 3, 4), randInt(rng, 5, 5)]
  const terms = [0, 1, 2, 3, 4].map((i) => cell(cycle[i % 2], counts[i % 3]))
  return {
    name: 'interleaved',
    terms,
    explain: `Two independent cycles: the symbol alternates ${cycle.join(' / ')} (period 2) while the count cycles ${counts.join(', ')} (period 3). Position 5 → symbol ${cycle[4 % 2]}, count ${counts[4 % 3]}.`,
  }
}

const RULES = [ruleCountProgression, ruleSymbolCycle, ruleInterleaved]

function distractors(rng: Rng, correct: string): string[] {
  const out = new Set<string>()
  const sym = correct[0] as Sym
  const n = correct.length
  const otherSym = pick(
    rng,
    SYMBOLS.filter((s) => s !== sym),
  )
  out.add(cell(sym, Math.max(1, n - 1))) // right symbol, off-by-one count
  out.add(cell(otherSym, n)) // wrong symbol, right count
  out.add(cell(otherSym, n + 1)) // both wrong
  out.delete(correct)
  // Extremely unlikely to need padding, but stay total.
  let extra = 2
  while (out.size < 3) out.add(cell(sym, n + extra++))
  return [...out].slice(0, 3)
}

/** Deterministic from seed: same seed → identical item. */
export function generateAbstractItem(seed: number): Item {
  const rng = mulberry32(seed)
  const rule = pick(rng, RULES)(rng)
  const correct = rule.terms[4]
  const opts = shuffle(rng, [correct, ...distractors(rng, correct)])
  const keys: OptionKey[] = ['A', 'B', 'C', 'D']
  const options: ItemOption[] = opts.map((t, i) => ({ key: keys[i], text: t }))
  return {
    id: `pa_${seed}`,
    type: 'reasoning_abstract',
    domain: 'reasoning.abstract',
    competency: ['analysis_problem_solving'],
    difficulty_b: rule.name === 'interleaved' ? 0.6 : 0.1,
    stem: `Which figure continues the series?\n\n${rule.terms.slice(0, 4).join('   ')}   ?`,
    options,
    correct: keys[opts.indexOf(correct)],
    rationale: rule.explain,
    provenance: { generator: 'procedural', run: 'runtime', reviewed: true },
    version: 1,
  }
}
