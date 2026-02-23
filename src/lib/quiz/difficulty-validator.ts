interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

interface ValidationResult {
  valid: boolean;
  actual: DifficultyDistribution;
  target: DifficultyDistribution;
}

const TARGET_DISTRIBUTIONS: Record<string, DifficultyDistribution> = {
  easy: { easy: 60, medium: 30, hard: 10 },
  hard: { easy: 10, medium: 30, hard: 60 },
};

/**
 * Validate that the generated questions roughly match the target difficulty distribution.
 * Returns actual percentages per bucket and whether they're within tolerance.
 */
export function validateDifficultyDistribution(
  questions: Array<{ difficulty: "easy" | "medium" | "hard" }>,
  targetDifficulty: "easy" | "mixed" | "hard",
  tolerance = 15,
): ValidationResult {
  const total = questions.length;
  if (total === 0) {
    return {
      valid: true,
      actual: { easy: 0, medium: 0, hard: 0 },
      target: { easy: 33, medium: 34, hard: 33 },
    };
  }

  const counts = { easy: 0, medium: 0, hard: 0 };
  for (const q of questions) {
    counts[q.difficulty]++;
  }

  const actual: DifficultyDistribution = {
    easy: Math.round((counts.easy / total) * 100),
    medium: Math.round((counts.medium / total) * 100),
    hard: Math.round((counts.hard / total) * 100),
  };

  // For "mixed", we use the mode defaults — no enforcement needed
  if (targetDifficulty === "mixed" || !TARGET_DISTRIBUTIONS[targetDifficulty]) {
    return { valid: true, actual, target: actual };
  }

  const target = TARGET_DISTRIBUTIONS[targetDifficulty];

  const valid =
    Math.abs(actual.easy - target.easy) <= tolerance &&
    Math.abs(actual.medium - target.medium) <= tolerance &&
    Math.abs(actual.hard - target.hard) <= tolerance;

  return { valid, actual, target };
}
