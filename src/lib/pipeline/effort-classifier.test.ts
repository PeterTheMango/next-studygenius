import { describe, it, expect } from "vitest";
import { classifyEffort } from "./effort-classifier";

describe("classifyEffort", () => {
  it("classifies clean English text with low-criticality task as low effort", () => {
    const text = "This is clean English text about computer science. It covers algorithms and data structures.";
    const result = classifyEffort(text, "page_classify");
    expect(result.effort).toBe("low");
    expect(result.score).toBeLessThan(0.35);
  });

  it("returns higher task criticality for quiz_generate", () => {
    const text = "Clean text for quiz generation about biology.";
    const result = classifyEffort(text, "quiz_generate");
    expect(result.features.taskCriticality).toBe(0.8);
    // Clean text still scores low overall despite high criticality
    expect(result.score).toBeGreaterThan(0);
  });

  it("classifies noisy text as higher effort", () => {
    const text = "Th§s |s gar©led t€xt w¡th m@ny §pecial ch∆racters ¥¥¥";
    const result = classifyEffort(text, "pdf_extract");
    expect(result.features.noiseRatio).toBeGreaterThan(0.1);
  });

  it("uses pre-computed metadata when provided", () => {
    const metadata = {
      noiseRatio: 0.9,
      duplicateRatio: 0.9,
      nonEnglishRatio: 0.9,
      ocrArtifactScore: 0.9,
    };
    const result = classifyEffort("ignored", "quiz_generate", metadata);
    expect(result.effort).toBe("high");
    expect(result.features.noiseRatio).toBe(0.9);
  });

  it("returns all feature scores", () => {
    const result = classifyEffort("Hello world", "topic_extract");
    expect(result.features).toHaveProperty("noiseRatio");
    expect(result.features).toHaveProperty("duplicateRatio");
    expect(result.features).toHaveProperty("nonEnglishRatio");
    expect(result.features).toHaveProperty("ocrArtifactScore");
    expect(result.features).toHaveProperty("taskCriticality");
  });

  it("handles empty text", () => {
    const result = classifyEffort("", "page_classify");
    expect(result.features.noiseRatio).toBe(0);
    expect(result.features.duplicateRatio).toBe(0);
  });
});
