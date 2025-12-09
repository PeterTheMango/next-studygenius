import { genAI, GEMINI_MODEL } from "./client";
import { buildPrompt } from "./prompts";
import { z } from "zod";

// Validation schema for generated questions
const QuestionSchema = z.object({
  type: z.enum([
    "multiple_choice",
    "true_false",
    "fill_blank",
    "short_answer",
    "matching",
    "ordering",
  ]),
  topic: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  questionText: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(), // Made optional for matching/ordering
  explanation: z.string(),
  hint: z.string().optional(),
  sourceReference: z.string().optional(),
  timeEstimate: z.number().default(30),
  matchingPairs: z
    .array(z.object({ left: z.string(), right: z.string() }))
    .optional(),
  orderingItems: z.array(z.string()).optional(),
});

const GeneratedQuestionsSchema = z.object({
  questions: z.array(QuestionSchema),
});

export type GeneratedQuestion = z.infer<typeof QuestionSchema>;

interface GenerateQuestionsParams {
  documentContent: string;
  mode: "learn" | "revision" | "test";
  questionCount?: number;
  questionTypes: string[];
}

export async function generateQuestions({
  documentContent,
  mode,
  questionCount,
  questionTypes,
}: GenerateQuestionsParams): Promise<GeneratedQuestion[]> {
  const prompt = buildPrompt(
    documentContent,
    mode,
    questionCount,
    questionTypes
  );

  try {
    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    let responseText = response.text || "";

    // Clean response text (remove markdown code blocks if present)
    responseText = responseText.replace(/```json\n?|\n?```/g, "").trim();

    // Parse and validate the response
    const parsed = JSON.parse(responseText);
    const validated = GeneratedQuestionsSchema.parse(parsed);

    // Add hints only for learn mode
    if (mode !== "learn") {
      validated.questions.forEach((q) => {
        delete q.hint;
      });
    }

    return validated.questions;
  } catch (error) {
    console.error("Question generation error:", error);
    throw new Error("Failed to generate questions. Please try again.");
  }
}

// Extract topics from document for preview
export async function extractTopics(
  documentContent: string
): Promise<string[]> {
  const prompt = `Analyze the following document and extract the main topics/sections covered.
The document has been pre-filtered to remove cover pages, table of contents, and non-content pages.
Return ONLY a JSON array of topic strings, nothing else.
Example: ["Introduction to Cells", "Cell Membrane", "Mitochondria"]

DOCUMENT:
${documentContent.slice(0, 15000)}

Return the topics array:`;

  try {
    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    let text = response.text || "[]";
    text = text.replace(/```json\n?|\n?```/g, "").trim();

    return JSON.parse(text);
  } catch {
    return ["General"];
  }
}
