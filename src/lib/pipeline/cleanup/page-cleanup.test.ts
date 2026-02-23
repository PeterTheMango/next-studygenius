import { describe, it, expect } from "vitest";
import {
  normalizeWhitespace,
  removeGarbageTokens,
  detectHeadersFooters,
  stripHeadersFooters,
  cleanPage,
} from "./page-cleanup";

describe("normalizeWhitespace", () => {
  it("collapses multiple blank lines to max 2", () => {
    const input = "line1\n\n\n\n\nline2";
    expect(normalizeWhitespace(input)).toBe("line1\n\nline2");
  });

  it("normalizes tabs to spaces", () => {
    const input = "hello\tworld";
    expect(normalizeWhitespace(input)).toBe("hello world");
  });

  it("collapses horizontal whitespace", () => {
    const input = "hello    world";
    expect(normalizeWhitespace(input)).toBe("hello world");
  });

  it("trims each line and the overall result", () => {
    const input = "  hello  \n  world  ";
    expect(normalizeWhitespace(input)).toBe("hello\nworld");
  });
});

describe("removeGarbageTokens", () => {
  it("strips control characters", () => {
    const input = "hello\x00\x01\x02world";
    expect(removeGarbageTokens(input)).toBe("helloworld");
  });

  it("strips box-drawing characters", () => {
    const input = "data\u2500\u2502\u2510end";
    expect(removeGarbageTokens(input)).toBe("dataend");
  });

  it("removes runs of 3+ identical symbols", () => {
    const input = "hello***world";
    expect(removeGarbageTokens(input)).toBe("helloworld");
  });

  it("keeps runs of 2 identical symbols", () => {
    const input = "hello**world";
    expect(removeGarbageTokens(input)).toBe("hello**world");
  });

  it("removes isolated single-char non-meaningful lines", () => {
    const input = "hello\n~\nworld";
    expect(removeGarbageTokens(input)).toBe("hello\nworld");
  });

  it("keeps single-char meaningful lines like list markers", () => {
    const input = "hello\n-\nworld";
    expect(removeGarbageTokens(input)).toBe("hello\n-\nworld");
  });
});

describe("detectHeadersFooters", () => {
  it("returns empty for fewer than 3 pages", () => {
    const pages = [{ content: "header\nbody\nfooter" }, { content: "header\nbody\nfooter" }];
    expect(detectHeadersFooters(pages)).toEqual({ headers: [], footers: [] });
  });

  it("detects repeating headers across >60% of pages", () => {
    const pages = Array.from({ length: 5 }, (_, i) => ({
      content: `CS101 Introduction\nContent for page ${i + 1}\nMore content\nPage footer text`,
    }));
    const result = detectHeadersFooters(pages);
    expect(result.headers.length).toBeGreaterThan(0);
  });

  it("detects repeating footers", () => {
    const pages = Array.from({ length: 5 }, (_, i) => ({
      content: `Heading ${i}\nBody text here\nMore text\nConfidential Document`,
    }));
    const result = detectHeadersFooters(pages);
    expect(result.footers.length).toBeGreaterThan(0);
  });
});

describe("stripHeadersFooters", () => {
  it("removes matched header/footer lines", () => {
    const content = "CS101 Introduction\nActual content here\nConfidential Document";
    const result = stripHeadersFooters(
      content,
      ["cs introduction"],
      ["confidential document"]
    );
    expect(result).toBe("Actual content here");
  });

  it("returns original when no matches", () => {
    const content = "Line 1\nLine 2";
    expect(stripHeadersFooters(content, [], [])).toBe(content);
  });
});

describe("cleanPage", () => {
  it("composes all transforms", () => {
    const content = "CS101\x00 Intro\n\n\n\nReal content***here\n~\nMore stuff\nCS101 Intro";
    const result = cleanPage(content, 1, ["cs intro"], []);
    expect(result).not.toContain("\x00");
    expect(result).not.toContain("***");
    expect(result).not.toContain("~");
  });
});
