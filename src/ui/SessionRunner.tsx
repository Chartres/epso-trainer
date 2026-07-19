// Drives a session: item after item through ItemCard, records every answer via
// the store, ends in the Review summary (every item with its rationale — the
// Montessori control-of-error pass, PRD §8).

import { useCallback, useState } from 'react'
import type { Item } from '@/content/types'
import { domainLabel } from '@/content/types'
import { recordAnswer, setReviewFlag } from '@/db/store'
import { ItemCard, type ItemResult } from './ItemCard'

interface Props {
  items: Item[]
  title: string
  /** Mock mode: feedback deferred to the summary. */
  mock?: boolean
  /** Spot-check verdicts loaded at session start (updated locally as you review). */
  reviewFlags?: Map<string, 'approved' | 'rejected'>
  onDone: () => void
}

export function SessionRunner({ items, title, mock, reviewFlags, onDone }: Props) {
  const [results, setResults] = useState<ItemResult[]>([])
  const [verdicts, setVerdicts] = useState<Map<string, 'approved' | 'rejected'>>(
    () => new Map(reviewFlags),
  )
  const idx = results.length
  const finished = idx >= items.length

  const handleResult = useCallback((r: ItemResult) => {
    void recordAnswer(
      { item: r.item, correct: r.correct, rating: r.rating, ms: r.ms },
      new Date(),
    )
    setResults((prev) => [...prev, r])
  }, [])

  const handleReview = useCallback((itemId: string, verdict: 'approved' | 'rejected' | null) => {
    void setReviewFlag(itemId, verdict, new Date())
    setVerdicts((prev) => {
      const next = new Map(prev)
      if (verdict === null) next.delete(itemId)
      else next.set(itemId, verdict)
      return next
    })
  }, [])

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-muted">Nothing to practice here right now.</p>
        <button type="button" onClick={onDone} className="mt-4 rounded-xl bg-navy-800 px-5 py-2.5 font-medium text-paper min-h-[44px]">
          Back
        </button>
      </div>
    )
  }

  if (!finished) {
    return (
      <div>
        <h1 className="mb-4 text-center font-display text-xl font-semibold text-paper">{title}</h1>
        <ItemCard
          item={items[idx]}
          index={idx}
          total={items.length}
          deferFeedback={mock}
          onResult={handleResult}
          reviewVerdict={verdicts.get(items[idx].id) ?? null}
          onReview={(v) => handleReview(items[idx].id, v)}
        />
      </div>
    )
  }

  const correct = results.filter((r) => r.correct).length
  const avgMs = results.reduce((a, r) => a + r.ms, 0) / results.length

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-center font-display text-2xl font-semibold text-paper">Session review</h1>
      <p className="mt-2 text-center text-paper/80">
        {correct} / {results.length} correct · {(avgMs / 1000).toFixed(1)} s per item
      </p>
      <ul className="mt-6 space-y-3">
        {results.map((r, i) => (
          <li key={`${r.item.id}-${i}`} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-muted">{domainLabel(r.item.domain)}</p>
            <p className="mt-1 whitespace-pre-wrap font-medium">{r.item.stem}</p>
            <p className={`mt-2 font-semibold ${r.correct ? 'text-pass' : 'text-fail'}`}>
              {r.correct ? `Correct (${r.chosen})` : `You chose ${r.chosen}; correct is ${r.item.correct}`}
            </p>
            <p className="mt-1 text-sm leading-relaxed">{r.item.rationale}</p>
            {r.item.source && <p className="mt-1 text-xs text-muted">Source: {r.item.source.title}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-6 pb-6 text-center">
        <button type="button" onClick={onDone} className="rounded-xl bg-gold-500 px-6 py-3 font-semibold text-navy-950 min-h-[44px]">
          Done
        </button>
      </div>
    </div>
  )
}
