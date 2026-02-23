export interface PageCleanupOptions {
  preserveListFormatting?: boolean;
}

/**
 * Collapse blank lines, normalize tabs/spaces, trim.
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\t/g, " ")
    .replace(/[^\S\n]+/g, " ") // collapse horizontal whitespace
    .replace(/\n{3,}/g, "\n\n") // max 2 consecutive newlines
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

/**
 * Strip control chars, box-drawing, runs of 3+ identical symbols, isolated single-char lines.
 */
export function removeGarbageTokens(text: string): string {
  // Remove control characters (except newline, tab)
  let result = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Remove box-drawing characters (U+2500–U+257F)
  result = result.replace(/[\u2500-\u257F]/g, "");

  // Remove runs of 3+ identical non-alphanumeric, non-whitespace symbols
  result = result.replace(/([^\w\s])\1{2,}/g, "");

  // Remove isolated single-char lines (not digits, not meaningful letters like list markers)
  result = result
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return true; // keep empty lines for whitespace normalization
      if (trimmed.length === 1 && !/[a-zA-Z0-9).\-*•]/.test(trimmed))
        return false;
      return true;
    })
    .join("\n");

  return result;
}

/**
 * Extract first/last 2 lines per page, flag lines appearing on >60% of pages.
 */
export function detectHeadersFooters(
  pages: Array<{ content: string }>
): { headers: string[]; footers: string[] } {
  if (pages.length < 3) return { headers: [], footers: [] };

  const headerCandidates = new Map<string, number>();
  const footerCandidates = new Map<string, number>();

  for (const page of pages) {
    const lines = page.content.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length < 3) continue;

    // First 2 lines as header candidates
    for (const line of lines.slice(0, 2)) {
      const normalized = normalizeLine(line);
      if (normalized.length > 2) {
        headerCandidates.set(
          normalized,
          (headerCandidates.get(normalized) || 0) + 1
        );
      }
    }

    // Last 2 lines as footer candidates
    for (const line of lines.slice(-2)) {
      const normalized = normalizeLine(line);
      if (normalized.length > 2) {
        footerCandidates.set(
          normalized,
          (footerCandidates.get(normalized) || 0) + 1
        );
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

/**
 * Remove matched header/footer lines from a page.
 */
export function stripHeadersFooters(
  content: string,
  headers: string[],
  footers: string[]
): string {
  if (headers.length === 0 && footers.length === 0) return content;

  const lines = content.split("\n");
  const matchSet = new Set([...headers, ...footers]);

  return lines
    .filter((line) => !matchSet.has(normalizeLine(line)))
    .join("\n");
}

/**
 * Compose all page-level transforms.
 */
export function cleanPage(
  content: string,
  _pageNumber: number,
  headers: string[],
  footers: string[],
  _options?: PageCleanupOptions
): string {
  let result = content;
  result = removeGarbageTokens(result);
  result = stripHeadersFooters(result, headers, footers);
  result = normalizeWhitespace(result);
  return result;
}

/**
 * Normalize a line for comparison: lowercase, collapse whitespace, strip page numbers.
 */
function normalizeLine(line: string): string {
  return line
    .trim()
    .toLowerCase()
    .replace(/\d+/g, "") // strip numbers (page numbers vary)
    .replace(/\s+/g, " ")
    .trim();
}
