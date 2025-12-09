export const SYSTEM_PROMPT = `You are an expert educational content creator specializing in quiz generation.

CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:
1. Generate questions ONLY from the provided document content
2. Do NOT use any external knowledge, web sources, or your training data
3. Do NOT make assumptions beyond what's explicitly stated in the document
4. Every question MUST be directly answerable from the document text
5. Include exact page/section references when possible
6. If the document lacks sufficient content for a topic, skip that topic

You will receive the document content and must generate questions based SOLELY on that content.`;

export const MODE_INSTRUCTIONS = {
  learn: `
LEARN MODE - Help users understand concepts for the first time:
- Include explanatory context with each question
- Focus on foundational concepts and definitions
- Provide helpful hints for difficult questions
- Use simpler question formats (multiple choice, true/false preferred)
- Include "why" and "how" questions for deeper understanding
- Explanations should teach, not just confirm
- Difficulty distribution: 50% easy, 35% medium, 15% hard`,

  revision: `
REVISION MODE - Test memory through active recall:
- No hints provided - pure recall testing
- Mix all question types to challenge different recall patterns
- Include questions that connect multiple concepts
- Focus on key facts, definitions, formulas, and relationships
- Vary difficulty to identify weak areas
- Difficulty distribution: 30% easy, 45% medium, 25% hard`,

  test: `
TEST MODE - Simulate exam conditions:
- No hints or context provided
- Include application-based and analysis questions
- Mix difficulty levels realistically
- Questions should be time-appropriate (30-90 seconds each)
- Test critical thinking, not just memorization
- Difficulty distribution: 20% easy, 50% medium, 30% hard`,
};

export const OUTPUT_FORMAT = `
OUTPUT FORMAT - Return ONLY valid JSON matching this exact structure:
{
  "questions": [
    {
      "type": "multiple_choice" | "true_false" | "fill_blank" | "short_answer" | "matching" | "ordering",
      "topic": "Topic name extracted from document",
      "difficulty": "easy" | "medium" | "hard",
      "questionText": "The question text",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "The correct answer string",
      "explanation": "Why this answer is correct, referencing the document",
      "hint": "Optional hint for learn mode",
      "sourceReference": "Page X or Section Y where this information appears",
      "timeEstimate": 30,
      "matchingPairs": [ {"left": "Item 1", "right": "Match 1"}, ... ],
      "orderingItems": [ "First Step", "Second Step", ... ]
    }
  ]
}

QUESTION TYPE RULES:
- multiple_choice: Always provide exactly 4 options labeled A, B, C, D. correctAnswer should be the letter (e.g. "A").
- true_false: options should be ["True", "False"]. correctAnswer should be "True" or "False".
- fill_blank: questionText should contain "___" for the blank. correctAnswer is the word/phrase.
- short_answer: No options needed. correctAnswer should be a brief expected response.
- matching: Provide 3-5 pairs in 'matchingPairs'. CRITICAL: Each 'left' value must be UNIQUE (no duplicates). Each 'right' value must be UNIQUE (no duplicates). 'questionText' should be "Match the following...". Ignore 'options' and 'correctAnswer'.
- ordering: Provide 3-5 items in 'orderingItems' in the CORRECT chronological or logical order. 'questionText' should be "Arrange the following...". Ignore 'options' and 'correctAnswer'.`;

export function buildPrompt(
  documentContent: string,
  mode: "learn" | "revision" | "test",
  questionCount: number | undefined,
  questionTypes: string[]
): string {
  const countInstruction = questionCount
    ? `NUMBER OF QUESTIONS TO GENERATE: ${questionCount}
    
    Generate exactly ${questionCount} questions using only the allowed question types.`
    : `NUMBER OF QUESTIONS TO GENERATE: Determine based on content coverage (Target: 20-50 questions).
    
    Aim to generate between 20 and 50 questions that comprehensively cover the document. 
    However, if the document content is short or insufficient to support 20 unique, high-quality questions, generate as many as possible without redundancy. Do not exceed 50 questions.`;

  return `${SYSTEM_PROMPT}

${MODE_INSTRUCTIONS[mode]}

ALLOWED QUESTION TYPES: ${questionTypes.join(", ")}
${countInstruction}

${OUTPUT_FORMAT}

---
DOCUMENT CONTENT TO GENERATE QUESTIONS FROM:
---
${documentContent}
---

Generate questions using only the allowed question types. Ensure variety in topics covered.`;
}