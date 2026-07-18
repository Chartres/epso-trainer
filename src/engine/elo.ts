// Elo selection layer (PRD §7.2) — answers "WHAT do I see next?".
// 1-parameter logistic model: learner ability θ and item difficulty b, both on
// the same scale, updated after every answer. No backend, no training.

export interface EloUpdate {
  theta: number
  b: number
}

/** Probability a learner with ability theta answers an item of difficulty b correctly. */
export function expectedCorrect(theta: number, b: number): number {
  return 1 / (1 + Math.exp(b - theta))
}

/**
 * After an answer: correct pulls θ up and b down, wrong the reverse.
 * kTheta decays with experience elsewhere; kItem is small so hand-seeded
 * difficulties move slowly.
 */
export function eloUpdate(
  theta: number,
  b: number,
  correct: boolean,
  kTheta = 0.25,
  kItem = 0.08,
): EloUpdate {
  const p = expectedCorrect(theta, b)
  const err = (correct ? 1 : 0) - p
  return { theta: theta + kTheta * err, b: b - kItem * err }
}

/** Learning-rate schedule: fast early, stable later. */
export function kForAnswerCount(n: number): number {
  if (n < 30) return 0.4
  if (n < 100) return 0.25
  return 0.15
}

/**
 * Goldilocks score — how close the item's difficulty sits to the sweet spot
 * just above current ability (target ≈ 65–70% success). Higher is better.
 */
export function goldilocksScore(theta: number, b: number, targetP = 0.7): number {
  return -Math.abs(expectedCorrect(theta, b) - targetP)
}
