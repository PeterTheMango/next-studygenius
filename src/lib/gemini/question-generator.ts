import { processDocument } from "../pipeline/process-document-service";
import { buildPrompt } from "./prompts";
import { z } from "zod";

// --- Validation Schemas ---

const QuestionSchema = z.object({
  type: z.enum([
    "multiple_choice",
    "true_false",
    "fill_blank",
    "short_answer",
    "matching",
    "ordering",
  ]),
  topic: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  questionText: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().min(1),
  hint: z.string().optional(),
  sourceReference: z.string().optional(),
  timeEstimate: z.number().min(10).max(300).default(30),
  matchingPairs: z
    .array(z.object({ left: z.string(), right: z.string() }))
    .min(3)
    .max(8)
    .optional(),
  orderingItems: z.array(z.string()).min(3).max(5).optional(),
});

const GeneratedQuestionsSchema = z.object({
  questions: z.array(QuestionSchema).min(1),
});

export type GeneratedQuestion = z.infer<typeof QuestionSchema>;

interface GenerateQuestionsParams {
  documentContent: string;
  mode: "learn" | "revision" | "test";
  questionCount?: number;
  questionTypes: string[];
  difficulty?: "easy" | "mixed" | "hard";
  quizId?: string;
  documentId?: string;
  userId?: string;
}

// --- Question Generation ---

export async function generateQuestions({
  documentContent,
  mode,
  questionCount,
  questionTypes,
  difficulty,
  quizId,
  documentId,
  userId,
}: GenerateQuestionsParams): Promise<GeneratedQuestion[]> {
  const prompt = buildPrompt(
    documentContent,
    mode,
    questionCount,
    questionTypes,
    difficulty,
  );

  try {
    const response = await processDocument({
      task: "quiz_generate",
      contents: [{ text: prompt }],
      responseMimeType: "application/json",
      quizId,
      documentId,
      userId,
    });

    const responseText = response.text?.trim();
    if (!responseText) {
      throw new Error("Empty response from model");
    }

    const parsed = JSON.parse(
      responseText.replace(/```json\n?|\n?```/g, "").trim(),
    );
    const validated = GeneratedQuestionsSchema.parse(parsed);

    // Strip hints outside learn mode
    if (mode !== "learn") {
      validated.questions.forEach((q) => delete q.hint);
    }

    return validated.questions;
  } catch (error) {
    console.error("Question generation error:", error);

    if (error instanceof z.ZodError) {
      throw new Error(
        `Generated questions failed validation: ${error.issues.map((i) => i.message).join(", ")}`,
      );
    }
    if (error instanceof SyntaxError) {
      throw new Error("Model returned invalid JSON. Please try again.");
    }

    throw new Error("Failed to generate questions. Please try again.");
  }
}

// --- Topic Extraction ---

const TOPIC_EXTRACTION_PROMPT = `Extract the main topics and sections from this educational document.

<rules>
- Return topics in the order they appear in the document.
- Use concise, descriptive names (e.g., "Cell Membrane Structure" not "The part about cell membranes").
- Only include topics with substantial content — skip incidental mentions.
- Aim for 3–15 topics depending on document scope.
</rules>

Return ONLY a JSON array of topic strings.

<document>
`;

export async function extractTopics(
  documentContent: string,
  documentId?: string,
  userId?: string,
): Promise<string[]> {
  const prompt = `${TOPIC_EXTRACTION_PROMPT}${documentContent.slice(0, 15000)}\n</document>`;

  try {
    const response = await processDocument({
      task: "topic_extract",
      contents: [{ text: prompt }],
      responseMimeType: "application/json",
      documentId,
      userId,
    });

    const text = response.text?.trim();
    if (!text) return ["General"];

    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    const validated = z.array(z.string().min(1)).min(1).parse(parsed);

    return validated;
  } catch {
    return ["General"];
  }
}
