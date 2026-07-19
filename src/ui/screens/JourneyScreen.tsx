// Journey (P2, committee empathy): the app organized around the actual
// selection funnel. Each stage shows its ROLE in the funnel — gate you merely
// pass, score that ranks you, written test only the top reach — with live
// readiness from your own telemetry and CTAs into stage-scoped practice.

import { useEffect, useState } from 'react'
import { JOURNEY, STAGE_DISCLAIMER, type JourneyStage } from '@/content/journey'
import { stageReadiness, type StageReadiness } from '@/db/store'

export interface StageAction {
  stage: JourneyStage
  mode: 'practice' | 'mock'
}

interface Props {
  onStart: (action: StageAction) => void
}

const KIND_BADGE: Record<JourneyStage['kind'], { label: string; cls: string }> = {
  eligibility: { label: 'No test', cls: 'bg-slate-200 text-ink' },
  gate: { label: 'Gate · pass/fail', cls: 'bg-navy-700 text-paper' },
  ranking: { label: 'Scored · ranks you', cls: 'bg-gold-500 text-navy-950' },
  written: { label: 'Scored · top ~1.5× only', cls: 'bg-navy-800 text-paper' },
}

export function JourneyScreen({ onStart }: Props) {
  const [readiness, setReadiness] = useState<Map<string, StageReadiness>>(new Map())

  useEffect(() => {
    void (async () => {
      const entries = await Promise.all(
        JOURNEY.map(async (s) => [s.id, await stageReadiness(s.itemTypes)] as const),
      )
      setReadiness(new Map(entries))
    })()
  }, [])

  return (
    <div className="mx-auto max-w-2xl pb-6">
      <h1 className="font-display text-2xl font-semibold text-paper">The selection journey</h1>
      <p className="mt-1 text-sm text-paper/70">{STAGE_DISCLAIMER}</p>

      <ol className="mt-6 space-y-3">
        {JOURNEY.map((stage, i) => {
          const r = readiness.get(stage.id)
          const badge = KIND_BADGE[stage.kind]
          const drillable = stage.itemTypes.length > 0 && stage.kind !== 'written'
          const pct = r?.accuracy != null ? Math.round(r.accuracy * 100) : null
          const target = stage.targetAccuracy != null ? Math.round(stage.targetAccuracy * 100) : null
          return (
            <li key={stage.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-lg font-semibold">
                  <span className="mr-2 text-muted">{i + 1}.</span>
                  {stage.name}
                </p>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed">{stage.what}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                <span className="font-semibold text-ink">Strategy: </span>
                {stage.strategy}
              </p>

              {drillable && (
                <>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">
                        {pct != null ? (
                          <>
                            {pct}% recent accuracy
                            {r?.secPerItem != null && (
                              <span className="text-muted"> · {r.secPerItem.toFixed(0)} s/item</span>
                            )}
                          </>
                        ) : (
                          'No data yet — start drilling'
                        )}
                      </span>
                      {stage.targetNote && <span className="text-xs text-muted">{stage.targetNote}</span>}
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden>
                      <div
                        className={`h-full rounded-full ${
                          pct != null && target != null && pct >= target ? 'bg-pass' : 'bg-navy-700'
                        }`}
                        style={{ width: `${pct ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onStart({ stage, mode: 'practice' })}
                      className="rounded-xl bg-navy-800 px-4 py-2.5 font-medium text-paper min-h-[44px]"
                    >
                      Practice
                    </button>
                    <button
                      type="button"
                      onClick={() => onStart({ stage, mode: 'mock' })}
                      className="rounded-xl border-2 border-slate-300 px-4 py-2.5 font-medium min-h-[44px]"
                    >
                      Mock
                    </button>
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
