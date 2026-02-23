import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TelemetryRecord } from "./types";
import { estimateCost } from "./pricing";
import { PRICING_VERSION } from "./pricing";

// Use untyped client for telemetry — this is a service-role fire-and-forget insert
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient | null {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  supabaseAdmin = createClient(url, serviceKey);
  return supabaseAdmin;
}

export interface TelemetryInput {
  taskType: TelemetryRecord["taskType"];
  modelId: string;
  effort: TelemetryRecord["effort"];
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  latencyMs: number;
  status: "success" | "error";
  errorMessage?: string;
  documentId?: string;
  quizId?: string;
  userId?: string;
  attemptNumber?: number;
}

/**
 * Fire-and-forget telemetry logger. Never throws.
 */
export async function logTelemetry(input: TelemetryInput): Promise<void> {
  try {
    const client = getSupabaseAdmin();
    if (!client) return;

    const cost = estimateCost(input.modelId, input.inputTokens, input.outputTokens);

    await client.from("llm_telemetry").insert({
      task_type: input.taskType,
      model_id: input.modelId,
      effort: input.effort,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      thinking_tokens: input.thinkingTokens,
      estimated_cost_usd: cost,
      latency_ms: input.latencyMs,
      status: input.status,
      error_message: input.errorMessage || null,
      pricing_version: PRICING_VERSION,
      document_id: input.documentId || null,
      quiz_id: input.quizId || null,
      user_id: input.userId || null,
      attempt_number: input.attemptNumber ?? 1,
    });
  } catch {
    // Fire-and-forget: never let telemetry break the pipeline
  }
}
