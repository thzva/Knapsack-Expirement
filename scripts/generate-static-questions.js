"use strict";
/**
 * Script to generate static question set for all phases and difficulties
 * Generates many questions and removes duplicates to create a final static set
 * Uses NUM_BALLS constant and Leo's difficulty classification
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var config_1 = require("../lib/config");
// Available colors for balls
var BALL_COLORS = [
    "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500",
    "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-orange-500",
    "bg-teal-500", "bg-rose-500", "bg-cyan-500", "bg-lime-500",
    "bg-amber-500", "bg-emerald-500", "bg-violet-500", "bg-sky-500"
];
/**
 * Seeded random number generator
 */
var SeededRandom = /** @class */ (function () {
    function SeededRandom(seed) {
        this.seed = seed;
    }
    SeededRandom.prototype.next = function () {
        this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
        return this.seed / Math.pow(2, 32);
    };
    SeededRandom.prototype.range = function (min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    };
    return SeededRandom;
}());
/**
 * Solves 0-1 knapsack problem using dynamic programming
 */
function solveKnapsack(items, capacity) {
    var n = items.length;
    var dp = Array(n + 1).fill(null).map(function () { return Array(capacity + 1).fill(0); });
    for (var i = 1; i <= n; i++) {
        for (var w_1 = 0; w_1 <= capacity; w_1++) {
            var item = items[i - 1];
            if (item.weight <= w_1) {
                dp[i][w_1] = Math.max(dp[i - 1][w_1], dp[i - 1][w_1 - item.weight] + item.reward);
            }
            else {
                dp[i][w_1] = dp[i - 1][w_1];
            }
        }
    }
    var solution = [];
    var w = capacity;
    var totalWeight = 0;
    for (var i = n; i > 0 && w > 0; i--) {
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
function itemDominates(item1, item2) {
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
function classifyDifficultyByDominance(balls) {
    if (balls.length < 2) {
        return 'easy'; // Single ball is trivially easy
    }
    // Check all pairs for dominance relationships
    var dominanceMatrix = [];
    var hasAnyDominance = false;
    for (var i = 0; i < balls.length; i++) {
        dominanceMatrix[i] = [];
        for (var j = 0; j < balls.length; j++) {
            if (i === j) {
                dominanceMatrix[i][j] = false;
            }
            else {
                var dominates = itemDominates(balls[i], balls[j]);
                dominanceMatrix[i][j] = dominates;
                if (dominates) {
                    hasAnyDominance = true;
                }
            }
        }
    }
    // Hard: No dominance relationships exist
    if (!hasAnyDominance) {
        return 'hard';
    }
    // Check if every pair has a dominance relationship (Easy)
    var allPairsHaveDominance = true;
    for (var i = 0; i < balls.length; i++) {
        for (var j = i + 1; j < balls.length; j++) {
            var iDominatesJ = dominanceMatrix[i][j];
            var jDominatesI = dominanceMatrix[j][i];
            if (!iDominatesJ && !jDominatesI) {
                allPairsHaveDominance = false;
                break;
            }
        }
        if (!allPairsHaveDominance)
            break;
    }
    if (allPairsHaveDominance) {
        return 'easy';
    }
    // Medium: Check for maximal and minimal elements
    // Maximal: dominates all other balls
    // Minimal: dominated by all other balls
    var hasMaximal = false;
    var hasMinimal = false;
    for (var i = 0; i < balls.length; i++) {
        // Check if ball i is maximal (dominates all others)
        var dominatesAll = true;
        for (var j = 0; j < balls.length; j++) {
            if (i !== j && !dominanceMatrix[i][j]) {
                dominatesAll = false;
                break;
            }
        }
        if (dominatesAll) {
            hasMaximal = true;
        }
        // Check if ball i is minimal (dominated by all others)
        var dominatedByAll = true;
        for (var j = 0; j < balls.length; j++) {
            if (i !== j && !dominanceMatrix[j][i]) {
                dominatedByAll = false;
                break;
            }
        }
        if (dominatedByAll) {
            hasMinimal = true;
        }
    }
    // Medium: has both maximal and minimal elements
    if (hasMaximal && hasMinimal) {
        return 'medium';
    }
    // Default to hard if we can't classify as easy or medium
    return 'hard';
}
/**
 * Remove dominated items
 */
function removeDominatedItems(items) {
    var filtered = [];
    for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
        var item = items_1[_i];
        var isDominated = false;
        for (var _a = 0, items_2 = items; _a < items_2.length; _a++) {
            var other = items_2[_a];
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
        filtered: filtered,
        removedCount: items.length - filtered.length
    };
}
/**
 * Analyze difficulty
 */
function analyzeDifficulty(items, capacity, solution) {
    var removedCount = removeDominatedItems(items).removedCount;
    var dominanceCount = removedCount;
    var totalWeight = items.reduce(function (sum, item) { return sum + item.weight; }, 0);
    var slackRatio = capacity / totalWeight;
    var densities = items.map(function (item) { return item.reward / item.weight; });
    var avgDensity = densities.reduce(function (sum, d) { return sum + d; }, 0) / densities.length;
    var densityVariance = densities.reduce(function (sum, d) { return sum + Math.pow(d - avgDensity, 2); }, 0) / densities.length;
    var optimal = solveKnapsack(items, capacity);
    var secondBestReward = 0;
    var optimalSet = new Set(solution);
    var maxCombinations = Math.min(1 << items.length, 1024);
    for (var mask = 0; mask < maxCombinations; mask++) {
        var combination = [];
        var totalWeight_1 = 0;
        var totalReward = 0;
        for (var i = 0; i < items.length; i++) {
            if (mask & (1 << i)) {
                combination.push(items[i].id);
                totalWeight_1 += items[i].weight;
                totalReward += items[i].reward;
            }
        }
        if (totalWeight_1 > capacity)
            continue;
        if (combination.length === optimalSet.size &&
            combination.every(function (id) { return optimalSet.has(id); }))
            continue;
        secondBestReward = Math.max(secondBestReward, totalReward);
    }
    var optimalityGap = optimal.maxReward - secondBestReward;
    return {
        dominanceCount: dominanceCount,
        slackRatio: slackRatio,
        optimalityGap: optimalityGap,
        densityVariance: densityVariance
    };
}
/**
 * Create dominance pattern
 * Now uses NUM_BALLS constant instead of config.numItems
 */
function createDominancePattern(config, dominanceType, rng) {
    var items = [];
    // Create a randomized base for the lowest weight and highest reward
    // to avoid hardcoding the exact same boundary values every time.
    var wRange = config.maxWeight - config.minWeight;
    var rRange = config.maxReward - config.minReward;
    // Allow wider starting points if the range permits
    var baseWeightOffset = rng.range(0, Math.max(1, Math.floor(wRange / 2)));
    var baseRewardOffset = rng.range(0, Math.max(1, Math.floor(rRange / 2)));
    var baseWeight = config.minWeight + baseWeightOffset;
    var baseReward = config.maxReward - baseRewardOffset;
    switch (dominanceType) {
        case 'full':
            // Create fully dominated chain with some randomness for variety
            for (var i = 0; i < config_1.NUM_BALLS; i++) {
                // Add random variation to weights and rewards while maintaining dominance
                var weightStep = rng.range(1, 2);
                var rewardStep = rng.range(2, 4);
                // We accumulate the steps to ensure strict monotonic properties 
                // rather than just multiplying by 'i' which creates rigid lines
                var prevWeight = i > 0 ? items[i - 1].weight : baseWeight - weightStep;
                var prevReward = i > 0 ? items[i - 1].reward : baseReward + rewardStep;
                items.push({
                    id: i + 1,
                    weight: Math.min(config.maxWeight, prevWeight + weightStep),
                    reward: Math.max(config.minReward, prevReward - rewardStep),
                    color: BALL_COLORS[i % BALL_COLORS.length]
                });
            }
            break;
        case 'partial':
            for (var i = 0; i < config_1.NUM_BALLS; i++) {
                var weight = void 0;
                var reward = void 0;
                if (i < Math.floor(config_1.NUM_BALLS / 2)) {
                    // One half forms a dominance chain
                    var weightStep = rng.range(1, 3);
                    var rewardStep = rng.range(1, 3);
                    var prevWeight = i > 0 ? items[i - 1].weight : baseWeight - weightStep;
                    var prevReward = i > 0 ? items[i - 1].reward : baseReward + rewardStep;
                    weight = Math.min(config.maxWeight, prevWeight + weightStep);
                    reward = Math.max(config.minReward, prevReward - rewardStep);
                }
                else {
                    // Other half is completely random within constraints
                    weight = rng.range(config.minWeight, config.maxWeight);
                    reward = rng.range(config.minReward, config.maxReward);
                }
                items.push({
                    id: i + 1,
                    weight: weight,
                    reward: reward,
                    color: BALL_COLORS[i % BALL_COLORS.length]
                });
            }
            break;
        case 'none':
            for (var i = 0; i < config_1.NUM_BALLS; i++) {
                items.push({
                    id: i + 1,
                    weight: rng.range(config.minWeight, config.maxWeight),
                    reward: rng.range(config.minReward, config.maxReward),
                    color: BALL_COLORS[i % BALL_COLORS.length]
                });
            }
            break;
    }
    return items;
}
/**
 * Adjust capacity
 */
function adjustCapacityForSlackRatio(items, targetSlackRatio, rng) {
    var totalWeight = items.reduce(function (sum, item) { return sum + item.weight; }, 0);
    if (targetSlackRatio) {
        return Math.floor(totalWeight * targetSlackRatio);
    }
    // Add some randomness to capacity for more variety (0.6 to 0.8)
    var slackRatio = rng ? 0.6 + rng.next() * 0.2 : 0.7;
    return Math.floor(totalWeight * slackRatio);
}
/**
 * Generate a single knapsack question
 * Now classifies difficulty using Leo's definition instead of config.difficultyLevel
 */
function generateKnapsackQuestion(id, config, phase, seed, targetDifficulty) {
    var rng = new SeededRandom(seed + id);
    var maxAttempts = 200; // Increased attempts to find questions matching target difficulty
    var attempts = 0;
    while (attempts < maxAttempts) {
        attempts++;
        // Try different dominance patterns to generate variety
        // We'll classify after generation, so try different patterns
        var patternTypes = ['full', 'partial', 'none'];
        var dominanceType = patternTypes[attempts % patternTypes.length];
        var items = createDominancePattern(config, dominanceType, rng);
        // Ensure we have exactly NUM_BALLS items
        if (items.length !== config_1.NUM_BALLS) {
            continue;
        }
        var capacity = adjustCapacityForSlackRatio(items, config.targetSlackRatio, rng);
        var solution = solveKnapsack(items, capacity);
        if (solution.solution.length === 0) {
            continue;
        }
        // Classify difficulty using Leo's definition
        var classifiedDifficulty = classifyDifficultyByDominance(items);
        // If target difficulty is specified, only accept questions matching it
        if (targetDifficulty && classifiedDifficulty !== targetDifficulty) {
            continue;
        }
        var metadata = analyzeDifficulty(items, capacity, solution.solution);
        var explanation = "The optimal selection maximizes reward (".concat(solution.maxReward, ") while staying within capacity (").concat(solution.solutionWeight, "/").concat(capacity, ").");
        return {
            id: id,
            capacity: capacity,
            balls: items,
            solution: solution.solution,
            explanation: explanation,
            difficulty: classifiedDifficulty, // Use classified difficulty, not config
            phase: phase,
            metadata: metadata
        };
    }
    return null;
}
/**
 * Configuration for each phase and difficulty
 * Note: numItems is now always NUM_BALLS, but we keep different weight/reward ranges for variety
 */
var PHASE_CONFIGS = {
    training: {
        easy: { numItems: config_1.NUM_BALLS, minWeight: 2, maxWeight: 8, minReward: 8, maxReward: 24 },
        medium: { numItems: config_1.NUM_BALLS, minWeight: 3, maxWeight: 10, minReward: 10, maxReward: 30 },
        hard: { numItems: config_1.NUM_BALLS, minWeight: 4, maxWeight: 12, minReward: 12, maxReward: 36 }
    },
    benchmark: {
        easy: { numItems: config_1.NUM_BALLS, minWeight: 3, maxWeight: 10, minReward: 10, maxReward: 30 },
        medium: { numItems: config_1.NUM_BALLS, minWeight: 4, maxWeight: 12, minReward: 12, maxReward: 36 },
        hard: { numItems: config_1.NUM_BALLS, minWeight: 5, maxWeight: 15, minReward: 15, maxReward: 45 }
    },
    prediction: {
        easy: { numItems: config_1.NUM_BALLS, minWeight: 4, maxWeight: 12, minReward: 12, maxReward: 36 },
        medium: { numItems: config_1.NUM_BALLS, minWeight: 5, maxWeight: 14, minReward: 14, maxReward: 42 },
        hard: { numItems: config_1.NUM_BALLS, minWeight: 5, maxWeight: 15, minReward: 15, maxReward: 45 }
    }
};
/**
 * Generate question hash for duplicate detection
 */
function getQuestionHash(question) {
    // Create a hash based on capacity and sorted balls (by weight and reward)
    var sortedBalls = __spreadArray([], question.balls, true).sort(function (a, b) { return a.weight - b.weight || a.reward - b.reward; })
        .map(function (b) { return "".concat(b.weight, "-").concat(b.reward); })
        .join(',');
    return "".concat(question.capacity, ":").concat(sortedBalls);
}
/**
 * Remove duplicate questions
 */
function removeDuplicates(questions) {
    var seen = new Set();
    var unique = [];
    for (var _i = 0, questions_1 = questions; _i < questions_1.length; _i++) {
        var question = questions_1[_i];
        var hash = getQuestionHash(question);
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
    var allQuestions = [];
    var questionId = 1;
    // Generate questions for each phase and difficulty
    var phases = ['training', 'benchmark', 'prediction'];
    var difficulties = ['easy', 'medium', 'hard'];
    // Generate a larger number of questions to ensure variety after deduplication
    var questionsPerCombination = 100; // Generate 100 questions per phase-difficulty combo
    for (var _i = 0, phases_1 = phases; _i < phases_1.length; _i++) {
        var phase = phases_1[_i];
        console.log("\uD83D\uDCCB Generating questions for ".concat(phase.toUpperCase(), " phase..."));
        for (var _a = 0, difficulties_1 = difficulties; _a < difficulties_1.length; _a++) {
            var difficulty = difficulties_1[_a];
            console.log("  \u2699\uFE0F  Difficulty: ".concat(difficulty, "..."));
            var baseConfig = PHASE_CONFIGS[phase][difficulty];
            var successCount = 0;
            var seed = 10000 + Math.random() * 100000; // Random starting seed
            for (var i = 0; i < questionsPerCombination; i++) {
                var config = __assign(__assign({}, baseConfig), { difficultyLevel: difficulty, ensureUniqueSolution: false // Allow more variety
                 });
                var question = generateKnapsackQuestion(questionId++, config, phase, seed + i * 1000, difficulty // Target difficulty - will filter to match
                );
                if (question) {
                    // Verify the question has exactly NUM_BALLS
                    if (question.balls.length === config_1.NUM_BALLS) {
                        allQuestions.push(question);
                        successCount++;
                    }
                }
            }
            console.log("    \u2705 Generated ".concat(successCount, " questions"));
        }
    }
    console.log("\n\uD83D\uDCCA Total questions generated: ".concat(allQuestions.length));
    // Remove duplicates
    console.log('\n🔍 Removing duplicates...');
    var uniqueQuestions = removeDuplicates(allQuestions);
    console.log("\u2728 Unique questions after deduplication: ".concat(uniqueQuestions.length));
    console.log("\uD83D\uDDD1\uFE0F  Removed ".concat(allQuestions.length - uniqueQuestions.length, " duplicates"));
    // Filter to ensure all questions have exactly NUM_BALLS
    var filteredQuestions = uniqueQuestions.filter(function (q) { return q.balls.length === config_1.NUM_BALLS; });
    console.log("\uD83D\uDD22 Questions with exactly ".concat(config_1.NUM_BALLS, " balls: ").concat(filteredQuestions.length));
    // Re-assign sequential IDs
    filteredQuestions.forEach(function (q, index) {
        q.id = index + 1;
    });
    // Generate statistics
    console.log('\n📈 Statistics:');
    var stats = {};
    var _loop_1 = function (phase) {
        stats[phase] = { easy: 0, medium: 0, hard: 0 };
        var _loop_2 = function (difficulty) {
            var count = filteredQuestions.filter(function (q) { return q.phase === phase && q.difficulty === difficulty; }).length;
            stats[phase][difficulty] = count;
        };
        for (var _d = 0, difficulties_2 = difficulties; _d < difficulties_2.length; _d++) {
            var difficulty = difficulties_2[_d];
            _loop_2(difficulty);
        }
    };
    for (var _b = 0, phases_2 = phases; _b < phases_2.length; _b++) {
        var phase = phases_2[_b];
        _loop_1(phase);
    }
    for (var _c = 0, phases_3 = phases; _c < phases_3.length; _c++) {
        var phase = phases_3[_c];
        console.log("\n  ".concat(phase.toUpperCase(), ":"));
        console.log("    Easy: ".concat(stats[phase].easy));
        console.log("    Medium: ".concat(stats[phase].medium));
        console.log("    Hard: ".concat(stats[phase].hard));
        console.log("    Total: ".concat(stats[phase].easy + stats[phase].medium + stats[phase].hard));
    }
    // Save to JSON file
    var outputPath = './lib/static-questions.json';
    var output = {
        metadata: {
            generatedAt: new Date().toISOString(),
            totalQuestions: filteredQuestions.length,
            numBalls: config_1.NUM_BALLS,
            statistics: stats,
            version: '2.0.0'
        },
        questions: filteredQuestions
    };
    (0, fs_1.writeFileSync)(outputPath, JSON.stringify(output, null, 2));
    console.log("\n\uD83D\uDCBE Questions saved to: ".concat(outputPath));
    console.log('✅ Done!\n');
}
// Run the generator
generateStaticQuestions();
