// Session generator (PRD §7): FSRS decides WHEN (due items first, weakest
// recall first), the Elo layer decides WHAT (new items in the Goldilocks zone).
// Below WARMUP_ANSWERS total answers there is no reliable θ yet, so new items
// follow the default curriculum (easy → hard). Procedural reasoning items fill
// spare slots — the infinite, LLM-free part of the bank.

import type { Item, ItemType } from '@/content/types'
import { isDue, retrievability, type SchedulerState } from './fsrs'
import { goldilocksScore } from './elo'
import { generateNumericalItem } from './procedural/numerical'
import { generateAbstractItem } from './procedural/abstract'
import { mulberry32, randInt } from './rng'

export const WARMUP_ANSWERS = 100

export interface ItemProgress {
  scheduler: SchedulerState
  b: number
}

export interface SessionConfig {
  size: number
  now: Date
  theta: number
  /** Total answers ever given — gates the warmup curriculum. */
  answeredCount: number
  /** Focus filters (Focus mode); omit for a mixed Today session. */
  types?: ItemType[]
  domain?: string
  /** Seed for procedural fill so a session is reproducible. */
  seed?: number
  /** Mock mode: only reviewed items, no due/new logic — a flat exam draw. */
  examDraw?: boolean
  /** Local spot-check verdicts: approved ⇒ Mock-eligible, rejected ⇒ excluded everywhere. */
  reviewFlags?: Map<string, 'approved' | 'rejected'>
}

const PROCEDURAL_TYPES: ItemType[] = ['reasoning_numerical', 'reasoning_abstract']

function matches(item: Item, cfg: SessionConfig): boolean {
  if (cfg.types && !cfg.types.includes(item.type)) return false
  if (cfg.domain && item.domain !== cfg.domain && !item.domain.startsWith(cfg.domain + '.'))
    return false
  return true
}

function proceduralAllowed(cfg: SessionConfig): ItemType[] {
  const allowed = PROCEDURAL_TYPES.filter((t) => (cfg.types ? cfg.types.includes(t) : true))
  if (cfg.domain && !cfg.domain.startsWith('reasoning')) return []
  return allowed
}

function fillProcedural(slots: number, cfg: SessionConfig): Item[] {
  const kinds = proceduralAllowed(cfg)
  if (slots <= 0 || kinds.length === 0) return []
  const rng = mulberry32(cfg.seed ?? 1)
  const out: Item[] = []
  for (let i = 0; i < slots; i++) {
    const seed = randInt(rng, 1, 2 ** 31 - 1)
    const kind = kinds[i % kinds.length]
    out.push(kind === 'reasoning_numerical' ? generateNumericalItem(seed) : generateAbstractItem(seed))
  }
  return out
}

/**
 * Build a session from the static bank + per-item progress.
 * Order: due (weakest first) → new (curriculum or Goldilocks) → procedural fill.
 */
export function buildSession(
  bank: Item[],
  progress: Map<string, ItemProgress>,
  cfg: SessionConfig,
): Item[] {
  const flags = cfg.reviewFlags
  const pool = bank.filter(
    (i) => i.type !== 'eufte_scenario' && matches(i, cfg) && flags?.get(i.id) !== 'rejected',
  )

  if (cfg.examDraw) {
    const reviewed = pool.filter((i) => i.provenance.reviewed || flags?.get(i.id) === 'approved')
    const rng = mulberry32(cfg.seed ?? 1)
    // Seeded Fisher–Yates over the reviewed pool.
    const drawn = [...reviewed]
    for (let i = drawn.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[drawn[i], drawn[j]] = [drawn[j], drawn[i]]
    }
    const picked = drawn.slice(0, cfg.size)
    return [...picked, ...fillProcedural(cfg.size - picked.length, cfg)]
  }

  const due = pool
    .filter((i) => {
      const p = progress.get(i.id)
      return p && isDue(p.scheduler, cfg.now)
    })
    .sort((a, b) => {
      const ra = retrievability(progress.get(a.id)!.scheduler, cfg.now)
      const rb = retrievability(progress.get(b.id)!.scheduler, cfg.now)
      return ra - rb
    })
    .slice(0, cfg.size)

  const newSlots = cfg.size - due.length
  const fresh = pool.filter((i) => !progress.has(i.id))
  const ranked =
    cfg.answeredCount < WARMUP_ANSWERS
      ? [...fresh].sort((a, b) => a.difficulty_b - b.difficulty_b)
      : [...fresh].sort(
          (a, b) => goldilocksScore(cfg.theta, b.difficulty_b) - goldilocksScore(cfg.theta, a.difficulty_b),
        )
  const chosen = ranked.slice(0, Math.max(0, newSlots))

  const procedural = fillProcedural(cfg.size - due.length - chosen.length, cfg)
  return [...due, ...chosen, ...procedural]
}
