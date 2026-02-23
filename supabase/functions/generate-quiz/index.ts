import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai";
import { getFallbackModels, resolveModel, buildThinkingConfig } from "./lib/model-config.ts";
import { buildPrompt } from "./lib/prompts.ts";

interface RequestPayload {
  quizId: string;
  documentContent: string;
  mode: string;
  settings: {
    questionTypes: string[];
    questionCount?: number;
    difficulty?: string;
    timeLimitPerQuestion?: number;
  };
  userId: string;
  documentId: string;
}

interface GeneratedQuestion {
  type: string;
  topic: string;
  difficulty: string;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  explanation: string;
  hint?: string;
  sourceReference?: string;
  timeEstimate: number;
  matchingPairs?: { left: string; right: string }[];
  orderingItems?: string[];
}

const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gemini-2.5-flash": { inputPer1M: 0.3, outputPer1M: 2.5 },
  "gemini-3-flash-preview": { inputPer1M: 0.5, outputPer1M: 3.0 },
};

function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number | null {
  const p = PRICING[modelId];
  if (!p) return null;
  return (inputTokens / 1_000_000) * p.inputPer1M + (outputTokens / 1_000_000) * p.outputPer1M;
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("resource exhausted") ||
    msg.includes("500") ||
    msg.includes("503") ||
    msg.includes("overloaded")
  );
}

async function updateQuizStatus(
  supabase: ReturnType<typeof createClient>,
  quizId: string,
  updates: Record<string, unknown>,
) {
  await supabase.from("quizzes").update(updates).eq("id", quizId);
}

async function logTelemetry(
  supabase: ReturnType<typeof createClient>,
  data: Record<string, unknown>,
) {
  // Fire-and-forget
  supabase.from("llm_telemetry").insert(data).then(() => {});
}

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Verify service role auth
  const authHeader = req.headers.get("Authorization");
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || !authHeader.includes(expectedKey ?? "MISSING")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { quizId, documentContent, mode, settings, userId, documentId } = payload;

  try {
    // Stage: generating
    await updateQuizStatus(supabase, quizId, {
      status: "generating",
      generation_stage: "generating",
      generation_started_at: new Date().toISOString(),
      error_message: null,
      error_stage: null,
    });

    // Initialize Gemini client
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
    const genAI = new GoogleGenAI({ apiKey });

    // Build prompt
    const prompt = buildPrompt(
      documentContent,
      mode,
      settings.questionCount,
      settings.questionTypes,
      settings.difficulty,
    );

    // Get fallback chain and try each model
    const models = getFallbackModels("quiz_generate");
    let responseText = "";
    let usedModel = models[0];
    let inputTokens = 0;
    let outputTokens = 0;
    let thinkingTokens = 0;

    for (let attempt = 0; attempt < models.length; attempt++) {
      const modelId = models[attempt];
      const startTime = Date.now();

      const { temperature } = resolveModel("quiz_generate");
      const thinkingConfig = buildThinkingConfig(modelId, "medium");

      const config: Record<string, unknown> = {
        temperature,
        responseMimeType: "application/json",
      };
      if (thinkingConfig) Object.assign(config, thinkingConfig);

      try {
        const response = await genAI.models.generateContent({
          model: modelId,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: config as any,
        });

        const latencyMs = Date.now() - startTime;
        const usage = response.usageMetadata;
        inputTokens = usage?.promptTokenCount ?? 0;
        outputTokens = usage?.candidatesTokenCount ?? 0;
        thinkingTokens = (usage as any)?.thoughtsTokenCount ?? 0;

        responseText = response.text ?? "";
        usedModel = modelId;

        // Log success telemetry
        logTelemetry(supabase, {
          task_type: "quiz_generate",
          model_id: modelId,
          effort: "medium",
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          thinking_tokens: thinkingTokens,
          estimated_cost_usd: estimateCost(modelId, inputTokens, outputTokens),
          latency_ms: latencyMs,
          status: "success",
          pricing_version: "v1",
          document_id: documentId,
          quiz_id: quizId,
          user_id: userId,
          attempt_number: attempt + 1,
        });

        break; // Success, exit retry loop
      } catch (error) {
        const latencyMs = Date.now() - startTime;

        // Log error telemetry
        logTelemetry(supabase, {
          task_type: "quiz_generate",
          model_id: modelId,
          effort: "medium",
          input_tokens: 0,
          output_tokens: 0,
          thinking_tokens: 0,
          estimated_cost_usd: null,
          latency_ms: latencyMs,
          status: "error",
          error_message: error instanceof Error ? error.message : "Unknown error",
          pricing_version: "v1",
          document_id: documentId,
          quiz_id: quizId,
          user_id: userId,
          attempt_number: attempt + 1,
        });

        if (!isRetryableError(error) || attempt === models.length - 1) {
          throw error;
        }
        console.warn(`Model ${modelId} failed, trying ${models[attempt + 1]}`);
      }
    }

    if (!responseText.trim()) {
      throw new Error("Empty response from model");
    }

    // Stage: cleaning
    await updateQuizStatus(supabase, quizId, {
      status: "cleaning",
      generation_stage: "cleaning",
    });

    const parsed = JSON.parse(
      responseText.replace(/```json\n?|\n?```/g, "").trim(),
    );

    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error("Model returned no questions");
    }

    const questions: GeneratedQuestion[] = parsed.questions;

    // Strip hints outside learn mode
    if (mode !== "learn") {
      questions.forEach((q) => delete q.hint);
    }

    // Stage: structuring (validate difficulty distribution)
    await updateQuizStatus(supabase, quizId, {
      status: "structuring",
      generation_stage: "structuring",
    });

    // Calculate actual difficulty distribution
    const total = questions.length;
    const counts = { easy: 0, medium: 0, hard: 0 };
    for (const q of questions) {
      const d = q.difficulty as keyof typeof counts;
      if (counts[d] !== undefined) counts[d]++;
    }
    const difficultyDistribution = {
      easy: Math.round((counts.easy / total) * 100),
      medium: Math.round((counts.medium / total) * 100),
      hard: Math.round((counts.hard / total) * 100),
    };

    // Stage: finalizing
    await updateQuizStatus(supabase, quizId, {
      status: "finalizing",
      generation_stage: "finalizing",
    });

    // Insert question records
    const questionRecords = questions.map((q, index) => ({
      quiz_id: quizId,
      type: q.type,
      topic: q.topic,
      difficulty: q.difficulty,
      question_text: q.questionText,
      options:
        q.type === "matching"
          ? q.matchingPairs
          : q.type === "ordering"
          ? q.orderingItems
          : q.options || null,
      correct_answer: q.correctAnswer || "",
      explanation: q.explanation,
      hint: q.hint || null,
      source_reference: q.sourceReference || null,
      time_estimate: q.timeEstimate || 30,
      order_index: index,
    }));

    const { error: insertError } = await supabase
      .from("questions")
      .insert(questionRecords);

    if (insertError) {
      throw new Error(`Failed to insert questions: ${insertError.message}`);
    }

    // Build final settings update
    const updatedSettings: Record<string, unknown> = { ...settings };
    if (settings.timeLimitPerQuestion) {
      updatedSettings.timeLimit = questions.length * settings.timeLimitPerQuestion;
    }
    updatedSettings.questionCount = questions.length;

    // Mark as ready
    await updateQuizStatus(supabase, quizId, {
      status: "ready",
      generation_stage: null,
      question_count: questions.length,
      difficulty_distribution: difficultyDistribution,
      generation_completed_at: new Date().toISOString(),
      settings: updatedSettings,
    });

    return new Response(
      JSON.stringify({ success: true, questionCount: questions.length }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Quiz generation failed:", errorMessage);

    // Determine which stage failed
    const { data: currentQuiz } = await supabase
      .from("quizzes")
      .select("generation_stage")
      .eq("id", quizId)
      .single();

    await updateQuizStatus(supabase, quizId, {
      status: "failed",
      error_message: errorMessage,
      error_stage: currentQuiz?.generation_stage || "generating",
    });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
