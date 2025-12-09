/**
 * Shuffle Utility Functions
 *
 * Provides seeded random number generation and Fisher-Yates shuffle algorithm
 * for consistent, reproducible shuffling of questions and options.
 */

/**
 * Simple seeded random number generator (Mulberry32)
 * Returns a function that generates deterministic pseudo-random numbers
 */
function createSeededRandom(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Generate a numeric seed from a string
 */
export function generateSeedFromString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Fisher-Yates shuffle algorithm with seeded randomness
 * Shuffles array in place and returns it
 */
export function seededShuffle<T>(array: T[], seed: number): T[] {
  const random = createSeededRandom(seed);
  const shuffled = [...array]; // Create a copy to avoid mutation

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Shuffle an array of questions by their IDs
 * Returns an array of question IDs in shuffled order
 */
export function shuffleQuestions(
  questions: Array<{ id: string }>,
  attemptId: string
): string[] {
  // Generate seed from attempt ID and timestamp
  const seed = generateSeedFromString(attemptId + Date.now().toString());

  // Extract IDs
  const questionIds = questions.map(q => q.id);

  // Shuffle and return
  return seededShuffle(questionIds, seed);
}

/**
 * Generate option shuffle seeds for each question
 * Returns a map of question IDs to their shuffle seeds
 */
export function generateOptionSeeds(
  questions: Array<{ id: string }>,
  attemptId: string
): Record<string, number> {
  const seeds: Record<string, number> = {};

  questions.forEach((question, index) => {
    // Generate unique seed for each question's options
    const seedString = `${attemptId}-${question.id}-${index}`;
    seeds[question.id] = generateSeedFromString(seedString);
  });

  return seeds;
}

/**
 * Apply shuffled order to questions array
 * Returns questions in the order specified by questionOrder
 */
export function applyQuestionOrder<T extends { id: string }>(
  questions: T[],
  questionOrder: string[]
): T[] {
  // Create a map for O(1) lookup
  const questionMap = new Map(questions.map(q => [q.id, q]));

  // Return questions in the specified order
  return questionOrder
    .map(id => questionMap.get(id))
    .filter((q): q is T => q !== undefined);
}

/**
 * Shuffle multiple choice options for a question
 */
export function shuffleOptions(options: string[], seed: number): string[] {
  return seededShuffle(options, seed);
}
