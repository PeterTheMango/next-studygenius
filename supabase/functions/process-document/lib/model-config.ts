type EffortLevel = "low" | "medium" | "high";

const TASK_DEFAULTS: Record<string, string> = {
  pdf_extract: "gemini-2.5-flash",
  page_classify: "gemini-2.5-flash",
  topic_extract: "gemini-2.5-flash",
};

const TASK_TEMPERATURES: Record<string, number> = {
  pdf_extract: 0.1,
  page_classify: 0.2,
  topic_extract: 0.3,
};

const DEFAULT_FALLBACK_MODELS = ["gemini-2.5-flash"];

const GEMINI_25_BUDGETS: Record<EffortLevel, number> = {
  low: 1024,
  medium: 4096,
  high: 8192,
};

export function resolveModel(task: string): { modelId: string; temperature: number } {
  const taskEnvMap: Record<string, string> = {
    pdf_extract: "GEMINI_MODEL_PDF_EXTRACT",
    page_classify: "GEMINI_MODEL_PAGE_CLASSIFY",
    topic_extract: "GEMINI_MODEL_TOPIC_EXTRACT",
  };

  const taskEnv = Deno.env.get(taskEnvMap[task] ?? "");
  if (taskEnv) {
    return { modelId: taskEnv, temperature: TASK_TEMPERATURES[task] ?? 0.2 };
  }

  const globalEnv = Deno.env.get("GEMINI_MODEL");
  if (globalEnv) {
    return { modelId: globalEnv, temperature: TASK_TEMPERATURES[task] ?? 0.2 };
  }

  return {
    modelId: TASK_DEFAULTS[task] ?? "gemini-2.5-flash",
    temperature: TASK_TEMPERATURES[task] ?? 0.2,
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
