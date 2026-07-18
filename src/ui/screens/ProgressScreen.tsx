// Progress (PRD §8): mastery by domain (strength bars), weak tags, streak, and
// the telemetry export that feeds the authoring flywheel (PRD §6.4). Honest
// signal, no vanity metrics.

import { useEffect, useState } from 'react'
import { loadBank } from '@/content/bank'
import { domainLabel } from '@/content/types'
import {
  domainStats,
  exportTelemetry,
  getRetention,
  setRetention,
  streakInfo,
  weakTags,
  type DomainStats,
  type StreakInfo,
  type WeakTag,
} from '@/db/store'

export function ProgressScreen() {
  const [stats, setStats] = useState<DomainStats[]>([])
  const [weak, setWeak] = useState<WeakTag[]>([])
  const [info, setInfo] = useState<StreakInfo | null>(null)
  const [retention, setRetentionState] = useState(0.9)

  useEffect(() => {
    const now = new Date()
    void domainStats(loadBank(), now).then(setStats)
    void weakTags().then(setWeak)
    void streakInfo(now).then(setInfo)
    void getRetention().then(setRetentionState)
  }, [])

  const changeRetention = (v: number) => {
    setRetentionState(v)
    void setRetention(v)
  }

  const download = async () => {
    const dump = await exportTelemetry()
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `epso-telemetry-${dump.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="mx-auto max-w-2xl pb-6">
      <h1 className="font-display text-2xl font-semibold text-paper">Progress</h1>

      {info && (
        <p className="mt-1 text-paper/70">
          {info.todayAnswered} items today · {info.streak}-day streak
        </p>
      )}

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-paper/60">
        Domain strength
      </h2>
      <ul className="mt-2 space-y-2">
        {stats.map((s) => (
          <li key={s.domain} className="rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{domainLabel(s.domain)}</span>
              <span className="text-sm tabular-nums text-muted">
                {s.seen}/{s.total} seen{s.seen > 0 && ` · ${Math.round(s.accuracy * 100)}%`}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-navy-700"
                style={{ width: `${Math.round((s.seen ? s.avgRecall : 0) * 100)}%` }}
                aria-hidden
              />
            </div>
          </li>
        ))}
      </ul>

      {weak.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-paper/60">
            Weakest tags
          </h2>
          <ul className="mt-2 space-y-1">
            {weak.slice(0, 5).map((w) => (
              <li key={w.domain} className="flex justify-between rounded-lg bg-white/10 px-3 py-2 text-paper">
                <span>{domainLabel(w.domain)}</span>
                <span className="tabular-nums">{Math.round(w.accuracy * 100)}% of {w.answers}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-paper/60">Settings</h2>
      <div className="mt-2 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
        <label htmlFor="retention" className="font-medium">
          Target retention
        </label>
        <select
          id="retention"
          value={retention}
          onChange={(e) => changeRetention(Number(e.target.value))}
          className="rounded-lg border-2 border-slate-300 px-3 py-2 min-h-[44px]"
        >
          <option value={0.85}>85% — fewer reviews</option>
          <option value={0.9}>90% — default</option>
          <option value={0.95}>95% — exam is near</option>
        </select>
      </div>

      <button
        type="button"
        onClick={() => void download()}
        className="mt-6 w-full rounded-xl border-2 border-gold-500 px-4 py-3 font-medium text-gold-400 min-h-[44px]"
      >
        Export telemetry (weak-tag report for the next authoring run)
      </button>
    </div>
  )
}
