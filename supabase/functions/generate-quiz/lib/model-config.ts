type EffortLevel = "low" | "medium" | "high";

const TASK_DEFAULTS: Record<string, string> = {
  quiz_generate: "gemini-3-flash-preview",
};

const TASK_TEMPERATURES: Record<string, number> = {
  quiz_generate: 0.3,
};

const DEFAULT_FALLBACK_MODELS = ["gemini-2.5-flash"];

const GEMINI_25_BUDGETS: Record<EffortLevel, number> = {
  low: 1024,
  medium: 4096,
  high: 8192,
};

export function resolveModel(task: string): { modelId: string; temperature: number } {
  const taskEnvMap: Record<string, string> = {
    quiz_generate: "GEMINI_MODEL_QUIZ_GENERATE",
  };

  const taskEnv = Deno.env.get(taskEnvMap[task] ?? "");
  if (taskEnv) {
    return { modelId: taskEnv, temperature: TASK_TEMPERATURES[task] ?? 0.3 };
  }

  const globalEnv = Deno.env.get("GEMINI_MODEL");
  if (globalEnv) {
    return { modelId: globalEnv, temperature: TASK_TEMPERATURES[task] ?? 0.3 };
  }

  return {
    modelId: TASK_DEFAULTS[task] ?? "gemini-3-flash-preview",
    temperature: TASK_TEMPERATURES[task] ?? 0.3,
  };
}

export function getFallbackModels(task: string): string[] {
  const primary = resolveModel(task).modelId;
  const fallbackEnv = Deno.env.get("GEMINI_FALLBACK_MODELS");
  const fallbacks = fallbackEnv
    ? fallbackEnv.split(",").map((m) => m.trim()).filter(Boolean)
    : DEFAULT_FALLBACK_MODELS;

  return [primary, ...fallbacks.filter((m) => m !== primary)];
}

export function buildThinkingConfig(
  modelId: string,
  effort: EffortLevel,
): Record<string, unknown> | undefined {
  if (modelId.startsWith("gemini-3")) {
    return { thinkingConfig: { thinkingLevel: effort } };
  }
  if (modelId.startsWith("gemini-2.5")) {
    return { thinkingConfig: { thinkingBudget: GEMINI_25_BUDGETS[effort] } };
  }
  return undefined;
}
