import type { PageClassification, PageMetadata } from "@/types/database";
import { extractPageByPage, validatePageExtraction } from "./page-processor";
import type { ExtractedPage } from "./page-processor";
import { classifyPageHeuristic } from "./heuristic-classifier";
import { classifyPagesWithAI } from "./ai-classifier";

export interface FilteringResult {
  filteredText: string;
  pageMetadata: PageMetadata[];
  stats: {
    totalPages: number;
    filteredPages: number;
    keptPages: number;
    byClassification: Record<PageClassification, number>;
    aiClassificationsUsed: number;
  };
}

// Classifications to filter out
const FILTERED_TYPES: PageClassification[] = [
  "cover",
  "toc",
  "outline",
  "objectives",
  "review",
  "quiz",
  "blank",
];

/**
 * Main pipeline: extracts pages from PDF, classifies them, and filters unwanted pages
 */
export async function filterPDFPages(
  pdfBase64: string
): Promise<FilteringResult> {
  // Step 1: Extract pages from PDF
  console.log("[Filter Pipeline] Extracting pages from PDF...");
  const extractionResult = await extractPageByPage(pdfBase64);

  // Validate extraction
  const validation = validatePageExtraction(extractionResult);
  if (!validation.valid) {
    throw new Error(`Page extraction failed: ${validation.error}`);
  }

  const { pages, totalPages } = extractionResult;
  console.log(`[Filter Pipeline] Extracted ${totalPages} pages`);

  // Step 2: Classify each page
  console.log("[Filter Pipeline] Classifying pages...");
  const { pageMetadata, pagesToClassifyWithAI } = await classifyPages(
    pages,
    totalPages
  );

  // Step 3: Batch AI classification for uncertain pages
  let aiClassificationsUsed = 0;
  if (pagesToClassifyWithAI.length > 0) {
    console.log(
      `[Filter Pipeline] Using AI to classify ${pagesToClassifyWithAI.length} uncertain pages...`
    );
    aiClassificationsUsed = await runAIClassification(
      pagesToClassifyWithAI,
      pageMetadata
    );
  }

  // Step 4: Apply filtering rules
  console.log("[Filter Pipeline] Applying filtering rules...");
  const filteringResult = applyFiltering(pages, pageMetadata);

  // Step 5: Handle edge cases
  const finalResult = handleEdgeCases(
    filteringResult,
    pages,
    pageMetadata,
    totalPages
  );

  // Step 6: Calculate statistics
  const stats = calculateStats(
    pageMetadata,
    totalPages,
    aiClassificationsUsed
  );

  console.log("[Filter Pipeline] Filtering complete:", stats);

  return {
    filteredText: finalResult.filteredText,
    pageMetadata: finalResult.pageMetadata,
    stats,
  };
}

/**
 * Classifies all pages using heuristics
 */
async function classifyPages(
  pages: ExtractedPage[],
  totalPages: number
): Promise<{
  pageMetadata: PageMetadata[];
  pagesToClassifyWithAI: Array<{ index: number; page: ExtractedPage }>;
}> {
  const pageMetadata: PageMetadata[] = [];
  const pagesToClassifyWithAI: Array<{ index: number; page: ExtractedPage }> =
    [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const heuristicResult = classifyPageHeuristic(
      page,
      page.pageNumber,
      totalPages
    );

    // Create initial metadata
    const metadata: PageMetadata = {
      pageNumber: page.pageNumber,
      classification: heuristicResult.classification,
      filtered: FILTERED_TYPES.includes(heuristicResult.classification),
      confidence: heuristicResult.confidence,
      detectionMethod: "heuristic",
      characterCount: page.characterCount,
      keywords: heuristicResult.matchedKeywords,
    };

    pageMetadata.push(metadata);

    // Queue for AI classification if needed
    if (heuristicResult.requiresAI) {
      pagesToClassifyWithAI.push({ index: i, page });
    }
  }

  return { pageMetadata, pagesToClassifyWithAI };
}

/**
 * Runs AI classification in batches for uncertain pages
 */
async function runAIClassification(
  pagesToClassify: Array<{ index: number; page: ExtractedPage }>,
  pageMetadata: PageMetadata[]
): Promise<number> {
  const BATCH_SIZE = 10;
  let totalAIClassifications = 0;

  // Process in batches
  for (let i = 0; i < pagesToClassify.length; i += BATCH_SIZE) {
    const batch = pagesToClassify.slice(i, i + BATCH_SIZE);

    // Prepare batch data
    const batchData = batch.map(({ page }) => {
      const metadata = pageMetadata.find(
        (m) => m.pageNumber === page.pageNumber
      );
      return {
        page,
        context: {
          pageNumber: page.pageNumber,
          totalPages: pageMetadata.length,
          previousClassifications: pageMetadata
            .filter((m) => m.pageNumber < page.pageNumber)
            .map((m) => m.classification),
        },
      };
    });

    // Get AI classifications
    const aiResults = await classifyPagesWithAI(batchData);

    // Update metadata with AI results
    aiResults.forEach((result, batchIndex) => {
      const { index } = batch[batchIndex];
      const metadata = pageMetadata[index];

      // Only update if AI has higher confidence
      if (result.confidence > metadata.confidence) {
        metadata.classification = result.classification;
        metadata.confidence = result.confidence;
        metadata.detectionMethod = "ai";
        metadata.filtered = FILTERED_TYPES.includes(result.classification);
        metadata.keywords = [
          ...(metadata.keywords || []),
          `ai-reason: ${result.reasoning}`,
        ];

        totalAIClassifications++;
      }
    });
  }

  return totalAIClassifications;
}

/**
 * Applies filtering rules and assembles filtered content
 */
function applyFiltering(
  pages: ExtractedPage[],
  pageMetadata: PageMetadata[]
): { filteredText: string; keptPages: ExtractedPage[] } {
  const keptPages: ExtractedPage[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const metadata = pageMetadata[i];

    if (!metadata.filtered) {
      keptPages.push(page);
    }
  }

  // Assemble filtered text with page markers
  const filteredText = keptPages
    .map((page) => {
      return `\n\n--- Page ${page.pageNumber} ---\n\n${page.content}`;
    })
    .join("")
    .trim();

  return { filteredText, keptPages };
}

/**
 * Handles edge cases like all pages filtered or very short documents
 */
function handleEdgeCases(
  filteringResult: { filteredText: string; keptPages: ExtractedPage[] },
  allPages: ExtractedPage[],
  pageMetadata: PageMetadata[],
  totalPages: number
): { filteredText: string; pageMetadata: PageMetadata[] } {
  const { keptPages } = filteringResult;

  // Edge Case 1: All pages filtered
  if (keptPages.length === 0) {
    console.warn(
      "[Filter Pipeline] All pages filtered! Keeping top 50% by content..."
    );

    // Sort pages by character count
    const sortedPages = [...allPages].sort(
      (a, b) => b.characterCount - a.characterCount
    );

    // Keep top 50% (at least 1 page)
    const toKeep = Math.max(1, Math.ceil(sortedPages.length / 2));
    const recoveredPages = sortedPages.slice(0, toKeep);

    // Update metadata for recovered pages
    recoveredPages.forEach((page) => {
      const metadata = pageMetadata.find(
        (m) => m.pageNumber === page.pageNumber
      );
      if (metadata) {
        metadata.filtered = false;
        metadata.classification = "content";
        metadata.confidence = 0.5;
        metadata.detectionMethod = "heuristic";
        metadata.keywords = [
          ...(metadata.keywords || []),
          "recovered-fallback",
        ];
      }
    });

    // Reassemble text
    const filteredText = recoveredPages
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((page) => `\n\n--- Page ${page.pageNumber} ---\n\n${page.content}`)
      .join("")
      .trim();

    return { filteredText, pageMetadata };
  }

  // Edge Case 2: Very short document (< 5 pages) with only 1 page kept
  if (totalPages < 5 && keptPages.length === 1) {
    console.warn(
      "[Filter Pipeline] Short document with only 1 page kept. Loosening filters..."
    );

    // Find pages that were borderline filtered
    const borderlinePages = allPages.filter((page) => {
      const metadata = pageMetadata.find(
        (m) => m.pageNumber === page.pageNumber
      );
      return (
        metadata?.filtered &&
        metadata.confidence < 0.8 &&
        page.characterCount > 200
      );
    });

    if (borderlinePages.length > 0) {
      // Recover the best borderline page
      const bestBorderline = borderlinePages.sort(
        (a, b) => b.characterCount - a.characterCount
      )[0];

      const metadata = pageMetadata.find(
        (m) => m.pageNumber === bestBorderline.pageNumber
      );
      if (metadata) {
        metadata.filtered = false;
        metadata.classification = "content";
        metadata.keywords = [
          ...(metadata.keywords || []),
          "recovered-short-doc",
        ];
      }

      // Reassemble text
      const allKept = [...keptPages, bestBorderline].sort(
        (a, b) => a.pageNumber - b.pageNumber
      );
      const filteredText = allKept
        .map((page) => `\n\n--- Page ${page.pageNumber} ---\n\n${page.content}`)
        .join("")
        .trim();

      return { filteredText, pageMetadata };
    }
  }

  // No edge cases triggered, return original result
  return {
    filteredText: filteringResult.filteredText,
    pageMetadata,
  };
}

/**
 * Calculates statistics about the filtering process
 */
function calculateStats(
  pageMetadata: PageMetadata[],
  totalPages: number,
  aiClassificationsUsed: number
): FilteringResult["stats"] {
  const byClassification: Record<PageClassification, number> = {
    content: 0,
    cover: 0,
    toc: 0,
    outline: 0,
    objectives: 0,
    review: 0,
    quiz: 0,
    blank: 0,
    unknown: 0,
  };

  let filteredPages = 0;
  let keptPages = 0;

  pageMetadata.forEach((metadata) => {
    byClassification[metadata.classification]++;

    if (metadata.filtered) {
      filteredPages++;
    } else {
      keptPages++;
    }
  });

  return {
    totalPages,
    filteredPages,
    keptPages,
    byClassification,
    aiClassificationsUsed,
  };
}
