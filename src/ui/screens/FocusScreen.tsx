// Focus (PRD §8): isolation of difficulty — drill a single domain or reasoning
// type. Free navigation, no locks; the learner chooses the path.

import type { ItemType } from '@/content/types'
import { DOMAIN_LABELS } from '@/content/types'
import { loadBank } from '@/content/bank'

export interface FocusPick {
  label: string
  domain?: string
  types?: ItemType[]
}

interface Props {
  onPick: (pick: FocusPick) => void
}

const REASONING: FocusPick[] = [
  { label: 'Verbal reasoning', types: ['reasoning_verbal'] },
  { label: 'Numerical reasoning', types: ['reasoning_numerical'] },
  { label: 'Abstract reasoning', types: ['reasoning_abstract'] },
]

export function FocusScreen({ onPick }: Props) {
  const domains = [...new Set(loadBank().map((i) => i.domain))]
    .filter((d) => !d.startsWith('reasoning'))
    .sort()

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-paper">Focus</h1>
      <p className="mt-1 text-paper/70">One thing at a time. Pick a domain to drill in isolation.</p>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-paper/60">Reasoning gate</h2>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {REASONING.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => onPick(r)}
            className="rounded-xl bg-white px-4 py-3 text-left font-medium shadow-sm min-h-[44px]"
          >
            {r.label}
          </button>
        ))}
      </div>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-paper/60">Field domains</h2>
      <div className="mt-2 grid grid-cols-1 gap-2 pb-6 sm:grid-cols-2">
        {domains.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onPick({ label: DOMAIN_LABELS[d] ?? d, domain: d })}
            className="rounded-xl bg-white px-4 py-3 text-left font-medium shadow-sm min-h-[44px]"
          >
            {DOMAIN_LABELS[d] ?? d}
          </button>
        ))}
      </div>
    </div>
  )
}
