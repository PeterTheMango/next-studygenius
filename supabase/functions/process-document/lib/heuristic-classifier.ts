// Ported from src/lib/pdf/heuristic-classifier.ts — pure logic, no Node deps

export type PageClassification =
  | "content"
  | "cover"
  | "toc"
  | "outline"
  | "objectives"
  | "review"
  | "quiz"
  | "blank"
  | "unknown";

export interface HeuristicClassificationResult {
  classification: PageClassification;
  confidence: number;
  matchedKeywords: string[];
  requiresAI: boolean;
}

export interface ExtractedPage {
  pageNumber: number;
  content: string;
  characterCount: number;
}

export function classifyPageHeuristic(
  page: ExtractedPage,
  pageNumber: number,
  totalPages: number,
): HeuristicClassificationResult {
  const content = page.content.toLowerCase();
  const charCount = page.characterCount;

  const blankResult = detectBlankPage(content, charCount);
  if (blankResult) return blankResult;

  if (pageNumber === 1) {
    const coverResult = detectCoverPage(content, charCount);
    if (coverResult) return coverResult;
  }

  const tocResult = detectTableOfContents(content);
  if (tocResult) return tocResult;

  const quizResult = detectQuizQuestions(content);
  if (quizResult) return quizResult;

  const objectivesResult = detectObjectives(content);
  if (objectivesResult) return objectivesResult;

  const outlineResult = detectOutline(content);
  if (outlineResult) return outlineResult;

  const positionRatio = pageNumber / totalPages;
  const reviewResult = detectReview(content, positionRatio);
  if (reviewResult) return reviewResult;

  return {
    classification: "content",
    confidence: 0.6,
    matchedKeywords: [],
    requiresAI: true,
  };
}

function detectBlankPage(
  content: string,
  charCount: number,
): HeuristicClassificationResult | null {
  if (charCount < 50) {
    return {
      classification: "blank",
      confidence: 1.0,
      matchedKeywords: ["empty"],
      requiresAI: false,
    };
  }

  const meaningfulWords = content.split(/\s+/).filter((word) => word.length > 2);
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

function detectCoverPage(
  content: string,
  charCount: number,
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

  const matchedKeywords = coverKeywords.filter((keyword) => content.includes(keyword));

  if (charCount < 300 && matchedKeywords.length >= 1) {
    return { classification: "cover", confidence: 0.9, matchedKeywords, requiresAI: false };
  }

  if (matchedKeywords.length >= 3) {
    return { classification: "cover", confidence: 0.85, matchedKeywords, requiresAI: false };
  }

  const hasStructure = content.includes("\n\n") || content.split("\n").length > 10;
  if (!hasStructure && charCount < 500 && matchedKeywords.length >= 1) {
    return { classification: "cover", confidence: 0.75, matchedKeywords, requiresAI: true };
  }

  return null;
}

function detectTableOfContents(content: string): HeuristicClassificationResult | null {
  const tocKeywords = ["table of contents", "contents", "index"];
  const matchedKeywords = tocKeywords.filter((keyword) => content.includes(keyword));

  if (matchedKeywords.length > 0) {
    const pageNumberPattern = /\.\s*\d+|\d+\s*$/gm;
    const pageNumberMatches = content.match(pageNumberPattern) || [];
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

    return { classification: "toc", confidence: 0.85, matchedKeywords, requiresAI: false };
  }

  const lines = content.split("\n");
  const dotLeaderPattern = /\.\s*\.\s*\.\s*\d+|[.-]{3,}\s*\d+/;
  const linesWithDotLeaders = lines.filter((line) => dotLeaderPattern.test(line)).length;

  if (linesWithDotLeaders > 5) {
    return { classification: "toc", confidence: 0.8, matchedKeywords: ["dot-leaders"], requiresAI: false };
  }

  return null;
}

function detectQuizQuestions(content: string): HeuristicClassificationResult | null {
  const quizKeywords = [
    "quiz", "test", "exam", "questions", "answer key",
    "multiple choice", "true or false", "circle the correct",
    "choose the best", "select all that apply",
  ];

  const matchedKeywords = quizKeywords.filter((keyword) => content.includes(keyword));
  const questionPattern = /^\s*\d+[\.)]\s+/gm;
  const numberedItems = content.match(questionPattern) || [];
  const mcPattern = /[a-d][\.)]\s+/gi;
  const mcOptions = content.match(mcPattern) || [];

  if (matchedKeywords.length >= 2) {
    return { classification: "quiz", confidence: 0.95, matchedKeywords, requiresAI: false };
  }

  if (numberedItems.length >= 3 && mcOptions.length >= 6) {
    return { classification: "quiz", confidence: 0.85, matchedKeywords: ["numbered-questions", "mc-options"], requiresAI: false };
  }

  if (matchedKeywords.length === 1 && numberedItems.length >= 5) {
    return { classification: "quiz", confidence: 0.7, matchedKeywords: [...matchedKeywords, "question-structure"], requiresAI: true };
  }

  return null;
}

function detectObjectives(content: string): HeuristicClassificationResult | null {
  const objectivesKeywords = [
    "learning objectives", "objectives", "learning outcomes",
    "learning goals", "by the end of this", "students will be able to",
    "upon completion",
  ];

  const matchedKeywords = objectivesKeywords.filter((keyword) => content.includes(keyword));

  const actionVerbs = [
    "understand", "explain", "describe", "analyze", "apply",
    "evaluate", "identify", "demonstrate", "compare", "synthesize",
  ];
  const actionVerbCount = actionVerbs.filter((verb) => content.includes(verb)).length;

  if (matchedKeywords.length >= 2) {
    return { classification: "objectives", confidence: 0.9, matchedKeywords, requiresAI: false };
  }

  if (matchedKeywords.length === 1 && actionVerbCount >= 3) {
    return { classification: "objectives", confidence: 0.85, matchedKeywords: [...matchedKeywords, "action-verbs"], requiresAI: false };
  }

  if (matchedKeywords.length >= 1 && content.length > 800) {
    const bulletPattern = /^\s*[-•*]\s+/gm;
    const bulletPoints = content.match(bulletPattern) || [];
    const bulletContent = bulletPoints.reduce((sum, bullet) => sum + bullet.length, 0);
    const nonBulletContent = content.length - bulletContent;

    if (nonBulletContent > 400) {
      return { classification: "content", confidence: 0.7, matchedKeywords: ["hybrid-objectives-content"], requiresAI: true };
    }
  }

  return null;
}

function detectOutline(content: string): HeuristicClassificationResult | null {
  const outlineKeywords = [
    "outline", "agenda", "schedule", "course schedule",
    "weekly schedule", "topics covered",
  ];

  const matchedKeywords = outlineKeywords.filter((keyword) => content.includes(keyword));
  const hierarchicalPattern = /^\s*\d+(\.\d+)*[\.)]\s+/gm;
  const hierarchicalItems = content.match(hierarchicalPattern) || [];

  if (matchedKeywords.length >= 1) {
    return { classification: "outline", confidence: 0.85, matchedKeywords, requiresAI: false };
  }

  if (hierarchicalItems.length >= 5) {
    return { classification: "outline", confidence: 0.75, matchedKeywords: ["hierarchical-numbering"], requiresAI: true };
  }

  return null;
}

function detectReview(
  content: string,
  positionRatio: number,
): HeuristicClassificationResult | null {
  const reviewKeywords = [
    "summary", "what we learned", "what you learned",
    "key takeaways", "key points", "review", "recap",
    "in conclusion", "to summarize",
  ];

  const matchedKeywords = reviewKeywords.filter((keyword) => content.includes(keyword));

  if (matchedKeywords.length >= 2) {
    return { classification: "review", confidence: 0.85, matchedKeywords, requiresAI: false };
  }

  if (matchedKeywords.length === 1 && positionRatio > 0.8) {
    return { classification: "review", confidence: 0.75, matchedKeywords: [...matchedKeywords, "near-end"], requiresAI: true };
  }

  if (matchedKeywords.length === 1) {
    return { classification: "review", confidence: 0.6, matchedKeywords, requiresAI: true };
  }

  return null;
}
