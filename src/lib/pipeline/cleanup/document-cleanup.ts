import type {
  ConfidenceMetadata,
  DocumentCleanupResult,
  CleanedPage,
  CleanupStats,
} from "../types";
import { detectHeadersFooters, cleanPage } from "./page-cleanup";

export interface DocumentCleanupOptions {
  minEnglishRatio?: number;
}

interface PageInput {
  pageNumber: number;
  content: string;
}

/**
 * Remove lines appearing 3+ times across document.
 */
export function deduplicateRepeatedLines(
  pages: PageInput[]
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
      .map(([line]) => line)
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

/**
 * Strip copyright notices, "confidential" stamps, standalone page numbers.
 */
export function suppressBoilerplate(
  pages: PageInput[]
): { pages: PageInput[]; removedCount: number } {
  const boilerplatePatterns = [
    /^©.*$/i,
    /^copyright\s+/i,
    /^all rights reserved\.?$/i,
    /^confidential\.?$/i,
    /^private\s+and\s+confidential\.?$/i,
    /^do\s+not\s+distribute\.?$/i,
    /^draft\.?$/i,
    /^\d{1,4}$/,  // standalone page numbers
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

/**
 * Score Latin-script ratio per page, filter below threshold.
 * Keep pages as fallback if all would be removed.
 */
export function gateByLanguage(
  pages: PageInput[],
  minEnglishRatio = 0.7
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

/**
 * Produce ConfidenceMetadata for EffortClassifier.
 */
export function computeConfidenceMetadata(
  originalPages: PageInput[],
  cleanedPages: PageInput[],
  stats: CleanupStats
): ConfidenceMetadata {
  const originalText = originalPages.map((p) => p.content).join("\n");
  const cleanedText = cleanedPages.map((p) => p.content).join("\n");

  const noiseChars = originalText.replace(/[\w\s.,;:!?'"()\-]/g, "").length;
  const noiseRatio =
    originalText.length > 0 ? noiseChars / originalText.length : 0;

  const totalLines = originalPages.reduce(
    (sum, p) => sum + p.content.split("\n").length,
    0
  );
  const duplicateRatio =
    totalLines > 0 ? stats.duplicateLinesRemoved / totalLines : 0;

  const nonEnglishRatio = 1 - computeLatinRatio(originalText);

  const ocrArtifactScore = computeOcrArtifactScore(originalText);

  return { noiseRatio, duplicateRatio, nonEnglishRatio, ocrArtifactScore };
}

/**
 * Orchestrate all document-level transforms.
 */
export function cleanDocument(
  pages: PageInput[],
  options?: DocumentCleanupOptions
): DocumentCleanupResult {
  const originalPages = pages.map((p) => ({ ...p }));
  const minEnglishRatio = options?.minEnglishRatio ?? 0.7;

  // Step 1: Detect and strip headers/footers
  const { headers, footers } = detectHeadersFooters(pages);

  // Step 2: Clean each page (garbage removal, header/footer stripping, whitespace normalization)
  let cleaned: CleanedPage[] = pages.map((page) => {
    const cleanedContent = cleanPage(
      page.content,
      page.pageNumber,
      headers,
      footers
    );
    return {
      pageNumber: page.pageNumber,
      content: cleanedContent,
      originalCharCount: page.content.length,
      cleanedCharCount: cleanedContent.length,
    };
  });

  // Step 3: Deduplicate repeated lines
  const dedupResult = deduplicateRepeatedLines(
    cleaned.map((p) => ({ pageNumber: p.pageNumber, content: p.content }))
  );
  cleaned = cleaned.map((p, i) => ({
    ...p,
    content: dedupResult.pages[i].content,
    cleanedCharCount: dedupResult.pages[i].content.length,
  }));

  // Step 4: Suppress boilerplate
  const boilerplateResult = suppressBoilerplate(
    cleaned.map((p) => ({ pageNumber: p.pageNumber, content: p.content }))
  );
  cleaned = cleaned.map((p, i) => ({
    ...p,
    content: boilerplateResult.pages[i].content,
    cleanedCharCount: boilerplateResult.pages[i].content.length,
  }));

  // Step 5: Language gating
  const langResult = gateByLanguage(
    cleaned.map((p) => ({ pageNumber: p.pageNumber, content: p.content })),
    minEnglishRatio
  );

  const keptPageNumbers = new Set(langResult.pages.map((p) => p.pageNumber));
  cleaned = cleaned.filter((p) => keptPageNumbers.has(p.pageNumber));

  // Build stats
  const stats: CleanupStats = {
    totalPages: pages.length,
    headersDetected: headers,
    footersDetected: footers,
    duplicateLinesRemoved: dedupResult.removedCount,
    boilerplateLinesRemoved: boilerplateResult.removedCount,
    pagesFilteredByLanguage: langResult.filteredCount,
  };

  // Compute confidence metadata
  const confidenceMetadata = computeConfidenceMetadata(
    originalPages,
    cleaned.map((p) => ({ pageNumber: p.pageNumber, content: p.content })),
    stats
  );

  return { pages: cleaned, confidenceMetadata, stats };
}

function computeLatinRatio(text: string): number {
  const chars = text.replace(/\s/g, "");
  if (chars.length === 0) return 1;

  const latinChars = chars.replace(/[^\x20-\x7E]/g, "").length;
  return latinChars / chars.length;
}

function computeOcrArtifactScore(text: string): number {
  let score = 0;
  const length = text.length;
  if (length === 0) return 0;

  // Pipe characters (common OCR artifact)
  const pipes = (text.match(/\|/g) || []).length;
  score += Math.min(pipes / length, 0.1) * 3;

  // Broken words (letter-space-letter patterns in middle of words)
  const brokenWords = (text.match(/\b\w\s\w\s\w\b/g) || []).length;
  score += Math.min(brokenWords / Math.max(text.split(/\s+/).length, 1), 0.1) * 3;

  // Common OCR confusions: l/1, O/0 in unusual contexts
  const ocrConfusions = (text.match(/[|l](?=\d)|(?<=\d)[|l]|(?<=[A-Z])0(?=[A-Z])/g) || []).length;
  score += Math.min(ocrConfusions / length, 0.05) * 2;

  return Math.min(score, 1);
}
