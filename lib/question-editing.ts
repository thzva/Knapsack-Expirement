/**
 * Question editing utilities for the Question Bank Manager.
 * Mirrors the algorithms in scripts/generate-static-questions.ts so that
 * edited questions get the same solution / difficulty / metadata treatment
 * as generated ones.
 */

import type { Question } from './static-loader'

export interface Ball {
  id: number
  weight: number
  reward: number
  color: string
}

/** 0-1 knapsack DP solver — same as the generator. */
export function solveKnapsack(items: Ball[], capacity: number): {
  solution: number[]
  maxReward: number
  solutionWeight: number
} {
  const n = items.length
  const cap = Math.max(0, Math.floor(capacity))
  const dp: number[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(cap + 1).fill(0))

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= cap; w++) {
      const item = items[i - 1]
      if (item.weight <= w) {
        dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - item.weight] + item.reward)
      } else {
        dp[i][w] = dp[i - 1][w]
      }
    }
  }

  const solution: number[] = []
  let w = cap
  let totalWeight = 0
  for (let i = n; i > 0 && w > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      solution.push(items[i - 1].id)
      totalWeight += items[i - 1].weight
      w -= items[i - 1].weight
    }
  }

  return {
    solution: solution.reverse(),
    maxReward: dp[n][cap],
    solutionWeight: totalWeight,
  }
}

export function itemDominates(item1: Ball, item2: Ball): boolean {
  return (
    item1.weight <= item2.weight &&
    item1.reward >= item2.reward &&
    (item1.weight < item2.weight || item1.reward > item2.reward)
  )
}

function removeDominatedItems(items: Ball[]): { filtered: Ball[]; removedCount: number } {
  const filtered: Ball[] = []
  for (const item of items) {
    let isDominated = false
    for (const other of items) {
      if (item.id !== other.id && itemDominates(other, item)) {
        isDominated = true
        break
      }
    }
    if (!isDominated) filtered.push(item)
  }
  return { filtered, removedCount: items.length - filtered.length }
}

/**
 * Difficulty classification by dominance structure — same definition as the
 * generator (full dominance chain = easy; maximal + minimal element = medium;
 * no dominance at all = hard; anything else = invalid).
 */
export function classifyDifficultyByDominance(
  balls: Ball[],
): 'easy' | 'medium' | 'hard' | 'invalid' {
  if (balls.length < 2) return 'easy'

  const dominanceMatrix: boolean[][] = []
  let hasAnyDominance = false
  for (let i = 0; i < balls.length; i++) {
    dominanceMatrix[i] = []
    for (let j = 0; j < balls.length; j++) {
      if (i === j) {
        dominanceMatrix[i][j] = false
      } else {
        const dominates = itemDominates(balls[i], balls[j])
        dominanceMatrix[i][j] = dominates
        if (dominates) hasAnyDominance = true
      }
    }
  }

  if (!hasAnyDominance) return 'hard'

  let allPairsHaveDominance = true
  outer: for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      if (!dominanceMatrix[i][j] && !dominanceMatrix[j][i]) {
        allPairsHaveDominance = false
        break outer
      }
    }
  }
  if (allPairsHaveDominance) return 'easy'

  let hasMaximal = false
  let hasMinimal = false
  for (let i = 0; i < balls.length; i++) {
    let dominatesAll = true
    let dominatedByAll = true
    for (let j = 0; j < balls.length; j++) {
      if (i === j) continue
      if (!dominanceMatrix[i][j]) dominatesAll = false
      if (!dominanceMatrix[j][i]) dominatedByAll = false
    }
    if (dominatesAll) hasMaximal = true
    if (dominatedByAll) hasMinimal = true
  }
  if (hasMaximal && hasMinimal) return 'medium'

  return 'invalid'
}

export interface QuestionAnalysis {
  solution: number[]
  maxReward: number
  solutionWeight: number
  uniqueOptimal: boolean
  computedDifficulty: 'easy' | 'medium' | 'hard' | 'invalid'
  metadata: {
    dominanceCount: number
    slackRatio: number
    optimalityGap: number
    densityVariance: number
  }
}

/**
 * Full analysis of a (possibly edited) question: optimal solution, uniqueness
 * of the optimum, dominance-based difficulty and the generator's metadata.
 */
export function analyzeQuestion(balls: Ball[], capacity: number): QuestionAnalysis {
  const optimal = solveKnapsack(balls, capacity)

  const { removedCount } = removeDominatedItems(balls)
  const totalWeight = balls.reduce((sum, b) => sum + b.weight, 0)
  const slackRatio = totalWeight > 0 ? capacity / totalWeight : 0

  const densities = balls.map((b) => (b.weight > 0 ? b.reward / b.weight : 0))
  const avgDensity = densities.reduce((s, d) => s + d, 0) / (densities.length || 1)
  const densityVariance =
    densities.reduce((s, d) => s + Math.pow(d - avgDensity, 2), 0) / (densities.length || 1)

  // Enumerate all subsets (6 balls → 64) for second-best reward + uniqueness.
  const optimalSet = new Set(optimal.solution)
  let secondBestReward = 0
  let optimalCount = 0
  for (let mask = 0; mask < 1 << balls.length; mask++) {
    let w = 0
    let r = 0
    const ids: number[] = []
    for (let i = 0; i < balls.length; i++) {
      if (mask & (1 << i)) {
        w += balls[i].weight
        r += balls[i].reward
        ids.push(balls[i].id)
      }
    }
    if (w > capacity) continue
    if (r === optimal.maxReward) optimalCount++
    const isOptimalSet = ids.length === optimalSet.size && ids.every((id) => optimalSet.has(id))
    if (!isOptimalSet) secondBestReward = Math.max(secondBestReward, r)
  }

  return {
    solution: optimal.solution,
    maxReward: optimal.maxReward,
    solutionWeight: optimal.solutionWeight,
    uniqueOptimal: optimalCount === 1,
    computedDifficulty: classifyDifficultyByDominance(balls),
    metadata: {
      dominanceCount: removedCount,
      slackRatio,
      optimalityGap: optimal.maxReward - secondBestReward,
      densityVariance,
    },
  }
}

/** Rebuild a question object from edited values, recomputing derived fields. */
export function rebuildQuestion(base: Question, balls: Ball[], capacity: number): Question {
  const analysis = analyzeQuestion(balls, capacity)
  const difficulty =
    analysis.computedDifficulty === 'invalid' ? base.difficulty : analysis.computedDifficulty
  return {
    ...base,
    capacity,
    balls: balls.map((b) => ({ ...b })),
    solution: analysis.solution,
    explanation: `The optimal selection maximizes points (${analysis.maxReward}) while staying within capacity (${analysis.solutionWeight}/${capacity}).`,
    difficulty,
    metadata: analysis.metadata,
  }
}
