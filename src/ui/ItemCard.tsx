// The item screen (PRD §8): stem → options → answer → immediate control of
// error (rationale + source), then FSRS self-rating. Keyboard-first: 1–4/A–D
// answer, then for correct answers 2/3/4 rate Hard/Good/Easy (wrong = Again
// automatically), Enter/Space continues.

import { useCallback, useEffect, useState } from 'react'
import type { Item, OptionKey } from '@/content/types'
import { domainLabel } from '@/content/types'
import type { SelfRating } from '@/engine/fsrs'

export interface ItemResult {
  item: Item
  chosen: OptionKey
  correct: boolean
  rating: SelfRating
  ms: number
}

interface Props {
  item: Item
  index: number
  total: number
  /** Mock mode: defer rationale to the summary, no self-rating step. */
  deferFeedback?: boolean
  onResult: (r: ItemResult) => void
}

const KEY_TO_OPTION: Record<string, OptionKey> = {
  '1': 'A',
  '2': 'B',
  '3': 'C',
  '4': 'D',
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
}

export function ItemCard({ item, index, total, deferFeedback, onResult }: Props) {
  const [chosen, setChosen] = useState<OptionKey | null>(null)
  const [startedAt, setStartedAt] = useState(() => Date.now())

  useEffect(() => {
    setChosen(null)
    setStartedAt(Date.now())
  }, [item.id])

  const correct = chosen === item.correct

  const finish = useCallback(
    (rating: SelfRating) => {
      if (!chosen) return
      onResult({ item, chosen, correct: chosen === item.correct, rating, ms: Date.now() - startedAt })
    },
    [chosen, item, onResult, startedAt],
  )

  const answer = useCallback(
    (key: OptionKey) => {
      if (chosen) return
      if (!item.options.some((o) => o.key === key)) return
      setChosen(key)
      if (deferFeedback) {
        // Mock: no reveal step; rating derived from correctness.
        onResult({
          item,
          chosen: key,
          correct: key === item.correct,
          rating: key === item.correct ? 'good' : 'again',
          ms: Date.now() - startedAt,
        })
      }
    },
    [chosen, deferFeedback, item, onResult, startedAt],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (!chosen) {
        const opt = KEY_TO_OPTION[k]
        if (opt) answer(opt)
        return
      }
      if (deferFeedback) return
      if (!correct && (k === 'enter' || k === ' ')) finish('again')
      if (correct) {
        if (k === '2') finish('hard')
        if (k === '3' || k === 'enter' || k === ' ') finish('good')
        if (k === '4') finish('easy')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer, chosen, correct, deferFeedback, finish])

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="mb-2 flex items-baseline justify-between text-sm text-muted">
        <span>{domainLabel(item.domain)}</span>
        <span>
          {index + 1} / {total}
        </span>
      </p>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="whitespace-pre-wrap font-medium leading-relaxed">{item.stem}</p>
        <ul className="mt-4 space-y-2">
          {item.options.map((o) => {
            const isChosen = chosen === o.key
            const isCorrect = chosen && o.key === item.correct
            const cls = !chosen
              ? 'border-slate-200 hover:border-navy-700'
              : isCorrect && !deferFeedback
                ? 'border-pass bg-pass-soft'
                : isChosen
                  ? deferFeedback
                    ? 'border-navy-700 bg-slate-50'
                    : 'border-fail bg-fail-soft'
                  : 'border-slate-200 opacity-60'
            return (
              <li key={o.key}>
                <button
                  type="button"
                  disabled={!!chosen}
                  onClick={() => answer(o.key)}
                  className={`flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors min-h-[44px] ${cls}`}
                >
                  <span className="font-semibold">{o.key}</span>
                  <span className="whitespace-pre-wrap">{o.text}</span>
                </button>
              </li>
            )
          })}
        </ul>

        {chosen && !deferFeedback && (
          <div className="mt-5 border-t border-slate-200 pt-4" data-testid="reveal">
            <p className={`font-semibold ${correct ? 'text-pass' : 'text-fail'}`}>
              {correct ? 'Correct.' : `Wrong — the answer is ${item.correct}.`}
            </p>
            <p className="mt-2 leading-relaxed">{item.rationale}</p>
            {item.source && (
              <p className="mt-2 text-sm text-muted">
                Source:{' '}
                {item.source.url ? (
                  <a className="underline" href={item.source.url} target="_blank" rel="noreferrer">
                    {item.source.title}
                  </a>
                ) : (
                  item.source.title
                )}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {correct ? (
                <>
                  <RateButton label="Hard" hint="2" onClick={() => finish('hard')} />
                  <RateButton label="Good" hint="3 / ⏎" onClick={() => finish('good')} primary />
                  <RateButton label="Easy" hint="4" onClick={() => finish('easy')} />
                </>
              ) : (
                <RateButton label="Continue" hint="⏎" onClick={() => finish('again')} primary />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RateButton({
  label,
  hint,
  primary,
  onClick,
}: {
  label: string
  hint: string
  primary?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 font-medium min-h-[44px] ${
        primary ? 'bg-navy-800 text-paper' : 'border-2 border-slate-300'
      }`}
    >
      {label} <span className={`text-xs ${primary ? 'text-paper/70' : 'text-muted'}`}>{hint}</span>
    </button>
  )
}
