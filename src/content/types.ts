// Item schema (PRD §5). Content is data: one schema serves reasoning and field
// questions; the bank ships as static versioned JSON in /content/bank.

export type ItemType =
  | 'reasoning_verbal'
  | 'reasoning_numerical'
  | 'reasoning_abstract'
  | 'field_mcq'
  | 'eufte_scenario'

export type OptionKey = 'A' | 'B' | 'C' | 'D'

export type Competency =
  | 'analysis_problem_solving'
  | 'quality_under_constraints'
  | 'written_communication'
  | 'digital_field_knowledge'

export interface ItemOption {
  key: OptionKey
  text: string
}

export interface ItemSource {
  title: string
  url?: string
}

export interface ItemProvenance {
  generator: 'hand' | 'claude-code' | 'local-model' | 'procedural'
  run: string
  reviewed: boolean
}

export interface Item {
  id: string
  type: ItemType
  /** Dot-path domain tag, e.g. "ai_act.prohibited_practices". */
  domain: string
  competency: Competency[]
  /** Latent difficulty on an Elo-ish scale, seeded by the author then updated (§7). */
  difficulty_b: number
  stem: string
  options: ItemOption[]
  correct: OptionKey
  rationale: string
  source?: ItemSource
  provenance: ItemProvenance
  version: number
}

/** A versioned bank file as committed under /content/bank. */
export interface BankPack {
  pack: string
  version: number
  items: Item[]
}

export const ITEM_TYPES: ItemType[] = [
  'reasoning_verbal',
  'reasoning_numerical',
  'reasoning_abstract',
  'field_mcq',
  'eufte_scenario',
]

export const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D']

/** Seed FRMCQ domain taxonomy (PRD §5); replaced by Annex II when the NoC lands. */
export const DOMAIN_LABELS: Record<string, string> = {
  'ai_act.risk_tiers': 'AI Act — risk tiers',
  'ai_act.prohibited_practices': 'AI Act — prohibited practices',
  'ai_act.high_risk': 'AI Act — high-risk obligations',
  'ai_act.gpai': 'AI Act — GPAI rules',
  'ai_act.governance': 'AI Act — governance & AI Office',
  'gdpr.intersection': 'GDPR × AI',
  'data_act.core': 'Data Act',
  'dga.core': 'Data Governance Act',
  'open_data.core': 'Open Data Directive',
  'ml.foundations': 'ML/DL foundations',
  'ml.llms': 'LLMs & GenAI',
  'ml.mlops': 'MLOps',
  'ml.evaluation': 'Evaluation & validation',
  'ml.data_engineering': 'Data engineering',
  'ml.risk_robustness': 'Model risk & robustness',
  'ml.security': 'Security of AI systems',
  'eu_ai.public_sector': 'Public-sector AI use',
  'eu_ai.ethics': 'Ethics & HLEG guidelines',
  'eu.institutions': 'EU institutions & procedures',
  'reasoning.verbal': 'Verbal reasoning',
  'reasoning.numerical': 'Numerical reasoning',
  'reasoning.abstract': 'Abstract reasoning',
}

export function domainLabel(domain: string): string {
  return DOMAIN_LABELS[domain] ?? domain
}

/** Top-level domain group, e.g. "ai_act.gpai" → "ai_act". */
export function domainGroup(domain: string): string {
  return domain.split('.')[0]
}
