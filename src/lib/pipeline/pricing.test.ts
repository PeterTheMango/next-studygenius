import { describe, it, expect } from "vitest";
import { estimateCost, PRICING_VERSION, MODEL_PRICING } from "./pricing";

describe("estimateCost", () => {
  it("returns correct cost for gemini-2.5-flash", () => {
    // 1M input tokens + 1M output tokens
    const cost = estimateCost("gemini-2.5-flash", 1_000_000, 1_000_000);
    expect(cost).toBe(0.3 + 2.5); // 2.80
  });

  it("returns correct cost for small token counts", () => {
    const cost = estimateCost("gemini-2.5-flash", 1000, 500);
    expect(cost).toBeCloseTo(0.0003 + 0.00125, 6);
  });

  it("returns null for unknown models", () => {
    expect(estimateCost("gpt-4o", 1000, 500)).toBeNull();
  });

  it("returns 0 for zero tokens", () => {
    expect(estimateCost("gemini-2.5-flash", 0, 0)).toBe(0);
  });

  it("has a pricing version", () => {
    expect(PRICING_VERSION).toBe("v1");
  });

  it("has pricing for all listed models", () => {
    expect(Object.keys(MODEL_PRICING).length).toBeGreaterThanOrEqual(3);
  });
});
