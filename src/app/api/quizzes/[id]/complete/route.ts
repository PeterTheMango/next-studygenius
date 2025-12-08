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
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
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

    // Prepare batch insert data
    const responsesToInsert = responses.map((r: any) => ({
      attempt_id: attemptId,
      question_id: r.questionId,
      user_answer: typeof r.answer === 'object' ? JSON.stringify(r.answer) : r.answer,
      is_correct: r.isCorrect,
      time_spent: r.timeSpent,
    }));

    // Batch insert responses
    const { error: insertError } = await supabase
      .from("question_responses")
      .upsert(responsesToInsert, { onConflict: "attempt_id,question_id" });

    if (insertError) {
      console.error("Batch save error:", insertError);
      return NextResponse.json(
        { error: "Failed to save responses" },
        { status: 500 }
      );
    }

    // Calculate score
    const correctCount = responses.filter((r: any) => r.isCorrect).length;
    const completedAt = new Date();

    // Calculate time_spent (completed_at - started_at in seconds)
    const startedAt = new Date(attempt.started_at);
    const timeSpentSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

    // Calculate score (correct_answers / total_questions) as decimal
    const scoreDecimal = correctCount / attempt.total_questions;

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
    });

  } catch (error) {
    console.error("Complete quiz error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
