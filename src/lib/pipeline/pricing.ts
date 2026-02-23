export const PRICING_VERSION = "v1";

interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "gemini-2.5-flash-lite-preview-09-2025": {
    inputPer1M: 0.1,
    outputPer1M: 0.4,
  },
  "gemini-2.5-flash": {
    inputPer1M: 0.3,
    outputPer1M: 2.5,
  },
  "gemini-3-flash-preview": {
    inputPer1M: 0.5,
    outputPer1M: 3.0,
  },
};

/**
 * Estimate USD cost for a model call.
 * Returns null if the model is not in the pricing map.
 */
export function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return null;

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;

  return inputCost + outputCost;
}
