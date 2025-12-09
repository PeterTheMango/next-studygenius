import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/quizzes/[id]/check-progress
 *
 * Checks if the user has an in-progress attempt for this quiz.
 * If yes, returns the attempt with saved responses.
 * If no, returns quiz data for creating a new attempt.
 *
 * Implements 7-day expiration: attempts older than 7 days are auto-abandoned.
 *
 * Response:
 * {
 *   quiz: { ... },
 *   questions: [ ... ],
 *   inProgressAttempt?: {
 *     id, startedAt, answeredCount, responses: [ ... ]
 *   }
 * }
 */
export async function GET(
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

    // Fetch quiz with questions
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select(`
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
          order_index,
          correct_answer,
          explanation,
          source_reference
        )
      `)
      .eq("id", quizId)
      .eq("user_id", user.id)
      .eq("status", "ready")
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Sort questions by order_index
    const sortedQuestions = quiz.questions.sort(
      (a: any, b: any) => a.order_index - b.order_index
    );

    // Map to frontend interface
    const mappedQuestions = sortedQuestions.map((q: any) => ({
      id: q.id,
      type: q.type,
      topic: q.topic,
      difficulty: q.difficulty,
      questionText: q.question_text,
      options: (q.type === 'multiple_choice' || q.type === 'true_false') ? q.options : undefined,
      hint: q.hint,
      timeEstimate: q.time_estimate,
      matchingPairs: q.type === 'matching' ? q.options : undefined,
      orderingItems: q.type === 'ordering' ? q.options : undefined,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      sourceReference: q.source_reference,
    }));

    // Check for in-progress attempts (within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: attempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select("id, started_at, status, question_order")
      .eq("quiz_id", quizId)
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .gte("started_at", sevenDaysAgo.toISOString())
      .order("started_at", { ascending: false })
      .limit(1);

    if (attemptsError) {
      console.error("Failed to fetch attempts:", attemptsError);
      // Continue without in-progress attempt
    }

    let inProgressAttempt = null;

    if (attempts && attempts.length > 0) {
      const attempt = attempts[0];

      // Fetch saved responses for this attempt
      const { data: responses, error: responsesError } = await supabase
        .from("question_responses")
        .select("id, question_id, user_answer, is_correct, score, time_spent, answered_at")
        .eq("attempt_id", attempt.id);

      if (responsesError) {
        console.error("Failed to fetch responses:", responsesError);
      } else {
        // Map responses to SavedResponse interface
        const mappedResponses = (responses || []).map((r: any) => ({
          id: r.id,
          questionId: r.question_id,
          answer: r.user_answer,
          isCorrect: r.is_correct,
          score: r.score,
          timeSpent: r.time_spent,
          answeredAt: r.answered_at,
        }));

        inProgressAttempt = {
          id: attempt.id,
          startedAt: attempt.started_at,
          answeredCount: mappedResponses.length,
          responses: mappedResponses,
          questionOrder: attempt.question_order,
        };
      }
    }

    // Auto-abandon attempts older than 7 days (cleanup)
    const { error: abandonError } = await supabase
      .from("quiz_attempts")
      .update({ status: "abandoned" })
      .eq("quiz_id", quizId)
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .lt("started_at", sevenDaysAgo.toISOString());

    if (abandonError) {
      console.error("Failed to auto-abandon old attempts:", abandonError);
    }

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        mode: quiz.mode,
        settings: quiz.settings,
      },
      questions: mappedQuestions,
      inProgressAttempt,
    });

  } catch (error) {
    console.error("Check progress error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
