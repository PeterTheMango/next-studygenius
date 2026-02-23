import type { TaskType, EffortLevel, ResolvedModelConfig } from "./types";

const TASK_ENV_VARS: Record<TaskType, string> = {
  pdf_extract: "GEMINI_MODEL_PDF_EXTRACT",
  page_classify: "GEMINI_MODEL_PAGE_CLASSIFY",
  topic_extract: "GEMINI_MODEL_TOPIC_EXTRACT",
  quiz_generate: "GEMINI_MODEL_QUIZ_GENERATE",
  answer_eval: "GEMINI_MODEL_ANSWER_EVAL",
};

const TASK_DEFAULTS: Record<TaskType, string> = {
  pdf_extract: "gemini-2.5-flash",
  page_classify: "gemini-2.5-flash",
  topic_extract: "gemini-2.5-flash",
  quiz_generate: "gemini-3-flash-preview",
  answer_eval: "gemini-2.5-flash",
};

const TASK_TEMPERATURES: Record<TaskType, number> = {
  pdf_extract: 0.1,
  page_classify: 0.1,
  topic_extract: 0.1,
  quiz_generate: 0.3,
  answer_eval: 0.1,
};

const DEFAULT_FALLBACK_MODELS = ["gemini-2.5-flash"];

/**
 * Resolve which model + temperature to use for a given task.
 * Priority: task-specific env var → GEMINI_MODEL global env → hardcoded default.
 */
export function resolveModel(
  task: TaskType,
  _effort?: EffortLevel
): ResolvedModelConfig {
  // 1. Task-specific env var
  const taskEnv = process.env[TASK_ENV_VARS[task]];
  if (taskEnv) {
    return {
      modelId: taskEnv,
      temperature: TASK_TEMPERATURES[task],
      source: "task-env",
    };
  }

  // 2. Global GEMINI_MODEL env var
  const globalEnv = process.env.GEMINI_MODEL;
  if (globalEnv) {
    return {
      modelId: globalEnv,
      temperature: TASK_TEMPERATURES[task],
      source: "global-env",
    };
  }

  // 3. Hardcoded default
  return {
    modelId: TASK_DEFAULTS[task],
    temperature: TASK_TEMPERATURES[task],
    source: "default",
  };
}

/**
 * Get the ordered list of models to try: [primary, ...fallbacks].
 * Fallback list comes from GEMINI_FALLBACK_MODELS env var (comma-separated),
 * defaulting to ["gemini-2.5-flash"].
 */
export function getFallbackModels(task: TaskType, effort?: EffortLevel): string[] {
  const primary = resolveModel(task, effort).modelId;

  const fallbackEnv = process.env.GEMINI_FALLBACK_MODELS;
  const fallbacks = fallbackEnv
    ? fallbackEnv.split(",").map((m) => m.trim()).filter(Boolean)
    : DEFAULT_FALLBACK_MODELS;

  // Deduplicate: don't retry the same model
  const unique = [primary, ...fallbacks.filter((m) => m !== primary)];
  return unique;
}
