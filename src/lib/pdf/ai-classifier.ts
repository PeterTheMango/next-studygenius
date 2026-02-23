import { processDocument } from "../pipeline/process-document-service";
import type { PageClassification } from "@/types/database";
import type { ExtractedPage } from "./page-processor";

export interface AIClassificationResult {
  classification: PageClassification;
  confidence: number;
  reasoning: string;
}

interface PageToClassify {
  page: ExtractedPage;
  context: {
    pageNumber: number;
    totalPages: number;
    previousClassifications?: PageClassification[];
  };
}

/**
 * Classifies a single page using AI
 */
export async function classifyPageWithAI(
  pageData: PageToClassify,
): Promise<AIClassificationResult> {
  const results = await classifyPagesWithAI([pageData]);
  return results[0];
}

/**
 * Classifies multiple pages using AI in a single batch request
 * More cost-effective than individual requests
 */
export async function classifyPagesWithAI(
  pagesData: PageToClassify[],
  documentId?: string,
  userId?: string,
): Promise<AIClassificationResult[]> {
  if (pagesData.length === 0) {
    return [];
  }

  // Build the prompt for batch classification
  const prompt = buildBatchClassificationPrompt(pagesData);

  try {
    const response = await processDocument({
      task: "page_classify",
      contents: [{ text: prompt }],
      responseMimeType: "application/json",
      documentId,
      userId,
    });

    const responseText = response.text || "[]";
    const parsed = JSON.parse(responseText);

    // Validate and return results
    return validateAIResults(parsed, pagesData.length);
  } catch (error) {
    console.error("AI classification error:", error);

    // Fallback: classify as 'content' with low confidence
    return pagesData.map(() => ({
      classification: "content",
      confidence: 0.5,
      reasoning: "AI classification failed, defaulting to content",
    }));
  }
}

/**
 * Builds the prompt for batch page classification
 */
function buildBatchClassificationPrompt(pagesData: PageToClassify[]): string {
  let prompt = `Classify each document page into exactly one category.

<categories>
- content: Main educational/learning material — lectures, explanations, examples, detailed information, diagrams with explanations
- cover: Title/cover page or syllabus header — typically has course name, instructor, date, institution, with minimal body text
- toc: Table of contents or index — section/chapter listings with corresponding page numbers
- outline: Course outline, schedule, weekly agenda, or syllabus body with dates and topic listings
- objectives: Learning objectives/outcomes/goals — typically bullet points with action verbs (understand, explain, describe, analyze)
- review: Summary, recap, conclusion, or "what we learned" — references previously covered material
- quiz: Assessment material — numbered questions, answer choices, practice problems, exam content
- blank: Empty or nearly empty pages (minimal meaningful content)
- unknown: Cannot determine with reasonable confidence
</categories>

<rules>
1. Default to "content" when uncertain — it is the most common category.
2. Use page position as a signal, not a rule: covers tend to appear early, reviews tend to appear late, but exceptions exist.
3. A page with a title AND substantial educational material below it is "content", not "cover".
4. Distinguish "outline" (schedule/agenda with dates or week numbers) from "toc" (section listings with page numbers).
5. Objectives pages state what students *will* learn; review pages summarize what *was* learned.
6. Pages with only headers, footers, or page numbers and no meaningful body text are "blank".
7. If a page mixes categories (e.g., objectives followed by content), classify by the dominant purpose.
</rules>

<pages>
`;

  pagesData.forEach(({ page, context }, index) => {
    const position = getPositionLabel(context.pageNumber, context.totalPages);
    const contentPreview =
      page.content.length > 800
        ? page.content.substring(0, 800) + "..."
        : page.content;

    prompt += `<page index="${index + 1}" page_number="${context.pageNumber}" total_pages="${context.totalPages}" position="${position}" char_count="${page.characterCount}">
${contentPreview}
</page>
`;
  });

  prompt += `</pages>

Respond with a JSON array of exactly ${pagesData.length} objects, one per page in order:
[{"classification": "<category>", "confidence": <0.0-1.0>, "reasoning": "<one sentence>"}]`;

  return prompt;
}

/**
 * Gets a human-readable position label
 */
function getPositionLabel(pageNumber: number, totalPages: number): string {
  const ratio = pageNumber / totalPages;

  if (ratio <= 0.1) return "beginning";
  if (ratio <= 0.3) return "early";
  if (ratio <= 0.7) return "middle";
  if (ratio <= 0.9) return "late";
  return "end";
}

/**
 * Validates AI classification results
 */
function validateAIResults(
  results: any,
  expectedCount: number,
): AIClassificationResult[] {
  if (!Array.isArray(results)) {
    throw new Error("AI response is not an array");
  }

  if (results.length !== expectedCount) {
    console.warn(
      `AI returned ${results.length} results, expected ${expectedCount}`,
    );
  }

  const validClassifications: PageClassification[] = [
    "content",
    "cover",
    "toc",
    "outline",
    "objectives",
    "review",
    "quiz",
    "blank",
    "unknown",
  ];

  return results.map((result: any) => {
    // Validate classification
    const classification = validClassifications.includes(result.classification)
      ? result.classification
      : "content";

    // Validate confidence (must be 0-1)
    let confidence = parseFloat(result.confidence);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      confidence = 0.5;
    }

    // Validate reasoning
    const reasoning =
      typeof result.reasoning === "string"
        ? result.reasoning
        : "No reasoning provided";

    return {
      classification,
      confidence,
      reasoning,
    };
  });
}
