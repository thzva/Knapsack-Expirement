/**
 * Script to generate static question set for all phases and difficulties
 * Generates many questions and removes duplicates to create a final static set
 * Uses NUM_BALLS constant and Leo's difficulty classification
 */

import { writeFileSync } from 'fs';
import { NUM_BALLS } from '../lib/config';

// Define types
interface Ball {
  id: number;
  weight: number;
  reward: number;
  color: string;
}

interface Question {
  id: number;
  capacity: number;
  balls: Ball[];
  solution?: number[];
  explanation?: string;
  difficulty?: string;
  phase?: string;
  metadata?: {
    dominanceCount: number;
    slackRatio: number;
    optimalityGap: number;
    densityVariance: number;
  };
}

interface GeneratorConfig {
  numItems: number;
  minWeight: number;
  maxWeight: number;
  minReward: number;
  maxReward: number;
  targetSlackRatio?: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  ensureUniqueSolution?: boolean;
}

// Available colors for balls
const BALL_COLORS = [
  "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500",
  "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-orange-500",
  "bg-teal-500", "bg-rose-500", "bg-cyan-500", "bg-lime-500",
  "bg-amber-500", "bg-emerald-500", "bg-violet-500", "bg-sky-500"
];

/**
 * Seeded random number generator
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.seed / Math.pow(2, 32);
  }

  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * Solves 0-1 knapsack problem using dynamic programming
 */
function solveKnapsack(items: Ball[], capacity: number): {
  solution: number[];
  maxReward: number;
  solutionWeight: number;
} {
  const n = items.length;
  const dp: number[][] = Array(n + 1).fill(null).map(() => Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      const item = items[i - 1];
      if (item.weight <= w) {
        dp[i][w] = Math.max(
          dp[i - 1][w],
          dp[i - 1][w - item.weight] + item.reward
        );
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  const solution: number[] = [];
  let w = capacity;
  let totalWeight = 0;

  for (let i = n; i > 0 && w > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      solution.push(items[i - 1].id);
      totalWeight += items[i - 1].weight;
      w -= items[i - 1].weight;
    }
  }

  return {
    solution: solution.reverse(),
    maxReward: dp[n][capacity],
    solutionWeight: totalWeight
  };
}

/**
 * Check if item i dominates item j
 */
function itemDominates(item1: Ball, item2: Ball): boolean {
  return (item1.weight <= item2.weight && item1.reward >= item2.reward) &&
    (item1.weight < item2.weight || item1.reward > item2.reward);
}

/**
 * Classifies difficulty based on Leo's definition from readme.tex
 * 
 * Easy: For any two balls B_k and B_j, either B_k ≻ B_j OR B_j ≻ B_k
 *       (every pair has a dominance relationship - full dominance chain)
 * 
 * Medium: There exists one maximal ball B_k such that B_k ≻ B for all remaining B,
 *         AND one minimal ball B_j such that B ≻ B_j for all remaining B
 *         (partial dominance - has both maximal and minimal elements)
 * 
 * Hard: B_k ⊁ B_j for all k, j (no dominance relationships exist)
 */
function classifyDifficultyByDominance(balls: Ball[]): 'easy' | 'medium' | 'hard' | 'invalid' {
  if (balls.length < 2) {
    return 'easy' // Single ball is trivially easy
  }

  // Check all pairs for dominance relationships
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
        if (dominates) {
          hasAnyDominance = true
        }
      }
    }
  }

  // Hard: No dominance relationships exist
  if (!hasAnyDominance) {
    return 'hard'
  }

  // Check if every pair has a dominance relationship (Easy)
  let allPairsHaveDominance = true
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const iDominatesJ = dominanceMatrix[i][j]
      const jDominatesI = dominanceMatrix[j][i]
      if (!iDominatesJ && !jDominatesI) {
        allPairsHaveDominance = false
        break
      }
    }
    if (!allPairsHaveDominance) break
  }

  if (allPairsHaveDominance) {
    return 'easy'
  }

  // Medium: Check for maximal and minimal elements
  // Maximal: dominates all other balls
  // Minimal: dominated by all other balls
  let hasMaximal = false
  let hasMinimal = false

  for (let i = 0; i < balls.length; i++) {
    // Check if ball i is maximal (dominates all others)
    let dominatesAll = true
    for (let j = 0; j < balls.length; j++) {
      if (i !== j && !dominanceMatrix[i][j]) {
        dominatesAll = false
        break
      }
    }
    if (dominatesAll) {
      hasMaximal = true
    }

    // Check if ball i is minimal (dominated by all others)
    let dominatedByAll = true
    for (let j = 0; j < balls.length; j++) {
      if (i !== j && !dominanceMatrix[j][i]) {
        dominatedByAll = false
        break
      }
    }
    if (dominatedByAll) {
      hasMinimal = true
    }
  }

  // Medium: has both maximal and minimal elements
  if (hasMaximal && hasMinimal) {
    return 'medium'
  }

  // Default to invalid if we can't classify as strictly easy, medium, or hard
  return 'invalid'
}

/**
 * Remove dominated items
 */
function removeDominatedItems(items: Ball[]): {
  filtered: Ball[];
  removedCount: number;
} {
  const filtered: Ball[] = [];

  for (const item of items) {
    let isDominated = false;

    for (const other of items) {
      if (item.id !== other.id && itemDominates(other, item)) {
        isDominated = true;
        break;
      }
    }

    if (!isDominated) {
      filtered.push(item);
    }
  }

  return {
    filtered,
    removedCount: items.length - filtered.length
  };
}

/**
 * Analyze difficulty
 */
function analyzeDifficulty(items: Ball[], capacity: number, solution: number[]): {
  dominanceCount: number;
  slackRatio: number;
  optimalityGap: number;
  densityVariance: number;
} {
  const { removedCount } = removeDominatedItems(items);
  const dominanceCount = removedCount;

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const slackRatio = capacity / totalWeight;

  const densities = items.map(item => item.reward / item.weight);
  const avgDensity = densities.reduce((sum, d) => sum + d, 0) / densities.length;
  const densityVariance = densities.reduce((sum, d) => sum + Math.pow(d - avgDensity, 2), 0) / densities.length;

  const optimal = solveKnapsack(items, capacity);

  let secondBestReward = 0;
  const optimalSet = new Set(solution);

  const maxCombinations = Math.min(1 << items.length, 1024);
  for (let mask = 0; mask < maxCombinations; mask++) {
    const combination: number[] = [];
    let totalWeight = 0;
    let totalReward = 0;

    for (let i = 0; i < items.length; i++) {
      if (mask & (1 << i)) {
        combination.push(items[i].id);
        totalWeight += items[i].weight;
        totalReward += items[i].reward;
      }
    }

    if (totalWeight > capacity) continue;
    if (combination.length === optimalSet.size &&
      combination.every(id => optimalSet.has(id))) continue;

    secondBestReward = Math.max(secondBestReward, totalReward);
  }

  const optimalityGap = optimal.maxReward - secondBestReward;

  return {
    dominanceCount,
    slackRatio,
    optimalityGap,
    densityVariance
  };
}

/**
 * Create dominance pattern
 * Now uses NUM_BALLS constant instead of config.numItems
 */
function createDominancePattern(
  config: GeneratorConfig,
  dominanceType: 'full' | 'partial' | 'none',
  rng: SeededRandom
): Ball[] {
  const items: Ball[] = [];

  // Create a randomized base for the lowest weight and highest reward
  // to avoid hardcoding the exact same boundary values every time.
  const wRange = config.maxWeight - config.minWeight;
  const rRange = config.maxReward - config.minReward;
  
  // Allow wider starting points if the range permits
  const baseWeightOffset = rng.range(0, Math.max(1, Math.floor(wRange / 2)));
  const baseRewardOffset = rng.range(0, Math.max(1, Math.floor(rRange / 2)));

  const baseWeight = config.minWeight + baseWeightOffset;
  const baseReward = config.maxReward - baseRewardOffset;

  switch (dominanceType) {
    case 'full':
      // Create fully dominated chain with some randomness for variety
      for (let i = 0; i < NUM_BALLS; i++) {
        // Add random variation to weights and rewards while maintaining dominance
        const weightStep = rng.range(1, 2);
        const rewardStep = rng.range(2, 4);
        
        // We accumulate the steps to ensure strict monotonic properties 
        // rather than just multiplying by 'i' which creates rigid lines
        const prevWeight = i > 0 ? items[i - 1].weight : baseWeight - weightStep;
        const prevReward = i > 0 ? items[i - 1].reward : baseReward + rewardStep;
        
        items.push({
          id: i + 1,
          weight: Math.min(config.maxWeight, prevWeight + weightStep),
          reward: Math.max(config.minReward, prevReward - rewardStep),
          color: BALL_COLORS[i % BALL_COLORS.length]
        });
      }
      
      // Shuffle the order so they aren't strictly increasing
      for (let i = items.length - 1; i > 0; i--) {
        const j = rng.range(0, i);
        [items[i], items[j]] = [items[j], items[i]];
      }

      // Reassign IDs and colors after shuffle
      items.forEach((ball, idx) => {
        ball.id = idx + 1;
        ball.color = BALL_COLORS[idx % BALL_COLORS.length];
      });
      break;

    case 'partial':
      // Medium difficulty: guarantee one MAXIMAL ball (dominates all) and one MINIMAL ball (dominated by all)
      // Middle balls have trade-offs among themselves (no mutual dominance)
      {
        // 1. Create the MAXIMAL ball: lowest weight, highest reward → dominates everything
        const maximalWeight = config.minWeight;
        const maximalReward = config.maxReward;

        // 2. Create the MINIMAL ball: highest weight, lowest reward → dominated by everything
        const minimalWeight = config.maxWeight;
        const minimalReward = config.minReward;

        // 3. Create middle balls with weights and rewards strictly between maximal and minimal
        // To ensure maximal dominates them: middleWeight > maximalWeight AND middleReward < maximalReward
        // To ensure they dominate minimal: middleWeight < minimalWeight AND middleReward > minimalReward
        // To ensure NO mutual dominance among middle balls: create trade-offs
        //   (if one middle ball has lower weight, give it lower reward too)
        const middleBalls: Ball[] = [];
        const middleCount = NUM_BALLS - 2;

        for (let i = 0; i < middleCount; i++) {
          // Spread weights and rewards across the range between maximal and minimal
          // Use opposing gradients: as weight increases, reward also increases (creates trade-offs)
          const t = (i + 1) / (middleCount + 1); // evenly spaced ratio (0, 1)

          const weightRange = minimalWeight - maximalWeight - 2; // leave room for strict inequalities
          const rewardRange = maximalReward - minimalReward - 2;

          let middleWeight = maximalWeight + 1 + Math.floor(t * weightRange) + rng.range(0, 1);
          let middleReward = minimalReward + 1 + Math.floor(t * rewardRange) + rng.range(0, 1);

          // Clamp to valid range (strictly between maximal and minimal)
          middleWeight = Math.max(maximalWeight + 1, Math.min(minimalWeight - 1, middleWeight));
          middleReward = Math.max(minimalReward + 1, Math.min(maximalReward - 1, middleReward));

          middleBalls.push({
            id: 0, // will be reassigned
            weight: middleWeight,
            reward: middleReward,
            color: ''
          });
        }

        // Assemble all balls: maximal first, then middle (shuffled), then minimal
        const allBalls: Ball[] = [
          { id: 1, weight: maximalWeight, reward: maximalReward, color: BALL_COLORS[0] },
          ...middleBalls,
          { id: NUM_BALLS, weight: minimalWeight, reward: minimalReward, color: BALL_COLORS[NUM_BALLS - 1] }
        ];

        // Shuffle the order so maximal/minimal aren't always first/last
        for (let i = allBalls.length - 1; i > 0; i--) {
          const j = rng.range(0, i);
          [allBalls[i], allBalls[j]] = [allBalls[j], allBalls[i]];
        }

        // Reassign IDs and colors after shuffle
        allBalls.forEach((ball, idx) => {
          ball.id = idx + 1;
          ball.color = BALL_COLORS[idx % BALL_COLORS.length];
        });

        items.push(...allBalls);
      }
      break;

    case 'none':
      {
        const weights: number[] = [];
        const rewards: number[] = [];
        for (let i = 0; i < NUM_BALLS; i++) {
          weights.push(rng.range(config.minWeight, config.maxWeight));
          rewards.push(rng.range(config.minReward, config.maxReward));
        }
        
        // Sort both arrays to enforce strict monotonic relationship
        weights.sort((a, b) => a - b);
        rewards.sort((a, b) => a - b);
        
        // Ensure strictly increasing internally
        for (let i = 1; i < NUM_BALLS; i++) {
          if (weights[i] <= weights[i - 1]) weights[i] = weights[i - 1] + 1;
          if (rewards[i] <= rewards[i - 1]) rewards[i] = rewards[i - 1] + 1;
        }

        const hardBalls: Ball[] = [];
        for (let i = 0; i < NUM_BALLS; i++) {
          hardBalls.push({
            id: i + 1,
            weight: weights[i],
            reward: rewards[i],
            color: BALL_COLORS[i % BALL_COLORS.length]
          });
        }
        
        // Shuffle the order so monotonic progression isn't obvious
        for (let i = hardBalls.length - 1; i > 0; i--) {
          const j = rng.range(0, i);
          [hardBalls[i], hardBalls[j]] = [hardBalls[j], hardBalls[i]];
        }

        // Reassign IDs and colors after shuffle
        hardBalls.forEach((ball, idx) => {
          ball.id = idx + 1;
          ball.color = BALL_COLORS[idx % BALL_COLORS.length];
        });

        items.push(...hardBalls);
      }
      break;
  }

  return items;
}

/**
 * Adjust capacity
 */
function adjustCapacityForSlackRatio(items: Ball[], targetSlackRatio?: number, rng?: SeededRandom): number {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

  if (targetSlackRatio) {
    return Math.floor(totalWeight * targetSlackRatio);
  }

  // Add some randomness to capacity for more variety (0.6 to 0.8)
  const slackRatio = rng ? 0.6 + rng.next() * 0.2 : 0.7;
  return Math.floor(totalWeight * slackRatio);
}

/**
 * Generate a single knapsack question
 * Now classifies difficulty using Leo's definition instead of config.difficultyLevel
 */
function generateKnapsackQuestion(
  id: number,
  config: GeneratorConfig,
  phase: string,
  seed: number,
  targetDifficulty?: 'easy' | 'medium' | 'hard'
): Question | null {
  const rng = new SeededRandom(seed + id);
  const maxAttempts = 200; // Increased attempts to find questions matching target difficulty
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    // Try different dominance patterns to generate variety
    // We'll classify after generation, so try different patterns
    const patternTypes: Array<'full' | 'partial' | 'none'> = ['full', 'partial', 'none'];
    const dominanceType = patternTypes[attempts % patternTypes.length];

    const items = createDominancePattern(config, dominanceType, rng);

    // Ensure we have exactly NUM_BALLS items
    if (items.length !== NUM_BALLS) {
      continue;
    }

    const capacity = adjustCapacityForSlackRatio(items, config.targetSlackRatio, rng);
    const solution = solveKnapsack(items, capacity);

    if (solution.solution.length === 0) {
      continue;
    }

    // Classify difficulty using Leo's definition
    const classifiedDifficulty = classifyDifficultyByDominance(items);

    // If target difficulty is specified, only accept questions matching it
    if (targetDifficulty && classifiedDifficulty !== targetDifficulty) {
      continue;
    }

    const metadata = analyzeDifficulty(items, capacity, solution.solution);
    const explanation = `The optimal selection maximizes points (${solution.maxReward}) while staying within capacity (${solution.solutionWeight}/${capacity}).`;

    return {
      id,
      capacity,
      balls: items,
      solution: solution.solution,
      explanation,
      difficulty: classifiedDifficulty, // Use classified difficulty, not config
      phase,
      metadata
    };
  }

  return null;
}

/**
 * Configuration for each phase and difficulty
 * Note: numItems is now always NUM_BALLS, but we keep different weight/reward ranges for variety
 */
const PHASE_CONFIGS = {
  training: {
    easy: { numItems: NUM_BALLS, minWeight: 2, maxWeight: 8, minReward: 8, maxReward: 24 },
    medium: { numItems: NUM_BALLS, minWeight: 3, maxWeight: 10, minReward: 10, maxReward: 30 },
    hard: { numItems: NUM_BALLS, minWeight: 4, maxWeight: 12, minReward: 12, maxReward: 36 }
  },
  benchmark: {
    easy: { numItems: NUM_BALLS, minWeight: 3, maxWeight: 10, minReward: 10, maxReward: 30 },
    medium: { numItems: NUM_BALLS, minWeight: 4, maxWeight: 12, minReward: 12, maxReward: 36 },
    hard: { numItems: NUM_BALLS, minWeight: 5, maxWeight: 15, minReward: 15, maxReward: 45 }
  },
  prediction: {
    easy: { numItems: NUM_BALLS, minWeight: 4, maxWeight: 12, minReward: 12, maxReward: 36 },
    medium: { numItems: NUM_BALLS, minWeight: 5, maxWeight: 14, minReward: 14, maxReward: 42 },
    hard: { numItems: NUM_BALLS, minWeight: 5, maxWeight: 15, minReward: 15, maxReward: 45 }
  }
};

/**
 * Generate question hash for duplicate detection
 */
function getQuestionHash(question: Question): string {
  // Create a hash based on capacity and sorted balls (by weight and reward)
  const sortedBalls = [...question.balls]
    .sort((a, b) => a.weight - b.weight || a.reward - b.reward)
    .map(b => `${b.weight}-${b.reward}`)
    .join(',');
  return `${question.capacity}:${sortedBalls}`;
}

/**
 * Remove duplicate questions
 */
function removeDuplicates(questions: Question[]): Question[] {
  const seen = new Set<string>();
  const unique: Question[] = [];

  for (const question of questions) {
    const hash = getQuestionHash(question);
    if (!seen.has(hash)) {
      seen.add(hash);
      unique.push(question);
    }
  }

  return unique;
}

/**
 * Main generation function
 */
function generateStaticQuestions() {
  console.log('🚀 Starting static question generation...\n');

  const allQuestions: Question[] = [];
  let questionId = 1;

  // Generate questions for each phase and difficulty
  const phases = ['training', 'benchmark', 'prediction'];
  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

  // Generate a larger number of questions to ensure variety after deduplication
  const questionsPerCombination = 100; // Generate 100 questions per phase-difficulty combo

  for (const phase of phases) {
    console.log(`📋 Generating questions for ${phase.toUpperCase()} phase...`);

    for (const difficulty of difficulties) {
      console.log(`  ⚙️  Difficulty: ${difficulty}...`);

      const baseConfig = PHASE_CONFIGS[phase as keyof typeof PHASE_CONFIGS][difficulty];

      let successCount = 0;
      let seed = 10000 + Math.random() * 100000; // Random starting seed

      for (let i = 0; i < questionsPerCombination; i++) {
        const config: GeneratorConfig = {
          ...baseConfig,
          difficultyLevel: difficulty, // Still used for generation hints, but final classification uses Leo's definition
          ensureUniqueSolution: false // Allow more variety
        };

        const question = generateKnapsackQuestion(
          questionId++,
          config,
          phase,
          seed + i * 1000,
          difficulty // Target difficulty - will filter to match
        );

        if (question) {
          // Verify the question has exactly NUM_BALLS
          if (question.balls.length === NUM_BALLS) {
            allQuestions.push(question);
            successCount++;
          }
        }
      }

      console.log(`    ✅ Generated ${successCount} questions`);
    }
  }

  console.log(`\n📊 Total questions generated: ${allQuestions.length}`);

  // Remove duplicates
  console.log('\n🔍 Removing duplicates...');
  const uniqueQuestions = removeDuplicates(allQuestions);
  console.log(`✨ Unique questions after deduplication: ${uniqueQuestions.length}`);
  console.log(`🗑️  Removed ${allQuestions.length - uniqueQuestions.length} duplicates`);

  // Filter to ensure all questions have exactly NUM_BALLS
  const filteredQuestions = uniqueQuestions.filter(q => q.balls.length === NUM_BALLS);
  console.log(`🔢 Questions with exactly ${NUM_BALLS} balls: ${filteredQuestions.length}`);

  // Re-assign sequential IDs
  filteredQuestions.forEach((q, index) => {
    q.id = index + 1;
  });

  // Generate statistics
  console.log('\n📈 Statistics:');
  const stats: Record<string, Record<string, number>> = {};

  for (const phase of phases) {
    stats[phase] = { easy: 0, medium: 0, hard: 0 };
    for (const difficulty of difficulties) {
      const count = filteredQuestions.filter(
        q => q.phase === phase && q.difficulty === difficulty
      ).length;
      stats[phase][difficulty] = count;
    }
  }

  for (const phase of phases) {
    console.log(`\n  ${phase.toUpperCase()}:`);
    console.log(`    Easy: ${stats[phase].easy}`);
    console.log(`    Medium: ${stats[phase].medium}`);
    console.log(`    Hard: ${stats[phase].hard}`);
    console.log(`    Total: ${stats[phase].easy + stats[phase].medium + stats[phase].hard}`);
  }

  // Save to JSON file
  const outputPath = './lib/static-questions.json';
  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalQuestions: filteredQuestions.length,
      numBalls: NUM_BALLS,
      statistics: stats,
      version: '2.0.0'
    },
    questions: filteredQuestions
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Questions saved to: ${outputPath}`);
  console.log('✅ Done!\n');
}

// Run the generator
generateStaticQuestions();

