/**
 * Static Question Loader - Loads questions from pre-generated static-questions.json
 * Replaces dynamic API-based generation with static file loading
 */

import staticQuestions from './static-questions.json';

// Question type definition
export interface Question {
  id: number;
  capacity: number;
  balls: Array<{
    id: number;
    weight: number;
    reward: number;
    color: string;
  }>;
  solution?: number[];
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  phase?: string;
  metadata?: {
    dominanceCount: number;
    slackRatio: number;
    optimalityGap: number;
    densityVariance: number;
  };
}

interface StaticQuestionData {
  metadata: {
    generatedAt: string;
    totalQuestions: number;
    numBalls: number;
    statistics: Record<string, Record<string, number>>;
    version: string;
  };
  questions: Question[];
}

const data = staticQuestions as StaticQuestionData;

/**
 * Get questions for a specific phase and difficulty
 */
export function getQuestionsByPhase(
  phase: 'training' | 'benchmark' | 'prediction',
  difficulty?: 'easy' | 'medium' | 'hard'
): Question[] {
  let filtered = data.questions.filter(q => q.phase === phase);
  
  if (difficulty) {
    filtered = filtered.filter(q => q.difficulty === difficulty);
  }
  
  return filtered;
}

/**
 * Get a random sample of questions for a phase
 */
export function getRandomQuestions(
  phase: 'training' | 'benchmark' | 'prediction',
  count: number,
  difficulty?: 'easy' | 'medium' | 'hard'
): Question[] {
  const available = getQuestionsByPhase(phase, difficulty);
  
  // Shuffle and take first 'count' questions
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get balanced question set (equal distribution of difficulties)
 */
export function getBalancedQuestions(
  phase: 'training' | 'benchmark' | 'prediction',
  easyCount: number,
  mediumCount: number,
  hardCount: number
): Question[] {
  const easy = getRandomQuestions(phase, easyCount, 'easy');
  const medium = getRandomQuestions(phase, mediumCount, 'medium');
  const hard = getRandomQuestions(phase, hardCount, 'hard');
  
  // Combine and shuffle
  return [...easy, ...medium, ...hard].sort(() => Math.random() - 0.5);
}

/**
 * Get questions for Training Phase 1 (Skill Test)
 * Returns: 3 easy + 4 medium + 3 hard = 10 questions
 * Ordered: All easy first, then medium, then hard
 */
export function getTrainingPhase1Questions(): Question[] {
  const easy = getRandomQuestions('training', 3, 'easy');
  const medium = getRandomQuestions('training', 4, 'medium');
  const hard = getRandomQuestions('training', 3, 'hard');
  
  // Return in grouped order (not shuffled)
  return [...easy, ...medium, ...hard];
}

/**
 * Get questions for Benchmark Phase
 * Returns: 10 easy + 10 medium + 10 hard = 30 questions
 * Randomized order
 */
export function getBenchmarkPhaseQuestions(): Question[] {
  return getBalancedQuestions('benchmark', 10, 10, 10);
}

/**
 * Get questions for Prediction Phase (Final Test)
 * Returns: 10 easy + 10 medium + 10 hard = 30 questions
 * Randomized order
 */
export function getPredictionPhaseQuestions(): Question[] {
  return getBalancedQuestions('prediction', 10, 10, 10);
}

/**
 * Get practice questions (hardcoded)
 * Returns: 2 easy + 2 medium + 2 hard = 6 questions
 */
export function getPracticeQuestions(): Question[] {
  // Use first 6 questions from training phase, balanced
  const easy = getRandomQuestions('training', 2, 'easy');
  const medium = getRandomQuestions('training', 2, 'medium');
  const hard = getRandomQuestions('training', 2, 'hard');
  
  return [...easy, ...medium, ...hard].sort(() => Math.random() - 0.5);
}

/**
 * Get metadata about the static question bank
 */
export function getMetadata() {
  return data.metadata;
}

/**
 * Get statistics for all questions
 */
export function getStatistics() {
  return data.metadata.statistics;
}

/**
 * Check if static questions are loaded
 */
export function isLoaded(): boolean {
  return data.questions.length > 0;
}

/**
 * Get total question count
 */
export function getTotalQuestions(): number {
  return data.questions.length;
}

