// Today (PRD §8): one primary CTA — the session the engine built. Daily goal +
// streak, nothing else clamouring.

import { useEffect, useState } from 'react'
import { streakInfo, type StreakInfo } from '@/db/store'

interface Props {
  onStart: () => void
}

export function TodayScreen({ onStart }: Props) {
  const [info, setInfo] = useState<StreakInfo | null>(null)

  useEffect(() => {
    void streakInfo(new Date()).then(setInfo)
  }, [])

  const goalMet = info ? info.todayAnswered >= info.goal : false

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-10 text-center">
      <h1 className="font-display text-3xl font-bold text-paper">EPSO Forge</h1>
      <p className="mt-1 text-paper/70">AD 8 (AI) — reasoning gate + field MCQ</p>

      {info && (
        <div className="mt-8 flex gap-8 text-paper">
          <div>
            <p className="text-3xl font-bold tabular-nums">
              {info.todayAnswered}
              <span className="text-lg text-paper/60">/{info.goal}</span>
            </p>
            <p className="text-sm text-paper/70">items today</p>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums">{info.streak}</p>
            <p className="text-sm text-paper/70">day streak</p>
          </div>
        </div>
      )}

      {goalMet && <p className="mt-4 text-gold-400">Daily goal met.</p>}

      <button
        type="button"
        onClick={onStart}
        className="mt-10 w-full rounded-2xl bg-gold-500 px-8 py-4 text-lg font-semibold text-navy-950 min-h-[44px]"
      >
        Start today's session
      </button>
      <p className="mt-3 text-sm text-paper/60">
        Due reviews first, then new material matched to your level.
      </p>
    </div>
  )
}
