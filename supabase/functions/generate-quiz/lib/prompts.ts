const SYSTEM_PROMPT = `You are an expert educational content creator. Generate quiz questions strictly from the provided document content.

<constraints>
- Every question MUST be directly answerable from the document text. Do not use external knowledge.
- Do not fabricate facts, infer beyond what is explicitly stated, or assume context not present in the document.
- If a topic lacks sufficient content for a quality question, skip it rather than generating a weak question.
- Reference the source page or section for each question when identifiable.
</constraints>`;

const MODE_INSTRUCTIONS: Record<string, string> = {
  learn: `<mode name="learn">
Purpose: Help users understand concepts for the first time.
- Provide explanatory context and hints with each question.
- Prioritize foundational concepts, definitions, and core relationships.
- Prefer simpler formats: multiple choice and true/false.
- Include "why" and "how" questions to build understanding.
- Explanations should teach the concept, not just confirm the answer.
- Difficulty distribution: 50% easy, 35% medium, 15% hard.
</mode>`,

  revision: `<mode name="revision">
Purpose: Test retention through active recall.
- No hints. Pure recall testing.
- Mix all question types to challenge different recall patterns.
- Include questions that connect multiple concepts from the document.
- Focus on key facts, definitions, formulas, and relationships.
- Vary difficulty to surface weak areas.
- Difficulty distribution: 30% easy, 45% medium, 25% hard.
</mode>`,

  test: `<mode name="test">
Purpose: Simulate realistic exam conditions.
- No hints or contextual scaffolding.
- Emphasize application, analysis, and critical thinking over memorization.
- Each question should be answerable in 30–90 seconds.
- Mix difficulty levels to mirror real exam distribution.
- Difficulty distribution: 20% easy, 50% medium, 30% hard.
</mode>`,
};

const DIFFICULTY_OVERRIDES: Record<string, { easy: number; medium: number; hard: number }> = {
  easy: { easy: 60, medium: 30, hard: 10 },
  hard: { easy: 10, medium: 30, hard: 60 },
};

const OUTPUT_FORMAT = `<output_format>
Return ONLY a valid JSON object. No markdown fences, no commentary, no preamble.

{
  "questions": [
    {
      "type": "multiple_choice | true_false | fill_blank | short_answer | matching | ordering",
      "topic": "Topic name from the document",
      "difficulty": "easy | medium | hard",
      "questionText": "The question",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "The correct answer",
      "explanation": "Why this is correct, referencing the document",
      "hint": "Optional — learn mode only, omit otherwise",
      "sourceReference": "Page X or Section Y",
      "timeEstimate": 30,
      "matchingPairs": [{"left": "Term", "right": "Definition"}],
      "orderingItems": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}

<type_rules>
- multiple_choice: Exactly 4 options labeled A, B, C, D. correctAnswer is the letter only (e.g., "B"). All distractors must be plausible but unambiguously wrong based on the document.
- true_false: options = ["True", "False"]. correctAnswer is "True" or "False". Avoid trivially obvious statements.
- fill_blank: questionText contains "___" for the blank. correctAnswer is the exact word or phrase. Omit options.
- short_answer: No options. correctAnswer is a brief expected response (1–2 sentences max).
- matching: 3–8 pairs in matchingPairs. Every left value must be unique. Right values MAY repeat (many-to-one). Include at least one repeated right value when possible. questionText starts with "Match the following". Omit options and correctAnswer.
- ordering: 3–5 items in orderingItems in the CORRECT order. questionText starts with "Arrange the following". Omit options and correctAnswer.
</type_rules>

<field_rules>
- Only include fields relevant to the question type. Omit unused fields entirely rather than setting them to null or empty arrays.
- hint is only included when the mode is "learn". Omit for revision and test modes.
- sourceReference should be as specific as possible: prefer "Page 12, Section 3.2" over "Page 12".
</field_rules>
</output_format>`;

export function buildPrompt(
  documentContent: string,
  mode: string,
  questionCount: number | undefined,
  questionTypes: string[],
  difficulty?: string,
): string {
  const countInstruction = questionCount
    ? `Generate exactly ${questionCount} questions.`
    : `Generate 20–50 questions for comprehensive coverage. If the document is too short to support 20 unique, high-quality questions, generate as many as the content supports without redundancy. Never exceed 50.`;

  let difficultySection = "";
  if (difficulty && difficulty !== "mixed" && DIFFICULTY_OVERRIDES[difficulty]) {
    const dist = DIFFICULTY_OVERRIDES[difficulty];
    difficultySection = `
<difficulty_override>
IMPORTANT: Override the mode's default difficulty distribution. Use this distribution instead:
- ${dist.easy}% easy questions
- ${dist.medium}% medium questions
- ${dist.hard}% hard questions
This takes priority over any difficulty distribution specified in the mode instructions above.
</difficulty_override>`;
  }

  return `${SYSTEM_PROMPT}

${MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.learn}

<generation_parameters>
Allowed question types: ${questionTypes.join(", ")}
Only use the types listed above. Do not generate other types.
${countInstruction}
Distribute topics proportionally to their coverage in the document — topics with more content get more questions.
</generation_parameters>
${difficultySection}
${OUTPUT_FORMAT}

<document>
${documentContent}
</document>`;
}
