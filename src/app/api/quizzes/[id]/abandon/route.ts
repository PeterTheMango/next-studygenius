import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/quizzes/[id]/abandon
 *
 * Abandons an in-progress quiz attempt and creates a new one.
 * Used when user chooses "Start Fresh" instead of resuming.
 *
 * Request body:
 * {
 *   attemptId: string; // The attempt to abandon
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   newAttempt: { id, quizId, mode, ... }
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

    const { attemptId } = await request.json();

    if (!attemptId) {
      return NextResponse.json(
        { error: "Missing attemptId" },
        { status: 400 }
      );
    }

    // Validate that attempt belongs to user
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

    // Only abandon if status is in_progress
    if (attempt.status !== "in_progress") {
      return NextResponse.json(
        { error: "Attempt is not in progress" },
        { status: 400 }
      );
    }

    // Mark attempt as abandoned
    const { error: updateError } = await supabase
      .from("quiz_attempts")
      .update({ status: "abandoned" })
      .eq("id", attemptId);

    if (updateError) {
      console.error("Failed to abandon attempt:", updateError);
      return NextResponse.json(
        { error: "Failed to abandon attempt" },
        { status: 500 }
      );
    }

    // Fetch quiz to create new attempt
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("id, mode, questions(id)")
      .eq("id", quizId)
      .eq("user_id", user.id)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // Create new attempt
    const { data: newAttempt, error: createError } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: quizId,
        user_id: user.id,
        mode: quiz.mode,
        total_questions: quiz.questions.length,
        status: "in_progress",
      })
      .select()
      .single();

    if (createError || !newAttempt) {
      console.error("Failed to create new attempt:", createError);
      return NextResponse.json(
        { error: "Failed to create new attempt" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newAttempt: {
        id: newAttempt.id,
        quizId: newAttempt.quiz_id,
        mode: newAttempt.mode,
        startedAt: newAttempt.started_at,
        totalQuestions: newAttempt.total_questions,
      },
    });

  } catch (error) {
    console.error("Abandon quiz error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
