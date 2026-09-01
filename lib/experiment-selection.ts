/**
 * Experiment selection & overrides bridge.
 *
 * The Question Bank Manager stores two things in localStorage:
 *  - per-question edits (overrides), keyed by question id
 *  - test page assignments: which question ids each test should use
 *
 * The experiment loaders read both, so what you curate in the manager is
 * exactly what participants see in this browser.
 */

import staticQuestions from './static-questions.json'

export interface SelectableQuestion {
  id: number
  capacity: number
  balls: Array<{ id: number; weight: number; reward: number; color: string }>
  solution?: number[]
  explanation?: string
  difficulty?: string
  phase?: string
  metadata?: {
    dominanceCount: number
    slackRatio: number
    optimalityGap: number
    densityVariance: number
  }
}

export const OVERRIDES_KEY = 'knapsack-question-overrides-v1'
export const ASSIGNMENTS_KEY = 'knapsack-test-assignments-v1'

export type TestKey = 'practice' | 'training2' | 'benchmark' | 'prediction'

export const TEST_KEYS: TestKey[] = ['practice', 'training2', 'benchmark', 'prediction']

export const TEST_LABELS: Record<TestKey, string> = {
  practice: 'Practice',
  training2: 'Test 1 (Skill)',
  benchmark: 'Test 2 (Benchmark)',
  prediction: 'Test 3 (Prediction)',
}

export type Assignments = Record<TestKey, number[]>

export function emptyAssignments(): Assignments {
  return { practice: [], training2: [], benchmark: [], prediction: [] }
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as T) : fallback
  } catch {
    return fallback
  }
}

export function loadOverrides(): Record<number, SelectableQuestion> {
  if (typeof window === 'undefined') return {}
  return safeParse(localStorage.getItem(OVERRIDES_KEY), {})
}

export function saveOverrides(overrides: Record<number, SelectableQuestion>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
  } catch {
    // Storage full/unavailable — edits still live in memory for this session.
  }
}

export function loadAssignments(): Assignments {
  if (typeof window === 'undefined') return emptyAssignments()
  const stored = safeParse<Partial<Assignments>>(localStorage.getItem(ASSIGNMENTS_KEY), {})
  const result = emptyAssignments()
  for (const key of TEST_KEYS) {
    const ids = stored[key]
    if (Array.isArray(ids)) result[key] = ids.filter((id) => Number.isInteger(id))
  }
  return result
}

export function saveAssignments(assignments: Assignments) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments))
  } catch {
    // Storage full/unavailable.
  }
}

/** Apply stored edits to a question (returns the edited version if one exists). */
export function withOverride<T extends SelectableQuestion>(question: T): T {
  const override = loadOverrides()[question.id]
  return (override as T) ?? question
}

/** Apply stored edits across a list of questions. */
export function withOverrides<T extends SelectableQuestion>(questions: T[]): T[] {
  const overrides = loadOverrides()
  if (Object.keys(overrides).length === 0) return questions
  return questions.map((q) => (overrides[q.id] as T) ?? q)
}

/**
 * Questions assigned to a test page, edits applied, in the curated order.
 * Returns null when nothing is assigned (caller falls back to sampling).
 */
export function getAssignedQuestions(test: TestKey): SelectableQuestion[] | null {
  const ids = loadAssignments()[test]
  if (!ids || ids.length === 0) return null
  const overrides = loadOverrides()
  const byId = new Map(
    (staticQuestions.questions as SelectableQuestion[]).map((q) => [q.id, q]),
  )
  const questions = ids
    .map((id) => overrides[id] ?? byId.get(id))
    .filter((q): q is SelectableQuestion => Boolean(q))
  return questions.length > 0 ? questions : null
}
