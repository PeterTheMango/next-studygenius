import { describe, it, expect } from "vitest";
import {
  deduplicateRepeatedLines,
  suppressBoilerplate,
  gateByLanguage,
  computeConfidenceMetadata,
  cleanDocument,
} from "./document-cleanup";

describe("deduplicateRepeatedLines", () => {
  it("removes lines appearing 3+ times across pages", () => {
    const pages = [
      { pageNumber: 1, content: "unique content\nrepeated line" },
      { pageNumber: 2, content: "other stuff\nrepeated line" },
      { pageNumber: 3, content: "more text\nrepeated line" },
    ];
    const result = deduplicateRepeatedLines(pages);
    expect(result.removedCount).toBe(3);
    expect(result.pages[0].content).not.toContain("repeated line");
  });

  it("keeps lines appearing fewer than 3 times", () => {
    const pages = [
      { pageNumber: 1, content: "unique content\ntwice line" },
      { pageNumber: 2, content: "other stuff\ntwice line" },
    ];
    const result = deduplicateRepeatedLines(pages);
    expect(result.removedCount).toBe(0);
  });
});

describe("suppressBoilerplate", () => {
  it("removes copyright notices", () => {
    const pages = [
      { pageNumber: 1, content: "Content here\n© 2024 Company Inc.\nMore content" },
    ];
    const result = suppressBoilerplate(pages);
    expect(result.removedCount).toBe(1);
    expect(result.pages[0].content).not.toContain("© 2024");
  });

  it("removes standalone page numbers", () => {
    const pages = [{ pageNumber: 1, content: "Content\n42\nMore" }];
    const result = suppressBoilerplate(pages);
    expect(result.removedCount).toBe(1);
    expect(result.pages[0].content).toBe("Content\nMore");
  });

  it("removes Page X of Y", () => {
    const pages = [{ pageNumber: 1, content: "Content\nPage 5 of 10\nMore" }];
    const result = suppressBoilerplate(pages);
    expect(result.removedCount).toBe(1);
  });

  it("removes confidential stamps", () => {
    const pages = [{ pageNumber: 1, content: "Confidential\nContent\nDo not distribute" }];
    const result = suppressBoilerplate(pages);
    expect(result.removedCount).toBe(2);
  });
});

describe("gateByLanguage", () => {
  it("keeps pages with high Latin ratio", () => {
    const pages = [
      { pageNumber: 1, content: "Hello world this is English text" },
      { pageNumber: 2, content: "More English content here" },
    ];
    const result = gateByLanguage(pages, 0.7);
    expect(result.pages.length).toBe(2);
    expect(result.filteredCount).toBe(0);
  });

  it("filters pages with low Latin ratio", () => {
    const pages = [
      { pageNumber: 1, content: "Hello world" },
      { pageNumber: 2, content: "你好世界这是中文文本内容" },
    ];
    const result = gateByLanguage(pages, 0.7);
    expect(result.pages.length).toBe(1);
    expect(result.filteredCount).toBe(1);
  });

  it("keeps all pages as fallback if all would be filtered", () => {
    const pages = [
      { pageNumber: 1, content: "你好世界" },
      { pageNumber: 2, content: "更多中文" },
    ];
    const result = gateByLanguage(pages, 0.9);
    expect(result.pages.length).toBe(2);
    expect(result.filteredCount).toBe(0);
  });
});

describe("computeConfidenceMetadata", () => {
  it("computes reasonable noise ratio", () => {
    const original = [{ pageNumber: 1, content: "Hello world! Normal text." }];
    const cleaned = [{ pageNumber: 1, content: "Hello world! Normal text." }];
    const stats = {
      totalPages: 1,
      headersDetected: [],
      footersDetected: [],
      duplicateLinesRemoved: 0,
      boilerplateLinesRemoved: 0,
      pagesFilteredByLanguage: 0,
    };
    const metadata = computeConfidenceMetadata(original, cleaned, stats);
    expect(metadata.noiseRatio).toBeLessThan(0.1);
    expect(metadata.nonEnglishRatio).toBeLessThan(0.1);
  });

  it("reports higher noise for garbled text", () => {
    const original = [{ pageNumber: 1, content: "§±€¥£¤¦§©®™" }];
    const cleaned = [{ pageNumber: 1, content: "" }];
    const stats = {
      totalPages: 1,
      headersDetected: [],
      footersDetected: [],
      duplicateLinesRemoved: 0,
      boilerplateLinesRemoved: 0,
      pagesFilteredByLanguage: 0,
    };
    const metadata = computeConfidenceMetadata(original, cleaned, stats);
    expect(metadata.noiseRatio).toBeGreaterThan(0.3);
  });
});

describe("cleanDocument", () => {
  it("orchestrates all transforms and produces metadata", () => {
    const pages = Array.from({ length: 5 }, (_, i) => ({
      pageNumber: i + 1,
      content: `CS101 Intro\nContent for page ${i + 1}\nThis is educational text.\n© 2024 Uni\nCS101 Footer`,
    }));

    const result = cleanDocument(pages);
    expect(result.pages.length).toBeGreaterThan(0);
    expect(result.confidenceMetadata).toHaveProperty("noiseRatio");
    expect(result.confidenceMetadata).toHaveProperty("duplicateRatio");
    expect(result.stats.totalPages).toBe(5);
  });

  it("handles empty input gracefully", () => {
    const result = cleanDocument([]);
    expect(result.pages).toEqual([]);
    expect(result.stats.totalPages).toBe(0);
  });
});
