import type {
  TaskType,
  EffortLevel,
  EffortClassification,
  ConfidenceMetadata,
} from "./types";

const TASK_CRITICALITY: Record<TaskType, number> = {
  quiz_generate: 0.8,
  answer_eval: 0.7,
  topic_extract: 0.4,
  pdf_extract: 0.3,
  page_classify: 0.2,
};

const FEATURE_WEIGHTS = {
  noiseRatio: 0.2,
  duplicateRatio: 0.15,
  nonEnglishRatio: 0.15,
  ocrArtifactScore: 0.2,
  taskCriticality: 0.3,
};

/**
 * Classify effort level from text or pre-computed metadata.
 */
export function classifyEffort(
  rawText: string,
  taskType: TaskType,
  metadata?: ConfidenceMetadata
): EffortClassification {
  const features = metadata
    ? {
        noiseRatio: metadata.noiseRatio,
        duplicateRatio: metadata.duplicateRatio,
        nonEnglishRatio: metadata.nonEnglishRatio,
        ocrArtifactScore: metadata.ocrArtifactScore,
        taskCriticality: TASK_CRITICALITY[taskType],
      }
    : {
        noiseRatio: computeNoiseRatio(rawText),
        duplicateRatio: computeDuplicateRatio(rawText),
        nonEnglishRatio: computeNonEnglishRatio(rawText),
        ocrArtifactScore: computeOcrScore(rawText),
        taskCriticality: TASK_CRITICALITY[taskType],
      };

  const score =
    features.noiseRatio * FEATURE_WEIGHTS.noiseRatio +
    features.duplicateRatio * FEATURE_WEIGHTS.duplicateRatio +
    features.nonEnglishRatio * FEATURE_WEIGHTS.nonEnglishRatio +
    features.ocrArtifactScore * FEATURE_WEIGHTS.ocrArtifactScore +
    features.taskCriticality * FEATURE_WEIGHTS.taskCriticality;

  let effort: EffortLevel;
  if (score < 0.35) {
    effort = "low";
  } else if (score < 0.65) {
    effort = "medium";
  } else {
    effort = "high";
  }

  return { effort, score, features };
}

function computeNoiseRatio(text: string): number {
  if (text.length === 0) return 0;
  const noiseChars = text.replace(/[\w\s.,;:!?'"()\-]/g, "").length;
  return noiseChars / text.length;
}

function computeDuplicateRatio(text: string): number {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return 0;

  const counts = new Map<string, number>();
  for (const line of lines) {
    counts.set(line, (counts.get(line) || 0) + 1);
  }

  const duplicates = [...counts.values()]
    .filter((c) => c >= 3)
    .reduce((sum, c) => sum + c, 0);

  return duplicates / lines.length;
}

function computeNonEnglishRatio(text: string): number {
  const chars = text.replace(/\s/g, "");
  if (chars.length === 0) return 0;
  const latinChars = chars.replace(/[^\x20-\x7E]/g, "").length;
  return 1 - latinChars / chars.length;
}

function computeOcrScore(text: string): number {
  if (text.length === 0) return 0;
  let score = 0;

  const pipes = (text.match(/\|/g) || []).length;
  score += Math.min(pipes / text.length, 0.1) * 3;

  const brokenWords = (text.match(/\b\w\s\w\s\w\b/g) || []).length;
  score +=
    Math.min(brokenWords / Math.max(text.split(/\s+/).length, 1), 0.1) * 3;

  return Math.min(score, 1);
}
