/**
 * Experiment pool exclusions & overrides bridge.
 *
 * The Question Bank Manager stores two things in localStorage:
 *  - per-question edits (overrides), keyed by question id
 *  - per-test exclusions: question ids removed from that test's pool
 *
 * Every question starts as a candidate (备选). Excluding it removes it from
 * the given test's sampling pool; the experiment draws randomly from what
 * remains.
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
export const EXCLUSIONS_KEY = 'knapsack-test-exclusions-v1'

export type TestKey = 'practice' | 'training2' | 'benchmark' | 'prediction'

export const TEST_KEYS: TestKey[] = ['practice', 'training2', 'benchmark', 'prediction']

export const TEST_LABELS: Record<TestKey, string> = {
  practice: 'Practice',
  training2: 'Test 1 (Skill)',
  benchmark: 'Test 2 (Benchmark)',
  prediction: 'Test 3 (Prediction)',
}

export type Exclusions = Record<TestKey, number[]>

export function emptyExclusions(): Exclusions {
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

export function loadExclusions(): Exclusions {
  if (typeof window === 'undefined') return emptyExclusions()
  const stored = safeParse<Partial<Exclusions>>(localStorage.getItem(EXCLUSIONS_KEY), {})
  const result = emptyExclusions()
  for (const key of TEST_KEYS) {
    const ids = stored[key]
    if (Array.isArray(ids)) result[key] = ids.filter((id) => Number.isInteger(id))
  }
  return result
}

export function saveExclusions(exclusions: Exclusions) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(EXCLUSIONS_KEY, JSON.stringify(exclusions))
  } catch {
    // Storage full/unavailable.
  }
}

/** Ids removed from a test's sampling pool. */
export function getExcludedIds(test: TestKey): Set<number> {
  return new Set(loadExclusions()[test])
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
