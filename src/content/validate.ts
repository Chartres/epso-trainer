// Bank validation (PRD §6.1 step 4): schema check, exactly-one-correct check,
// distractor sanity, near-duplicate detection. Pure functions — the same code
// runs in tests and in tools/validate.mjs at authoring time.

import { ITEM_TYPES, OPTION_KEYS, type Item } from './types'

export interface ValidationError {
  id: string
  problem: string
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Structural + semantic checks for one item. Returns [] when valid. */
export function validateItem(raw: unknown): ValidationError[] {
  if (!isRecord(raw)) return [{ id: '?', problem: 'item is not an object' }]
  const id = typeof raw.id === 'string' && raw.id ? raw.id : '?'
  const errs: ValidationError[] = []
  const push = (problem: string) => errs.push({ id, problem })

  if (id === '?') push('missing id')
  if (!ITEM_TYPES.includes(raw.type as never)) push(`unknown type: ${String(raw.type)}`)
  if (typeof raw.domain !== 'string' || !raw.domain) push('missing domain')
  if (!Array.isArray(raw.competency) || raw.competency.length === 0) push('missing competency tags')
  if (typeof raw.difficulty_b !== 'number' || Number.isNaN(raw.difficulty_b))
    push('difficulty_b must be a number')
  if (typeof raw.stem !== 'string' || raw.stem.trim().length < 10) push('stem missing or too short')
  if (typeof raw.rationale !== 'string' || raw.rationale.trim().length < 10)
    push('rationale missing or too short (control of error requires a worked rationale)')

  const options = raw.options
  if (!Array.isArray(options) || options.length < 2) {
    push('needs at least 2 options')
  } else {
    const keys = options.map((o) => (isRecord(o) ? o.key : undefined))
    if (keys.some((k) => !OPTION_KEYS.includes(k as never))) push('option keys must be A–D')
    if (new Set(keys).size !== keys.length) push('duplicate option keys')
    const texts = options.map((o) => (isRecord(o) && typeof o.text === 'string' ? o.text.trim() : ''))
    if (texts.some((t) => !t)) push('empty option text')
    // Exact-text dedupe: normalize() would strip symbols/signs and falsely
    // collide "-8.3%" with "8.3%" or the abstract items' shape strings.
    if (new Set(texts).size !== texts.length) push('duplicate option texts')
    // Exactly-one-correct: the correct key must exist among the options, once.
    if (keys.filter((k) => k === raw.correct).length !== 1)
      push(`correct key ${String(raw.correct)} does not match exactly one option`)
  }

  const prov = raw.provenance
  if (!isRecord(prov) || typeof prov.reviewed !== 'boolean' || typeof prov.generator !== 'string')
    push('missing provenance {generator, run, reviewed}')

  if (raw.type === 'field_mcq' && !isRecord(raw.source))
    push('field_mcq items must cite a source (RAG grounding contract)')

  return errs
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Token-set Jaccard similarity of normalized stems — cheap near-duplicate signal. */
export function stemSimilarity(a: string, b: string): number {
  const ta = new Set(normalize(a).split(' '))
  const tb = new Set(normalize(b).split(' '))
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return inter / (ta.size + tb.size - inter)
}

/** Cross-item checks: unique ids, near-duplicate stems within the same domain. */
export function validateBank(items: Item[], dupThreshold = 0.85): ValidationError[] {
  const errs: ValidationError[] = []
  const seen = new Map<string, number>()
  items.forEach((it, i) => {
    if (seen.has(it.id)) errs.push({ id: it.id, problem: 'duplicate id' })
    seen.set(it.id, i)
  })
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i].domain !== items[j].domain) continue
      if (stemSimilarity(items[i].stem, items[j].stem) >= dupThreshold)
        errs.push({ id: items[j].id, problem: `near-duplicate of ${items[i].id}` })
    }
  }
  return errs
}
