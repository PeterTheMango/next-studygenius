import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { attemptId, responses } = await request.json();

    if (!attemptId || !responses || !Array.isArray(responses)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Validate attempt belongs to user
    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .select("*, quizzes!inner(mode)")
      .eq("id", attemptId)
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
    }

    // Fetch existing responses to avoid overwriting incrementally saved data
    const { data: existingResponses } = await supabase
      .from("question_responses")
      .select("question_id, is_correct")
      .eq("attempt_id", attemptId);

    const existingQuestionIds = new Set(
      existingResponses?.map((r) => r.question_id) || []
    );

    // Only insert responses that weren't already saved incrementally
    const responsesToInsert = responses
      .filter((r: any) => !existingQuestionIds.has(r.questionId))
      .map((r: any) => ({
        attempt_id: attemptId,
        question_id: r.questionId,
        user_answer: typeof r.answer === 'object' ? JSON.stringify(r.answer) : r.answer,
        is_correct: r.isCorrect,
        score: r.score ?? null,
        time_spent: r.timeSpent,
      }));

    // Batch insert only new responses (if any)
    if (responsesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("question_responses")
        .insert(responsesToInsert);

      if (insertError) {
        console.error("Batch save error:", insertError);
        return NextResponse.json(
          { error: "Failed to save responses" },
          { status: 500 }
        );
      }
    }

    // Calculate score based on ALL saved responses (existing + newly inserted)
    // Only count evaluated responses for score calculation
    const { data: allResponses } = await supabase
      .from("question_responses")
      .select("is_correct, evaluation_status")
      .eq("attempt_id", attemptId);

    // Only count evaluated responses as correct
    // Pending evaluations are not counted as correct or incorrect yet
    const evaluatedResponses = allResponses?.filter((r) => r.evaluation_status === 'evaluated') || [];
    const correctCount = evaluatedResponses.filter((r) => r.is_correct).length || 0;
    const completedAt = new Date();

    // Calculate time_spent (completed_at - started_at in seconds)
    const startedAt = new Date(attempt.started_at);
    const timeSpentSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

    // Calculate score based on evaluated responses only
    // If there are pending evaluations, the score will be partial
    const pendingCount = allResponses?.filter((r) => r.evaluation_status === 'pending').length || 0;
    const scoreDecimal = evaluatedResponses.length > 0
      ? correctCount / attempt.total_questions
      : 0; // If no responses evaluated yet, score is 0

    // Update attempt status and score
    const { error: updateError } = await supabase
      .from("quiz_attempts")
      .update({
        status: "completed",
        correct_answers: correctCount,
        completed_at: completedAt.toISOString(),
        time_spent: timeSpentSeconds,
        score: scoreDecimal,
      })
      .eq("id", attemptId);

    if (updateError) {
       console.error("Attempt update error:", updateError);
       // We don't fail here because responses are saved
    }

    return NextResponse.json({
      success: true,
      redirect: `/quizzes/${quizId}/results?attempt=${attemptId}`,
      pendingEvaluations: pendingCount,
      message: pendingCount > 0
        ? `Quiz completed with ${pendingCount} answer${pendingCount > 1 ? 's' : ''} pending evaluation. Results will update when evaluations complete.`
        : undefined
    });

  } catch (error) {
    console.error("Complete quiz error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
