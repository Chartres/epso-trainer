// Mock (PRD §8): timed, exam-like sets from reviewed items only. Feedback is
// deferred to the summary — like the real thing.

interface Props {
  onStart: (kind: 'reasoning' | 'field') => void
}

export function MockScreen({ onStart }: Props) {
  return (
    <div className="mx-auto max-w-md pt-6">
      <h1 className="font-display text-2xl font-semibold text-paper">Mock test</h1>
      <p className="mt-1 text-paper/70">
        Exam conditions: no feedback until the end. Reviewed items only. Aim for accuracy first,
        then push time per item down.
      </p>
      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => onStart('reasoning')}
          className="w-full rounded-2xl bg-white px-5 py-4 text-left shadow-sm min-h-[44px]"
        >
          <span className="block font-semibold">Reasoning gate mock</span>
          <span className="text-sm text-muted">20 items — verbal, numerical, abstract</span>
        </button>
        <button
          type="button"
          onClick={() => onStart('field')}
          className="w-full rounded-2xl bg-white px-5 py-4 text-left shadow-sm min-h-[44px]"
        >
          <span className="block font-semibold">Field MCQ mock</span>
          <span className="text-sm text-muted">20 items — AI field + EU regulatory frame</span>
        </button>
      </div>
    </div>
  )
}
