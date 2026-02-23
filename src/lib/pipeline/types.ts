export type TaskType =
  | "pdf_extract"
  | "page_classify"
  | "topic_extract"
  | "quiz_generate"
  | "answer_eval";

export type EffortLevel = "low" | "medium" | "high";

export interface ConfidenceMetadata {
  noiseRatio: number;
  duplicateRatio: number;
  nonEnglishRatio: number;
  ocrArtifactScore: number;
}

export interface EffortClassification {
  effort: EffortLevel;
  score: number;
  features: {
    noiseRatio: number;
    duplicateRatio: number;
    nonEnglishRatio: number;
    ocrArtifactScore: number;
    taskCriticality: number;
  };
}

export interface ResolvedModelConfig {
  modelId: string;
  temperature: number;
  source: "task-env" | "global-env" | "default";
}

export interface ProcessRequest {
  task: TaskType;
  contents: Array<Record<string, unknown>>;
  systemInstruction?: string;
  responseMimeType?: string;
  documentId?: string;
  quizId?: string;
  userId?: string;
}

export interface ProcessOptions {
  effort?: EffortLevel;
  confidenceMetadata?: ConfidenceMetadata;
  temperature?: number;
}

export interface ProcessResponse {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    thinkingTokens: number;
  };
  modelId: string;
  effort: EffortLevel;
  latencyMs: number;
}

export interface TelemetryRecord {
  taskType: TaskType;
  modelId: string;
  effort: EffortLevel;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  estimatedCostUsd: number | null;
  latencyMs: number;
  status: "success" | "error";
  errorMessage?: string;
  pricingVersion: string;
  documentId?: string;
  quizId?: string;
  userId?: string;
}

export interface DocumentCleanupResult {
  pages: CleanedPage[];
  confidenceMetadata: ConfidenceMetadata;
  stats: CleanupStats;
}

export interface CleanedPage {
  pageNumber: number;
  content: string;
  originalCharCount: number;
  cleanedCharCount: number;
}

export interface CleanupStats {
  totalPages: number;
  headersDetected: string[];
  footersDetected: string[];
  duplicateLinesRemoved: number;
  boilerplateLinesRemoved: number;
  pagesFilteredByLanguage: number;
}
