import { describe, it, expect } from "vitest";
import { buildThinkingConfig } from "./thinking-adapter";

describe("buildThinkingConfig", () => {
  it("returns thinkingLevel for gemini-3 models", () => {
    const result = buildThinkingConfig("gemini-3-flash-preview", "medium");
    expect(result).toEqual({
      thinkingConfig: { thinkingLevel: "medium" },
    });
  });

  it("returns thinkingBudget for gemini-2.5 models", () => {
    const result = buildThinkingConfig("gemini-2.5-flash", "low");
    expect(result).toEqual({
      thinkingConfig: { thinkingBudget: 1024 },
    });
  });

  it("returns correct budget for each effort level on 2.5", () => {
    expect(buildThinkingConfig("gemini-2.5-flash", "low")).toEqual({
      thinkingConfig: { thinkingBudget: 1024 },
    });
    expect(buildThinkingConfig("gemini-2.5-flash", "medium")).toEqual({
      thinkingConfig: { thinkingBudget: 4096 },
    });
    expect(buildThinkingConfig("gemini-2.5-flash", "high")).toEqual({
      thinkingConfig: { thinkingBudget: 8192 },
    });
  });

  it("returns undefined for unknown models", () => {
    expect(buildThinkingConfig("gpt-4o", "high")).toBeUndefined();
    expect(buildThinkingConfig("gemini-1.5-pro", "medium")).toBeUndefined();
  });

  it("handles gemini-2.5 variants", () => {
    const result = buildThinkingConfig("gemini-2.5-flash-lite-preview-09-2025", "high");
    expect(result).toEqual({
      thinkingConfig: { thinkingBudget: 8192 },
    });
  });
});
