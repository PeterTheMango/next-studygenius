// Ported from src/lib/pipeline/cleanup/page-cleanup.ts + document-cleanup.ts
// Pure logic, no Node deps

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\t/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

export function removeGarbageTokens(text: string): string {
  let result = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  result = result.replace(/[\u2500-\u257F]/g, "");
  result = result.replace(/([^\w\s])\1{2,}/g, "");
  result = result
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return true;
      if (trimmed.length === 1 && !/[a-zA-Z0-9).\-*•]/.test(trimmed)) return false;
      return true;
    })
    .join("\n");
  return result;
}

export function detectHeadersFooters(
  pages: Array<{ content: string }>,
): { headers: string[]; footers: string[] } {
  if (pages.length < 3) return { headers: [], footers: [] };

  const headerCandidates = new Map<string, number>();
  const footerCandidates = new Map<string, number>();

  for (const page of pages) {
    const lines = page.content.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length < 3) continue;

    for (const line of lines.slice(0, 2)) {
      const normalized = normalizeLine(line);
      if (normalized.length > 2) {
        headerCandidates.set(normalized, (headerCandidates.get(normalized) || 0) + 1);
      }
    }

    for (const line of lines.slice(-2)) {
      const normalized = normalizeLine(line);
      if (normalized.length > 2) {
        footerCandidates.set(normalized, (footerCandidates.get(normalized) || 0) + 1);
      }
    }
  }

  const threshold = Math.ceil(pages.length * 0.6);

  const headers = [...headerCandidates.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([line]) => line);

  const footers = [...footerCandidates.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([line]) => line);

  return { headers, footers };
}

export function stripHeadersFooters(
  content: string,
  headers: string[],
  footers: string[],
): string {
  if (headers.length === 0 && footers.length === 0) return content;
  const lines = content.split("\n");
  const matchSet = new Set([...headers, ...footers]);
  return lines.filter((line) => !matchSet.has(normalizeLine(line))).join("\n");
}

export function cleanPage(
  content: string,
  _pageNumber: number,
  headers: string[],
  footers: string[],
): string {
  let result = content;
  result = removeGarbageTokens(result);
  result = stripHeadersFooters(result, headers, footers);
  result = normalizeWhitespace(result);
  return result;
}

function normalizeLine(line: string): string {
  return line
    .trim()
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Document-level cleanup ---

interface PageInput {
  pageNumber: number;
  content: string;
}

export function deduplicateRepeatedLines(
  pages: PageInput[],
): { pages: PageInput[]; removedCount: number } {
  const lineCounts = new Map<string, number>();

  for (const page of pages) {
    const lines = page.content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
      }
    }
  }

  const duplicateLines = new Set(
    [...lineCounts.entries()]
      .filter(([, count]) => count >= 3)
      .map(([line]) => line),
  );

  let removedCount = 0;

  const dedupedPages = pages.map((page) => {
    const lines = page.content.split("\n");
    const filtered = lines.filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length > 0 && duplicateLines.has(trimmed)) {
        removedCount++;
        return false;
      }
      return true;
    });
    return { ...page, content: filtered.join("\n") };
  });

  return { pages: dedupedPages, removedCount };
}

export function suppressBoilerplate(
  pages: PageInput[],
): { pages: PageInput[]; removedCount: number } {
  const boilerplatePatterns = [
    /^©.*$/i,
    /^copyright\s+/i,
    /^all rights reserved\.?$/i,
    /^confidential\.?$/i,
    /^private\s+and\s+confidential\.?$/i,
    /^do\s+not\s+distribute\.?$/i,
    /^draft\.?$/i,
    /^\d{1,4}$/,
    /^page\s+\d+\s*(of\s+\d+)?$/i,
  ];

  let removedCount = 0;

  const cleanedPages = pages.map((page) => {
    const lines = page.content.split("\n");
    const filtered = lines.filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return true;
      for (const pattern of boilerplatePatterns) {
        if (pattern.test(trimmed)) {
          removedCount++;
          return false;
        }
      }
      return true;
    });
    return { ...page, content: filtered.join("\n") };
  });

  return { pages: cleanedPages, removedCount };
}

export function gateByLanguage(
  pages: PageInput[],
  minEnglishRatio = 0.7,
): { pages: PageInput[]; filteredCount: number } {
  const scored = pages.map((page) => ({
    page,
    ratio: computeLatinRatio(page.content),
  }));

  const passing = scored.filter((s) => s.ratio >= minEnglishRatio);

  if (passing.length === 0) {
    return { pages, filteredCount: 0 };
  }

  return {
    pages: passing.map((s) => s.page),
    filteredCount: scored.length - passing.length,
  };
}

function computeLatinRatio(text: string): number {
  const chars = text.replace(/\s/g, "");
  if (chars.length === 0) return 1;
  const latinChars = chars.replace(/[^\x20-\x7E]/g, "").length;
  return latinChars / chars.length;
}

export interface CleanDocumentResult {
  pages: Array<{ pageNumber: number; content: string }>;
  stats: {
    totalPages: number;
    duplicateLinesRemoved: number;
    boilerplateLinesRemoved: number;
    pagesFilteredByLanguage: number;
  };
}

export function cleanDocument(pages: PageInput[]): CleanDocumentResult {
  // Step 1: Detect and strip headers/footers
  const { headers, footers } = detectHeadersFooters(pages);

  // Step 2: Clean each page
  let cleaned = pages.map((page) => {
    const cleanedContent = cleanPage(page.content, page.pageNumber, headers, footers);
    return { pageNumber: page.pageNumber, content: cleanedContent };
  });

  // Step 3: Deduplicate repeated lines
  const dedupResult = deduplicateRepeatedLines(cleaned);
  cleaned = dedupResult.pages;

  // Step 4: Suppress boilerplate
  const boilerplateResult = suppressBoilerplate(cleaned);
  cleaned = boilerplateResult.pages;

  // Step 5: Language gating
  const langResult = gateByLanguage(cleaned);

  return {
    pages: langResult.pages,
    stats: {
      totalPages: pages.length,
      duplicateLinesRemoved: dedupResult.removedCount,
      boilerplateLinesRemoved: boilerplateResult.removedCount,
      pagesFilteredByLanguage: langResult.filteredCount,
    },
  };
}
