// The selection journey for EPSO/AD/430/26 (AD 8, Artificial Intelligence).
// Structure inferred from the sibling competitions EPSO/AD/429/26 and /426/25 —
// the Notice of Competition + Annex II (expected ~Sept 2026) is the binding
// spec; thresholds here are provisional and marked as such in the UI.
//
// The point (P2, committee empathy): each stage plays a different role in the
// funnel, so practice strategy differs per stage. GATE = clear the bar and stop
// investing. RANKING = the competition is decided here — spend most time here.

import type { ItemType } from './types'

export type StageKind = 'eligibility' | 'gate' | 'ranking' | 'written'

export interface JourneyStage {
  id: string
  name: string
  kind: StageKind
  /** Short badge text: what this stage does in the funnel. */
  role: string
  /** What actually happens / what is measured. */
  what: string
  /** How to practice for it, given its role. */
  strategy: string
  /** Item types that train this stage (empty = no drillable items). */
  itemTypes: ItemType[]
  /** Provisional pass/target note shown next to readiness. */
  targetNote?: string
  /** Readiness target as accuracy (0..1) used for the bar; provisional. */
  targetAccuracy?: number
}

export const JOURNEY: JourneyStage[] = [
  {
    id: 'eligibility',
    name: 'Eligibility & application',
    kind: 'eligibility',
    role: 'Not a test — a filter',
    what: 'EU citizenship, EN + a second EU language, a degree plus the required years of AI-relevant experience, and the application form itself. Checked once, on paper.',
    strategy:
      'One careful afternoon when the Notice of Competition opens (~8 Sept 2026). Map your experience to the exact wording of the field description; applications fail on sloppy forms, not weak CVs.',
    itemTypes: [],
  },
  {
    id: 'reasoning',
    name: 'Reasoning tests',
    kind: 'gate',
    role: 'Pass/fail gate — does NOT count for ranking',
    what: 'Verbal, numerical and abstract MCQ under time pressure. You only need the pass marks (sibling competitions: verbal 10/20; numerical + abstract combined 10/20).',
    strategy:
      'Clear the bar with margin, then STOP investing. Time-per-item matters more than perfection — drill until mocks sit comfortably above threshold, then maintain with a few items a day.',
    itemTypes: ['reasoning_verbal', 'reasoning_numerical', 'reasoning_abstract'],
    targetNote: 'target: comfortably above the ~50% pass mark (provisional)',
    targetAccuracy: 0.7,
  },
  {
    id: 'frmcq',
    name: 'Field-related MCQ',
    kind: 'ranking',
    role: 'Pass mark AND primary ranking — the competition is decided here',
    what: 'AI-specific MCQ: the EU regulatory frame (AI Act, GDPR, Data Act, DGA) plus AI technical knowledge. Both a gate and the score that ranks you against every other candidate.',
    strategy:
      'This is where your minutes go. Only the top ~1.5× the reserve-list size advance, so the target is not the pass mark — it is outscoring the field. Drill weak tags first; the regulatory frame is the predictable edge over technical profiles.',
    itemTypes: ['field_mcq'],
    targetNote: 'target: top ~1.5× cutoff mindset — aim ≥80% at exam pace (provisional)',
    targetAccuracy: 0.8,
  },
  {
    id: 'eufte',
    name: 'Written field test (EUFTE)',
    kind: 'written',
    role: 'Scored — only the top ~1.5× reach it',
    what: 'A written case in your second language: apply the AI field and its EU legal frame in a structured note (e.g. advising a DG whether a system is high-risk). Tests application + written communication.',
    strategy:
      'Rehearse structure, not trivia: issue → rule → application → recommendation, against a rubric. Practice mode ships in M4; until then, outline one scenario per week from the FRMCQ rationales you got wrong.',
    itemTypes: ['eufte_scenario'],
  },
  {
    id: 'reserve',
    name: 'Reserve list',
    kind: 'eligibility',
    role: 'The finish line',
    what: 'Ranked candidates enter the reserve list; EU institutions recruit from it. Ranking from the FRMCQ + EUFTE carries into who gets called first.',
    strategy: 'Nothing to drill — every point in the ranked stages buys position here.',
    itemTypes: [],
  },
]

export const STAGE_DISCLAIMER =
  'Structure inferred from sibling competitions (EPSO/AD/429/26, /426/25). The Notice of Competition + Annex II (~Sept 2026) is binding and will replace thresholds and the syllabus.'

/** The journey stage an item type trains (used to group Progress by stage). */
export function stageForType(type: ItemType): JourneyStage | undefined {
  return JOURNEY.find((s) => s.itemTypes.includes(type))
}
