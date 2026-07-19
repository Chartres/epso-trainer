// Persona journey (taste.md: one per primary journey).
// P1 — Pavol, expert and time-poor, drills a Focus set on vacation:
// opens the app → Focus → verbal reasoning → answers an item → immediate
// control of error (rationale) → rates recall → finishes the set → sees the
// review summary → his progress and streak survive a reload (Dexie).

import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { db } from '@/db/db'
import { getAnsweredCount, loadProgress, streakInfo } from '@/db/store'
import { loadBank } from '@/content/bank'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

// Focus sessions cap at 15 items (App.startFocus); the bank has more verbal
// items than that, so the drilled count is the session size.
const verbalCount = Math.min(
  15,
  loadBank().filter((i) => i.type === 'reasoning_verbal').length,
)

async function answerCurrentItem(user: ReturnType<typeof userEvent.setup>) {
  // Click the first option button (A), whatever the item.
  const optionA = await screen.findByRole('button', { name: /^A/ })
  await user.click(optionA)
  // Control of error: the reveal block with a rationale appears.
  expect(await screen.findByTestId('reveal')).toBeInTheDocument()
  // Rate / continue — primary button is Good (correct) or Continue (wrong).
  const rate = screen.queryByRole('button', { name: /Good/ }) ?? screen.getByRole('button', { name: /Continue/ })
  await user.click(rate)
}

describe('P1 journey — focus drill', () => {
  it('drills all verbal items, reviews them, and the state persists', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Free navigation (prepared environment): straight to Focus.
    await user.click(screen.getByRole('button', { name: 'Focus' }))
    await user.click(await screen.findByRole('button', { name: 'Verbal reasoning' }))

    // The focus set isolates one skill: exactly the verbal items.
    await screen.findByText('Focus: Verbal reasoning')
    for (let i = 0; i < verbalCount; i++) {
      await answerCurrentItem(user)
    }

    // Review summary: every item shown with its rationale.
    expect(await screen.findByText('Session review')).toBeInTheDocument()
    expect(screen.getAllByText(/Source:|correct is|Correct \(/).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /Done/ }))

    // Back on the Focus tab; progress persisted to IndexedDB.
    await waitFor(async () => {
      expect(await getAnsweredCount()).toBe(verbalCount)
    })
    const progress = await loadProgress()
    expect(progress.size).toBe(verbalCount)
    const { todayAnswered, streak } = await streakInfo(new Date())
    expect(todayAnswered).toBe(verbalCount)
    expect(streak).toBe(1)
  })

  it('keyboard-first: answers with "1", rates with Enter', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Focus' }))
    await user.click(await screen.findByRole('button', { name: 'Verbal reasoning' }))
    await screen.findByText('Focus: Verbal reasoning')
    await screen.findByRole('button', { name: /^A/ })

    await user.keyboard('1')
    expect(await screen.findByTestId('reveal')).toBeInTheDocument()
    await user.keyboard('{Enter}')
    // Moved on: either the next item (reveal gone) or the summary.
    await waitFor(() => {
      expect(screen.queryByTestId('reveal')).not.toBeInTheDocument()
    })
    expect(await getAnsweredCount()).toBe(1)
  })
})

describe('P1 journey — mock test', () => {
  it('mock defers feedback to the summary', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Mock' }))
    await user.click(await screen.findByRole('button', { name: /Reasoning gate mock/ }))
    await screen.findByText('Reasoning gate mock')

    // Answer the first item: no reveal in mock mode, straight to the next.
    const optionA = await screen.findByRole('button', { name: /^A/ })
    await user.click(optionA)
    expect(screen.queryByTestId('reveal')).not.toBeInTheDocument()
  })
})

describe('Progress screen', () => {
  it('shows domain strength for the shipped bank', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Progress' }))
    expect(await screen.findByText('Domain strength')).toBeInTheDocument()
    expect(screen.getByText('AI Act — prohibited practices')).toBeInTheDocument()
    expect(screen.getByLabelText('Target retention')).toBeInTheDocument()
  })
})
