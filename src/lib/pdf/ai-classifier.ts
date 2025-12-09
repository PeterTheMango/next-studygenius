import { genAI, GEMINI_MODEL } from "../gemini/client";
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
  pageData: PageToClassify
): Promise<AIClassificationResult> {
  const results = await classifyPagesWithAI([pageData]);
  return results[0];
}

/**
 * Classifies multiple pages using AI in a single batch request
 * More cost-effective than individual requests
 */
export async function classifyPagesWithAI(
  pagesData: PageToClassify[]
): Promise<AIClassificationResult[]> {
  if (pagesData.length === 0) {
    return [];
  }

  // Build the prompt for batch classification
  const prompt = buildBatchClassificationPrompt(pagesData);

  try {
    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL, // Fast and cost-effective model
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1, // Low temperature for consistent classification
        maxOutputTokens: 2048,
      },
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
  const categoryDescriptions = `
CATEGORIES:
- content: Main educational/learning content (lectures, explanations, examples, detailed information)
- cover: Title page, cover page, or syllabus header with minimal content
- toc: Table of contents or index
- outline: Course outline, schedule, or agenda
- objectives: Learning objectives, learning outcomes, or learning goals
- review: Summary, recap, "what we learned" sections, or conclusion pages
- quiz: Quiz questions, test questions, exam questions, or practice problems
- blank: Empty or nearly empty pages
- unknown: Unable to determine with confidence
`;

  let prompt = `You are a document page classifier. Analyze the following pages and classify each one into the appropriate category.

${categoryDescriptions}

CLASSIFICATION RULES:
1. Be conservative - when in doubt, classify as 'content'
2. Cover pages typically have minimal text and metadata (author, date, course info)
3. ToC pages have page numbers and section listings
4. Quiz pages have numbered questions with answer options
5. Objectives pages have bullet points with action verbs (understand, explain, describe)
6. Review pages summarize previously covered material
7. Content pages contain substantial educational material, explanations, or examples

`;

  // Add each page to classify
  pagesData.forEach(({ page, context }, index) => {
    const position = getPositionLabel(context.pageNumber, context.totalPages);

    const contentPreview =
      page.content.length > 800
        ? page.content.substring(0, 800) + "..."
        : page.content;

    prompt += `
PAGE ${index + 1} TO CLASSIFY:
- Document Page Number: ${context.pageNumber} of ${context.totalPages}
- Position: ${position}
- Character Count: ${page.characterCount}
- Content:
"""
${contentPreview}
"""

---
`;
  });

  prompt += `
Return a JSON array with exactly ${pagesData.length} classification results, one for each page in order.

Format:
[
  {
    "classification": "category_name",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation"
  },
  ...
]

Provide the classifications now:`;

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
  expectedCount: number
): AIClassificationResult[] {
  if (!Array.isArray(results)) {
    throw new Error("AI response is not an array");
  }

  if (results.length !== expectedCount) {
    console.warn(
      `AI returned ${results.length} results, expected ${expectedCount}`
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

  return results.map((result, index) => {
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
