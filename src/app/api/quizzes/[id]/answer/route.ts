import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { genAI, GEMINI_MODEL } from "@/lib/gemini/client";

/**
 * POST /api/quizzes/[id]/answer
 *
 * Saves or updates a single answer for a quiz question.
 * This endpoint is called incrementally as the user submits each answer.
 * Triggers AI evaluation for pending responses when they sync from offline.
 *
 * Request body:
 * {
 *   attemptId: string;
 *   questionId: string;
 *   answer: any (string, array, object);
 *   isCorrect: boolean | null (null for pending evaluation);
 *   score?: number | null (0-100 for AI-evaluated answers, null for pending);
 *   timeSpent: number (seconds);
 *   evaluationStatus: 'pending' | 'evaluated' | 'failed';
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: quizId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId, questionId, answer, isCorrect, score, timeSpent, evaluationStatus = 'evaluated' } = await request.json();

    // Validate required fields
    if (!attemptId || !questionId || answer === undefined || timeSpent === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: attemptId, questionId, answer, timeSpent" },
        { status: 400 }
      );
    }

    // Validate that attempt belongs to user and is in progress
    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .select("id, quiz_id, user_id, status")
      .eq("id", attemptId)
      .eq("user_id", user.id)
      .eq("quiz_id", quizId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: "Invalid attempt or unauthorized" },
        { status: 403 }
      );
    }

    if (attempt.status !== "in_progress") {
      return NextResponse.json(
        { error: "Cannot save answer to a completed or abandoned quiz" },
        { status: 400 }
      );
    }

    // Validate that question belongs to this quiz and get question details
    const { data: question, error: questionError } = await supabase
      .from("questions")
      .select("id, quiz_id, type, question_text, correct_answer")
      .eq("id", questionId)
      .eq("quiz_id", quizId)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: "Question not found or does not belong to this quiz" },
        { status: 404 }
      );
    }

    // Determine if AI evaluation is needed
    const needsAIEvaluation = evaluationStatus === 'pending' &&
                              (question.type === 'short_answer' || question.type === 'fill_blank');

    let finalIsCorrect = isCorrect;
    let finalScore = score;
    let finalEvaluationStatus = evaluationStatus;

    // Trigger AI evaluation if needed
    if (needsAIEvaluation) {
      try {
        const prompt = `
          You are an objective grading assistant. Your task is to evaluate how well the STUDENT ANSWER matches the meaning of the REFERENCE ANSWER. You must judge only semantic relevance, not wording, grammar, length, or examples.

          Your evaluation rules:
          - Focus ONLY on whether the student's answer expresses the same core ideas as the reference.
          - Ignore stylistic differences, ordering, or level of detail.
          - Do NOT penalize paraphrasing or simplified wording.
          - Consider the answer correct if it conveys the essential meaning.
          - Score relevance from 0 to 100.
          - If the score is greater than or equal to the threshold, the answer is PASS; otherwise FAIL.

          REFERENCE ANSWER:
          "${question.correct_answer || "N/A"}"

          STUDENT ANSWER:
          "${answer}"

          THRESHOLD:
          70

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
        responseText = responseText.replace(/```json\n?|\n?```/g, "").trim();
        const result = JSON.parse(responseText);

        finalIsCorrect = result.result === "PASS";
        finalScore = result.score;
        finalEvaluationStatus = 'evaluated';
      } catch (error) {
        console.error("AI evaluation failed:", error);
        // Keep as pending on evaluation failure
        finalIsCorrect = null;
        finalScore = null;
        finalEvaluationStatus = 'failed';
      }
    }

    // Prepare the response data
    const responseData = {
      attempt_id: attemptId,
      question_id: questionId,
      user_answer: typeof answer === 'object' ? JSON.stringify(answer) : String(answer),
      is_correct: finalIsCorrect,
      score: finalScore ?? null,
      time_spent: timeSpent,
      answered_at: new Date().toISOString(),
      evaluation_status: finalEvaluationStatus,
    };

    // Upsert the response (overwrite if exists, insert if new)
    const { data: savedResponse, error: upsertError } = await supabase
      .from("question_responses")
      .upsert(responseData, {
        onConflict: "attempt_id,question_id",
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (upsertError) {
      console.error("Failed to save answer:", upsertError);
      return NextResponse.json(
        { error: "Failed to save answer", details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      response: {
        id: savedResponse.id,
        questionId: savedResponse.question_id,
        savedAt: savedResponse.answered_at,
        isCorrect: savedResponse.is_correct,
        score: savedResponse.score,
        evaluationStatus: savedResponse.evaluation_status,
      },
    });

  } catch (error) {
    console.error("Save answer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
