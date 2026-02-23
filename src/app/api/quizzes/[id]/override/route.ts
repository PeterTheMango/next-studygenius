import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/quizzes/[id]/override
 *
 * Overrides the correctness of a quiz answer, marking it as correct
 * and updating the score to 100. This bypasses AI evaluation.
 *
 * Request body:
 * {
 *   attemptId: string;
 *   questionId: string;
 *   responseId?: string; // Optional: specific response ID to override
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

    const { attemptId, questionId, responseId } = await request.json();

    // Validate required fields
    if (!attemptId || !questionId) {
      return NextResponse.json(
        { error: "Missing required fields: attemptId, questionId" },
        { status: 400 }
      );
    }

    // Validate that attempt belongs to user
    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .select("id, quiz_id, user_id")
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

    // Validate that question belongs to this quiz
    const { data: question, error: questionError } = await supabase
      .from("questions")
      .select("id, quiz_id")
      .eq("id", questionId)
      .eq("quiz_id", quizId)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: "Question not found or does not belong to this quiz" },
        { status: 404 }
      );
    }

    // Find the response to override
    // If responseId is provided, use that specific response
    // Otherwise, find the latest response for this question
    let responseToUpdate;

    if (responseId) {
      const { data, error } = await supabase
        .from("question_responses")
        .select("*")
        .eq("id", responseId)
        .eq("attempt_id", attemptId)
        .eq("question_id", questionId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "Response not found" },
          { status: 404 }
        );
      }

      responseToUpdate = data;
    } else {
      // Find the latest response for this question
      const { data: allResponses, error: checkError } = await supabase
        .from("question_responses")
        .select("*")
        .eq("attempt_id", attemptId)
        .eq("question_id", questionId)
        .order("attempt_number", { ascending: false });

      if (checkError) {
        return NextResponse.json(
          { error: "Database query failed", details: checkError.message },
          { status: 500 }
        );
      }

      if (!allResponses || allResponses.length === 0) {
        return NextResponse.json(
          {
            error: "No response found for this question",
            details: `No responses found for attemptId: ${attemptId}, questionId: ${questionId}`
          },
          { status: 404 }
        );
      }

      // Use the latest response (first in the ordered list)
      responseToUpdate = allResponses[0];
    }

    // Update the response to mark it as correct
    const { data: updatedResponses, error: updateError } = await supabase
      .from("question_responses")
      .update({
        is_correct: true,
        score: 100,
        evaluation_status: "evaluated",
      })
      .eq("id", responseToUpdate.id)
      .select();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to override answer", details: updateError.message },
        { status: 500 }
      );
    }

    if (!updatedResponses || updatedResponses.length === 0) {
      return NextResponse.json(
        {
          error: "Failed to update response",
          details: "No rows were updated. This may be due to missing RLS policy for UPDATE operations."
        },
        { status: 403 }
      );
    }

    const updatedResponse = updatedResponses[0];

    // Recalculate the attempt score if the attempt is completed
    const { data: attemptData } = await supabase
      .from("quiz_attempts")
      .select("status, total_questions")
      .eq("id", attemptId)
      .single();

    if (attemptData?.status === "completed") {
      // Get the latest evaluated response for each question
      const { data: allResponses } = await supabase
        .from("question_responses")
        .select("question_id, is_correct, evaluation_status, attempt_number")
        .eq("attempt_id", attemptId)
        .eq("evaluation_status", "evaluated")
        .order("attempt_number", { ascending: false });

      if (allResponses) {
        // Count distinct questions where the latest evaluated response is correct
        const questionMap = new Map<string, boolean>();
        for (const resp of allResponses) {
          if (!questionMap.has(resp.question_id)) {
            questionMap.set(resp.question_id, resp.is_correct);
          }
        }

        const correctCount = Array.from(questionMap.values()).filter(
          (isCorrect) => isCorrect
        ).length;

        const score = attemptData.total_questions > 0
          ? correctCount / attemptData.total_questions
          : 0;

        // Update the attempt score
        await supabase
          .from("quiz_attempts")
          .update({
            correct_answers: correctCount,
            score: score,
          })
          .eq("id", attemptId);
      }
    }

    return NextResponse.json({
      success: true,
      response: {
        id: updatedResponse.id,
        questionId: updatedResponse.question_id,
        isCorrect: updatedResponse.is_correct,
        score: updatedResponse.score,
        evaluationStatus: updatedResponse.evaluation_status,
      },
    });

  } catch (error) {
    console.error("Override answer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
