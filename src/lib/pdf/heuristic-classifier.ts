import type { PageClassification } from "@/types/database";
import type { ExtractedPage } from "./page-processor";

export interface HeuristicClassificationResult {
  classification: PageClassification;
  confidence: number; // 0-1
  matchedKeywords: string[];
  requiresAI: boolean; // True if confidence < threshold
}

const CONFIDENCE_THRESHOLD = 0.8; // Use AI if below this
const AI_VERIFICATION_THRESHOLD = 0.5; // Definitely use AI if below this

/**
 * Classifies a page using heuristic rules based on keywords and patterns
 */
export function classifyPageHeuristic(
  page: ExtractedPage,
  pageNumber: number,
  totalPages: number
): HeuristicClassificationResult {
  const content = page.content.toLowerCase();
  const charCount = page.characterCount;

  // Check for blank page first
  const blankResult = detectBlankPage(content, charCount);
  if (blankResult) return blankResult;

  // Check for cover page
  if (pageNumber === 1) {
    const coverResult = detectCoverPage(content, charCount);
    if (coverResult) return coverResult;
  }

  // Check for table of contents
  const tocResult = detectTableOfContents(content);
  if (tocResult) return tocResult;

  // Check for quiz/test questions
  const quizResult = detectQuizQuestions(content);
  if (quizResult) return quizResult;

  // Check for objectives
  const objectivesResult = detectObjectives(content);
  if (objectivesResult) return objectivesResult;

  // Check for outline/agenda
  const outlineResult = detectOutline(content);
  if (outlineResult) return outlineResult;

  // Check for review/summary (especially near end of document)
  const positionRatio = pageNumber / totalPages;
  const reviewResult = detectReview(content, positionRatio);
  if (reviewResult) return reviewResult;

  // Default: assume it's content but with lower confidence
  return {
    classification: "content",
    confidence: 0.6,
    matchedKeywords: [],
    requiresAI: true, // Low confidence, should verify with AI
  };
}

/**
 * Detects blank or nearly empty pages
 */
function detectBlankPage(
  content: string,
  charCount: number
): HeuristicClassificationResult | null {
  if (charCount < 50) {
    return {
      classification: "blank",
      confidence: 1.0,
      matchedKeywords: ["empty"],
      requiresAI: false,
    };
  }

  // Check if page only contains page numbers or single words
  const meaningfulWords = content
    .split(/\s+/)
    .filter((word) => word.length > 2);
  if (meaningfulWords.length < 5) {
    return {
      classification: "blank",
      confidence: 0.95,
      matchedKeywords: ["minimal-content"],
      requiresAI: false,
    };
  }

  return null;
}

/**
 * Detects cover/title pages
 */
function detectCoverPage(
  content: string,
  charCount: number
): HeuristicClassificationResult | null {
  const coverKeywords = [
    "syllabus",
    "course outline",
    "instructor:",
    "professor:",
    "academic year",
    "semester:",
    "department of",
    "university",
    "college of",
  ];

  const matchedKeywords = coverKeywords.filter((keyword) =>
    content.includes(keyword)
  );

  // First page with minimal content and cover-like keywords
  if (charCount < 300 && matchedKeywords.length >= 1) {
    return {
      classification: "cover",
      confidence: 0.9,
      matchedKeywords,
      requiresAI: false,
    };
  }

  // First page with multiple cover keywords even if longer
  if (matchedKeywords.length >= 3) {
    return {
      classification: "cover",
      confidence: 0.85,
      matchedKeywords,
      requiresAI: false,
    };
  }

  // Check if it lacks substantial content structure (no paragraphs)
  const hasStructure = content.includes("\n\n") || content.split("\n").length > 10;
  if (!hasStructure && charCount < 500 && matchedKeywords.length >= 1) {
    return {
      classification: "cover",
      confidence: 0.75,
      matchedKeywords,
      requiresAI: true, // Borderline, verify with AI
    };
  }

  return null;
}

/**
 * Detects table of contents pages
 */
function detectTableOfContents(
  content: string
): HeuristicClassificationResult | null {
  const tocKeywords = [
    "table of contents",
    "contents",
    "index",
  ];

  const matchedKeywords = tocKeywords.filter((keyword) =>
    content.includes(keyword)
  );

  // Strong match on explicit ToC keywords
  if (matchedKeywords.length > 0) {
    // Count page number references (common in ToC)
    const pageNumberPattern = /\.\s*\d+|\d+\s*$/gm;
    const pageNumberMatches = content.match(pageNumberPattern) || [];

    // High density of page numbers suggests ToC
    const lines = content.split("\n").length;
    const pageNumberDensity = pageNumberMatches.length / Math.max(lines, 1);

    if (pageNumberDensity > 0.3) {
      return {
        classification: "toc",
        confidence: 0.95,
        matchedKeywords: [...matchedKeywords, "page-numbers"],
        requiresAI: false,
      };
    }

    return {
      classification: "toc",
      confidence: 0.85,
      matchedKeywords,
      requiresAI: false,
    };
  }

  // Check for ToC-like structure without explicit keywords
  const lines = content.split("\n");
  const dotLeaderPattern = /\.\s*\.\s*\.\s*\d+|[.-]{3,}\s*\d+/;
  const linesWithDotLeaders = lines.filter((line) =>
    dotLeaderPattern.test(line)
  ).length;

  if (linesWithDotLeaders > 5) {
    return {
      classification: "toc",
      confidence: 0.8,
      matchedKeywords: ["dot-leaders"],
      requiresAI: false,
    };
  }

  return null;
}

/**
 * Detects quiz or test question pages
 */
function detectQuizQuestions(
  content: string
): HeuristicClassificationResult | null {
  const quizKeywords = [
    "quiz",
    "test",
    "exam",
    "questions",
    "answer key",
    "multiple choice",
    "true or false",
    "circle the correct",
    "choose the best",
    "select all that apply",
  ];

  const matchedKeywords = quizKeywords.filter((keyword) =>
    content.includes(keyword)
  );

  // Check for numbered questions pattern
  const questionPattern = /^\s*\d+[\.)]\s+/gm;
  const numberedItems = content.match(questionPattern) || [];

  // Check for multiple choice patterns
  const mcPattern = /[a-d][\.)]\s+/gi;
  const mcOptions = content.match(mcPattern) || [];

  // Strong indicators of quiz content
  if (matchedKeywords.length >= 2) {
    return {
      classification: "quiz",
      confidence: 0.95,
      matchedKeywords,
      requiresAI: false,
    };
  }

  // Numbered questions with multiple choice options
  if (numberedItems.length >= 3 && mcOptions.length >= 6) {
    return {
      classification: "quiz",
      confidence: 0.85,
      matchedKeywords: ["numbered-questions", "mc-options"],
      requiresAI: false,
    };
  }

  // Single quiz keyword with question structure
  if (matchedKeywords.length === 1 && numberedItems.length >= 5) {
    return {
      classification: "quiz",
      confidence: 0.7,
      matchedKeywords: [...matchedKeywords, "question-structure"],
      requiresAI: true,
    };
  }

  return null;
}

/**
 * Detects learning objectives pages
 */
function detectObjectives(
  content: string
): HeuristicClassificationResult | null {
  const objectivesKeywords = [
    "learning objectives",
    "objectives",
    "learning outcomes",
    "learning goals",
    "by the end of this",
    "students will be able to",
    "upon completion",
  ];

  const matchedKeywords = objectivesKeywords.filter((keyword) =>
    content.includes(keyword)
  );

  // Action verbs common in learning objectives
  const actionVerbs = [
    "understand",
    "explain",
    "describe",
    "analyze",
    "apply",
    "evaluate",
    "identify",
    "demonstrate",
    "compare",
    "synthesize",
  ];

  const actionVerbCount = actionVerbs.filter((verb) =>
    content.includes(verb)
  ).length;

  // Strong match with objectives keywords
  if (matchedKeywords.length >= 2) {
    return {
      classification: "objectives",
      confidence: 0.9,
      matchedKeywords,
      requiresAI: false,
    };
  }

  // Single objectives keyword with action verbs
  if (matchedKeywords.length === 1 && actionVerbCount >= 3) {
    return {
      classification: "objectives",
      confidence: 0.85,
      matchedKeywords: [...matchedKeywords, "action-verbs"],
      requiresAI: false,
    };
  }

  // Check if it's a hybrid page (objectives + content)
  if (matchedKeywords.length >= 1 && content.length > 800) {
    // Count bullet points
    const bulletPattern = /^\s*[-•*]\s+/gm;
    const bulletPoints = content.match(bulletPattern) || [];

    // Calculate non-bullet content
    const bulletContent = bulletPoints.reduce(
      (sum, bullet) => sum + bullet.length,
      0
    );
    const nonBulletContent = content.length - bulletContent;

    // If substantial non-bullet content, might be hybrid
    if (nonBulletContent > 400) {
      return {
        classification: "content",
        confidence: 0.7,
        matchedKeywords: ["hybrid-objectives-content"],
        requiresAI: true,
      };
    }
  }

  return null;
}

/**
 * Detects outline or agenda pages
 */
function detectOutline(
  content: string
): HeuristicClassificationResult | null {
  const outlineKeywords = [
    "outline",
    "agenda",
    "schedule",
    "course schedule",
    "weekly schedule",
    "topics covered",
  ];

  const matchedKeywords = outlineKeywords.filter((keyword) =>
    content.includes(keyword)
  );

  // Check for hierarchical numbering (1., 1.1, 1.1.1, etc.)
  const hierarchicalPattern = /^\s*\d+(\.\d+)*[\.)]\s+/gm;
  const hierarchicalItems = content.match(hierarchicalPattern) || [];

  if (matchedKeywords.length >= 1) {
    return {
      classification: "outline",
      confidence: 0.85,
      matchedKeywords,
      requiresAI: false,
    };
  }

  // Check for outline-like structure without keywords
  if (hierarchicalItems.length >= 5) {
    return {
      classification: "outline",
      confidence: 0.75,
      matchedKeywords: ["hierarchical-numbering"],
      requiresAI: true,
    };
  }

  return null;
}

/**
 * Detects review, summary, or "what we learned" pages
 */
function detectReview(
  content: string,
  positionRatio: number
): HeuristicClassificationResult | null {
  const reviewKeywords = [
    "summary",
    "what we learned",
    "what you learned",
    "key takeaways",
    "key points",
    "review",
    "recap",
    "in conclusion",
    "to summarize",
  ];

  const matchedKeywords = reviewKeywords.filter((keyword) =>
    content.includes(keyword)
  );

  // Strong match on review keywords
  if (matchedKeywords.length >= 2) {
    return {
      classification: "review",
      confidence: 0.85,
      matchedKeywords,
      requiresAI: false,
    };
  }

  // Single review keyword near end of document
  if (matchedKeywords.length === 1 && positionRatio > 0.8) {
    return {
      classification: "review",
      confidence: 0.75,
      matchedKeywords: [...matchedKeywords, "near-end"],
      requiresAI: true,
    };
  }

  // Single review keyword elsewhere (less confidence)
  if (matchedKeywords.length === 1) {
    return {
      classification: "review",
      confidence: 0.6,
      matchedKeywords,
      requiresAI: true,
    };
  }

  return null;
}
