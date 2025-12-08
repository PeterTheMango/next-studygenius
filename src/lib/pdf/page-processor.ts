import { genAI, GEMINI_MODEL } from "../gemini/client";

export interface ExtractedPage {
  pageNumber: number;
  content: string;
  characterCount: number;
}

export interface PageExtractionResult {
  pages: ExtractedPage[];
  totalPages: number;
  extractionMethod: "gemini-multimodal";
}

/**
 * Extracts text from PDF page-by-page using Gemini's multimodal API
 * Uses a single API call with instructions to mark page boundaries
 */
export async function extractPageByPage(
  pdfBase64: string
): Promise<PageExtractionResult> {
  try {
    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: pdfBase64,
          },
        },
        {
          text: `Extract all text content from this PDF document, preserving the structure and formatting.

IMPORTANT: For each page, you MUST:
1. Prefix the page content with "PAGE N:" where N is the page number (starting from 1)
2. After each page's content, add a separator line: "---PAGE_BREAK---"

Example format:
PAGE 1:
[content of page 1]
---PAGE_BREAK---
PAGE 2:
[content of page 2]
---PAGE_BREAK---

Extract the text now, following this format exactly.`,
        },
      ],
      config: {
        temperature: 0.1,
        maxOutputTokens: 32768, // Increased for large documents
      },
    });

    const extractedText = response.text || "";

    if (!extractedText) {
      throw new Error("No text extracted from PDF");
    }

    // Parse the response to split into pages
    const pages = parsePageContent(extractedText);

    if (pages.length === 0) {
      throw new Error("Failed to parse pages from extracted text");
    }

    return {
      pages,
      totalPages: pages.length,
      extractionMethod: "gemini-multimodal",
    };
  } catch (error) {
    console.error("PDF page extraction error:", error);
    throw new Error(
      `Failed to extract pages from PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Parses the extracted text into individual pages
 * Handles various formats that Gemini might return
 */
function parsePageContent(text: string): ExtractedPage[] {
  const pages: ExtractedPage[] = [];

  // Try to split by PAGE_BREAK marker
  const sections = text.split(/---PAGE_BREAK---/gi);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Extract page number and content
    const pageMatch = trimmed.match(/PAGE\s+(\d+):\s*([\s\S]*)/i);

    if (pageMatch) {
      const pageNumber = parseInt(pageMatch[1], 10);
      const content = pageMatch[2].trim();

      if (content) {
        pages.push({
          pageNumber,
          content,
          characterCount: content.length,
        });
      }
    } else {
      // Fallback: if no page marker found, try to find just the page number
      const numberMatch = trimmed.match(/^PAGE\s+(\d+)/i);
      if (numberMatch) {
        const pageNumber = parseInt(numberMatch[1], 10);
        const content = trimmed.replace(/^PAGE\s+\d+:?\s*/i, "").trim();

        if (content) {
          pages.push({
            pageNumber,
            content,
            characterCount: content.length,
          });
        }
      }
    }
  }

  // Sort pages by page number to ensure correct order
  pages.sort((a, b) => a.pageNumber - b.pageNumber);

  // Validate page sequence - if we have gaps or if extraction failed,
  // fall back to treating entire text as a single page
  if (pages.length === 0) {
    // Last resort: treat entire text as single page
    const cleanText = text
      .replace(/PAGE\s+\d+:\s*/gi, "")
      .replace(/---PAGE_BREAK---/gi, "")
      .trim();

    if (cleanText) {
      pages.push({
        pageNumber: 1,
        content: cleanText,
        characterCount: cleanText.length,
      });
    }
  }

  return pages;
}

/**
 * Validates that page extraction was successful
 */
export function validatePageExtraction(
  result: PageExtractionResult
): { valid: boolean; error?: string } {
  if (result.pages.length === 0) {
    return { valid: false, error: "No pages extracted" };
  }

  if (result.totalPages !== result.pages.length) {
    return {
      valid: false,
      error: "Page count mismatch",
    };
  }

  // Check for reasonable content length
  const totalChars = result.pages.reduce(
    (sum, page) => sum + page.characterCount,
    0
  );

  if (totalChars < 100) {
    return {
      valid: false,
      error: "Insufficient content extracted (< 100 characters)",
    };
  }

  return { valid: true };
}
