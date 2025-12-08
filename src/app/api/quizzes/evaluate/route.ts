import { NextRequest, NextResponse } from "next/server";
import { genAI, GEMINI_MODEL } from "@/lib/gemini/client";

export async function POST(req: NextRequest) {
  try {
    const {
      questionText,
      modelAnswer,
      userAnswer,
      threshold = 65,
    } = await req.json();

    if (!questionText || !userAnswer) {
      return NextResponse.json(
        { error: "Missing question or answer" },
        { status: 400 }
      );
    }

    const prompt = `
      You are an objective grading assistant. Your task is to evaluate how well the STUDENT ANSWER matches the meaning of the REFERENCE ANSWER. You must judge only semantic relevance, not wording, grammar, length, or examples.

      Your evaluation rules:
      - Focus ONLY on whether the student’s answer expresses the same core ideas as the reference.
      - Ignore stylistic differences, ordering, or level of detail.
      - Do NOT penalize paraphrasing or simplified wording.
      - Consider the answer correct if it conveys the essential meaning.
      - Score relevance from 0 to 100.
      - If the score is greater than or equal to the threshold, the answer is PASS; otherwise FAIL.

      REFERENCE ANSWER:
      "${modelAnswer || "N/A"}"

      STUDENT ANSWER:
      "${userAnswer}"
      
      THRESHOLD:
      ${threshold}

      Return your evaluation in EXACTLY the following JSON format:

      {
        "score": <number between 0 and 100>,
        "result": "PASS" or "FAIL",
        "explanation": "<1-3 sentence justification>"
      }
    `;

    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    let responseText = response.text || "{}";
    // Clean potential markdown just in case, though responseMimeType helps
    responseText = responseText.replace(/```json\n?|\n?```/g, "").trim();

    const result = JSON.parse(responseText);

    return NextResponse.json({
      score: result.score,
      isCorrect: result.result === "PASS",
      explanation: result.explanation,
    });
  } catch (error) {
    console.error("Answer evaluation error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate answer" },
      { status: 500 }
    );
  }
}
