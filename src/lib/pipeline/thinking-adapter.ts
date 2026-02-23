import type { EffortLevel } from "./types";

const GEMINI_25_BUDGETS: Record<EffortLevel, number> = {
  low: 1024,
  medium: 4096,
  high: 8192,
};

/**
 * Build thinking config based on model generation and effort level.
 * Returns undefined for unknown model families (omit safely).
 */
export function buildThinkingConfig(
  modelId: string,
  effort: EffortLevel
): Record<string, unknown> | undefined {
  // Gemini 3.x → thinkingLevel
  if (modelId.startsWith("gemini-3")) {
    return {
      thinkingConfig: {
        thinkingLevel: effort,
      },
    };
  }

  // Gemini 2.5.x → thinkingBudget
  if (modelId.startsWith("gemini-2.5")) {
    return {
      thinkingConfig: {
        thinkingBudget: GEMINI_25_BUDGETS[effort],
      },
    };
  }

  // Unknown model family → omit thinking config
  return undefined;
}
