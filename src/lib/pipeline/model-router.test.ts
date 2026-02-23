import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveModel } from "./model-router";

describe("resolveModel", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubEnv("GEMINI_MODEL", "");
    vi.stubEnv("GEMINI_MODEL_PDF_EXTRACT", "");
    vi.stubEnv("GEMINI_MODEL_PAGE_CLASSIFY", "");
    vi.stubEnv("GEMINI_MODEL_TOPIC_EXTRACT", "");
    vi.stubEnv("GEMINI_MODEL_QUIZ_GENERATE", "");
    vi.stubEnv("GEMINI_MODEL_ANSWER_EVAL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns hardcoded default when no env vars set", () => {
    const result = resolveModel("pdf_extract");
    expect(result.modelId).toBe("gemini-2.5-flash");
    expect(result.source).toBe("default");
  });

  it("uses global GEMINI_MODEL when set", () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-3-flash-preview");
    const result = resolveModel("pdf_extract");
    expect(result.modelId).toBe("gemini-3-flash-preview");
    expect(result.source).toBe("global-env");
  });

  it("prefers task-specific env over global", () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-3-flash-preview");
    vi.stubEnv("GEMINI_MODEL_QUIZ_GENERATE", "gemini-2.5-flash-lite-preview-09-2025");
    const result = resolveModel("quiz_generate");
    expect(result.modelId).toBe("gemini-2.5-flash-lite-preview-09-2025");
    expect(result.source).toBe("task-env");
  });

  it("returns correct temperature for quiz_generate", () => {
    const result = resolveModel("quiz_generate");
    expect(result.temperature).toBe(0.3);
  });

  it("returns correct temperature for extraction tasks", () => {
    const result = resolveModel("pdf_extract");
    expect(result.temperature).toBe(0.1);
  });

  it("returns correct temperature for classification tasks", () => {
    const result = resolveModel("page_classify");
    expect(result.temperature).toBe(0.1);
  });
});
