// App shell: four tabs (Today / Journey / Focus / Progress) in a bottom nav
// (mobile-ux contract), with an active session taking over the screen. Mock
// runs live inside the Journey — each stage card starts its own exam draw.

import { useCallback, useState } from 'react'
import type { Item, ItemType } from '@/content/types'
import { loadBank } from '@/content/bank'
import { buildSession } from '@/engine/session'
import { getAnsweredCount, getDailyGoal, getTheta, loadProgress, loadReviewFlags, streakInfo } from '@/db/store'
import { SessionRunner } from '@/ui/SessionRunner'
import { TodayScreen } from '@/ui/screens/TodayScreen'
import { FocusScreen, type FocusPick } from '@/ui/screens/FocusScreen'
import { JourneyScreen, type StageAction } from '@/ui/screens/JourneyScreen'
import { ProgressScreen } from '@/ui/screens/ProgressScreen'

type View = 'today' | 'journey' | 'focus' | 'progress'

interface ActiveSession {
  title: string
  items: Item[]
  mock?: boolean
  reviewFlags: Map<string, 'approved' | 'rejected'>
}

const TABS: { view: View; label: string }[] = [
  { view: 'today', label: 'Today' },
  { view: 'journey', label: 'Journey' },
  { view: 'focus', label: 'Focus' },
  { view: 'progress', label: 'Progress' },
]

export default function App() {
  const [view, setView] = useState<View>('today')
  const [session, setSession] = useState<ActiveSession | null>(null)

  const start = useCallback(
    async (opts: {
      title: string
      size: number
      types?: ItemType[]
      domain?: string
      examDraw?: boolean
      mock?: boolean
    }) => {
      const now = new Date()
      const [progress, theta, answeredCount, reviewFlags] = await Promise.all([
        loadProgress(),
        getTheta(),
        getAnsweredCount(),
        loadReviewFlags(),
      ])
      const items = buildSession(loadBank(), progress, {
        size: opts.size,
        now,
        theta,
        answeredCount,
        types: opts.types,
        domain: opts.domain,
        examDraw: opts.examDraw,
        reviewFlags,
        seed: (Date.now() % 2 ** 31) | 1,
      })
      setSession({ title: opts.title, items, mock: opts.mock, reviewFlags })
    },
    [],
  )

  const startToday = useCallback(async () => {
    const [{ todayAnswered }, goal] = await Promise.all([streakInfo(new Date()), getDailyGoal()])
    const size = Math.max(10, Math.min(20, goal - todayAnswered))
    await start({ title: "Today's session", size })
  }, [start])

  const startFocus = useCallback(
    (pick: FocusPick) =>
      start({ title: `Focus: ${pick.label}`, size: 15, types: pick.types, domain: pick.domain }),
    [start],
  )

  const startStage = useCallback(
    ({ stage, mode }: StageAction) =>
      start(
        mode === 'mock'
          ? { title: `${stage.name} — mock`, size: 20, types: stage.itemTypes, examDraw: true, mock: true }
          : { title: `${stage.name} — practice`, size: 15, types: stage.itemTypes },
      ),
    [start],
  )

  return (
    <div className="min-h-dvh bg-navy-900 px-4 pt-6 pb-24">
      {session ? (
        <SessionRunner
          items={session.items}
          title={session.title}
          mock={session.mock}
          reviewFlags={session.reviewFlags}
          onDone={() => setSession(null)}
        />
      ) : (
        <>
          {view === 'today' && <TodayScreen onStart={() => void startToday()} />}
          {view === 'journey' && <JourneyScreen onStart={(a) => void startStage(a)} />}
          {view === 'focus' && <FocusScreen onPick={(p) => void startFocus(p)} />}
          {view === 'progress' && <ProgressScreen />}

          <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-navy-950/95 backdrop-blur"
          >
            <ul className="mx-auto flex max-w-md">
              {TABS.map((t) => (
                <li key={t.view} className="flex-1">
                  <button
                    type="button"
                    onClick={() => setView(t.view)}
                    aria-current={view === t.view ? 'page' : undefined}
                    className={`w-full px-2 py-4 text-sm font-medium min-h-[44px] ${
                      view === t.view ? 'text-gold-400' : 'text-paper/70'
                    }`}
                  >
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </div>
  )
}
