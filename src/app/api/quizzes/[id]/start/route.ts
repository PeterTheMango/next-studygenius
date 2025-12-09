import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shuffleQuestions, generateOptionSeeds } from "@/lib/shuffle";

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

    // Get quiz with questions
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select(
        `
        *,
        questions (
          id,
          type,
          topic,
          difficulty,
          question_text,
          options,
          hint,
          time_estimate,
          order_index
        )
      `
      )
      .eq("id", quizId)
      .eq("user_id", user.id)
      .eq("status", "ready")
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Sort questions by order_index first
    const sortedQuestions = quiz.questions.sort(
      (a: any, b: any) => a.order_index - b.order_index
    );

    // Generate shuffled question order (for all modes)
    // We need to create a temporary ID for seeding since we don't have attemptId yet
    const tempSeed = `${quizId}-${user.id}-${Date.now()}`;
    const questionOrder = shuffleQuestions(
      sortedQuestions.map((q: any) => ({ id: q.id })),
      tempSeed
    );

    // Generate option shuffle seeds for each question
    const optionSeeds = generateOptionSeeds(
      sortedQuestions.map((q: any) => ({ id: q.id })),
      tempSeed
    );

    // Create attempt with shuffled question order
    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: quizId,
        user_id: user.id,
        mode: quiz.mode,
        total_questions: quiz.questions.length,
        status: "in_progress",
        question_order: {
          questions: questionOrder,
          optionSeeds: optionSeeds,
        },
      })
      .select()
      .single();

    if (attemptError) {
      console.error("Attempt creation error:", attemptError);
      return NextResponse.json(
        { error: "Failed to start quiz" },
        { status: 500 }
      );
    }

    // Remove hints for non-learn modes
    const questions = sortedQuestions.map((q: any) => ({
      id: q.id,
      type: q.type,
      topic: q.topic,
      difficulty: q.difficulty,
      questionText: q.question_text,
      options: q.options,
      timeEstimate: q.time_estimate,
      ...(quiz.mode === "learn" && q.hint ? { hint: q.hint } : {}),
    }));

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        quizId,
        mode: quiz.mode,
        startedAt: attempt.started_at,
        timeLimit: quiz.settings?.timeLimit || null,
        totalQuestions: questions.length,
        questionOrder: questionOrder,
        optionSeeds: optionSeeds,
      },
      questions,
    });
  } catch (error) {
    console.error("Start quiz error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
