import { NextRequest, NextResponse } from "next/server";
import { genAI, GEMINI_MODEL } from "@/lib/gemini/client";

export async function POST(req: NextRequest) {
  try {
    const { questionText, modelAnswer, userAnswer } = await req.json();

    if (!questionText || !userAnswer) {
      return NextResponse.json(
        { error: "Missing question or answer" },
        { status: 400 }
      );
    }

    const prompt = `
      You are an expert teacher grading a quiz. 
      Evaluate the student's answer against the model answer for the given question.
      
      Question: "${questionText}"
      Model Answer: "${modelAnswer || 'N/A'}"
      Student Answer: "${userAnswer}"
      
      Task:
      1. Determine if the student's answer is semantically correct. It does NOT need to match the model answer word-for-word. Synonyms, paraphrasing, and correct conceptual understanding should be accepted.
      2. If the answer is partially correct but misses key details required by the question, mark it as incorrect.
      3. Provide a brief explanation (max 2 sentences) directly addressing the student. 
      
      Return ONLY a valid JSON object with no markdown formatting:
      {
        "isCorrect": boolean,
        "explanation": "Your explanation here"
      }
    `;

    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: prompt }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    let responseText = response.text || "{}";
    // Clean potential markdown just in case, though responseMimeType helps
    responseText = responseText.replace(/```json\n?|\n?```/g, "").trim();

    const result = JSON.parse(responseText);

    return NextResponse.json({
        isCorrect: result.isCorrect,
        explanation: result.explanation
    });

  } catch (error) {
    console.error("Answer evaluation error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate answer" },
      { status: 500 }
    );
  }
}
