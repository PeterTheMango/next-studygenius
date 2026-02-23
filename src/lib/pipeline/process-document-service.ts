import { genAI } from "../gemini/client";
import { resolveModel, getFallbackModels } from "./model-router";
import { classifyEffort } from "./effort-classifier";
import { buildThinkingConfig } from "./thinking-adapter";
import { logTelemetry } from "./telemetry";
import type {
  ProcessRequest,
  ProcessOptions,
  ProcessResponse,
} from "./types";

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  // Rate-limit (429), server errors (500/503)
  return (
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("resource exhausted") ||
    msg.includes("500") ||
    msg.includes("503") ||
    msg.includes("internal server error") ||
    msg.includes("service unavailable") ||
    msg.includes("overloaded")
  );
}

/**
 * Central orchestrator for all LLM calls.
 * Handles model routing, thinking config, telemetry, fallback chain, and error tracking.
 */
export async function processDocument(
  request: ProcessRequest,
  options?: ProcessOptions
): Promise<ProcessResponse> {
  // 1. Classify effort
  const rawText = request.contents
    .map((c) => (c as { text?: string }).text || "")
    .join("\n");

  const effortResult = options?.effort
    ? { effort: options.effort, score: 0, features: {} as any }
    : classifyEffort(rawText, request.task, options?.confidenceMetadata);

  const effort = effortResult.effort;

  // 2. Get fallback model chain
  const models = getFallbackModels(request.task, effort);

  let lastError: unknown;

  for (let attempt = 0; attempt < models.length; attempt++) {
    const modelId = models[attempt];
    const startTime = Date.now();

    // 3. Build thinking config for this model
    const thinkingConfig = buildThinkingConfig(modelId, effort);
    const primaryConfig = resolveModel(request.task, effort);

    // 4. Build generateContent config
    const config: Record<string, unknown> = {
      temperature: options?.temperature ?? primaryConfig.temperature,
    };

    if (request.responseMimeType) {
      config.responseMimeType = request.responseMimeType;
    }

    if (thinkingConfig) {
      Object.assign(config, thinkingConfig);
    }

    try {
      // 5. Call Gemini
      const response = await genAI.models.generateContent({
        model: modelId,
        contents: request.contents as any,
        config: config as any,
      });

      const latencyMs = Date.now() - startTime;

      // 6. Extract token usage
      const usage = response.usageMetadata;
      const inputTokens = usage?.promptTokenCount ?? 0;
      const outputTokens = usage?.candidatesTokenCount ?? 0;
      const thinkingTokens = (usage as any)?.thoughtsTokenCount ?? 0;

      // 7. Fire-and-forget telemetry
      logTelemetry({
        taskType: request.task,
        modelId,
        effort,
        inputTokens,
        outputTokens,
        thinkingTokens,
        latencyMs,
        status: "success",
        documentId: request.documentId,
        quizId: request.quizId,
        userId: request.userId,
        attemptNumber: attempt + 1,
      });

      return {
        text: response.text || "",
        usage: { inputTokens, outputTokens, thinkingTokens },
        modelId,
        effort,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      lastError = error;

      // Log error telemetry for this attempt
      logTelemetry({
        taskType: request.task,
        modelId,
        effort,
        inputTokens: 0,
        outputTokens: 0,
        thinkingTokens: 0,
        latencyMs,
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Unknown error",
        documentId: request.documentId,
        quizId: request.quizId,
        userId: request.userId,
        attemptNumber: attempt + 1,
      });

      // Only retry on rate-limit / server errors, and only if there are more models
      if (!isRetryableError(error) || attempt === models.length - 1) {
        throw error;
      }

      console.warn(
        `Model ${modelId} failed (attempt ${attempt + 1}), falling back to ${models[attempt + 1]}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  // Should not reach here, but just in case
  throw lastError;
}
