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

    const { attemptId, questionId, answer, timeSpent } = await request.json();

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

    // Get question with correct answer
    const { data: question, error: questionError } = await supabase
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .eq("quiz_id", quizId)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Check if correct
    const isCorrect =
      answer?.toLowerCase().trim() ===
      question.correct_answer?.toLowerCase().trim();

    // Save response
    const { error: responseError } = await supabase
      .from("question_responses")
      .upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          user_answer: answer,
          is_correct: isCorrect,
          time_spent: timeSpent,
        },
        {
          onConflict: "attempt_id,question_id",
        }
      );

    if (responseError) {
      console.error("Response save error:", responseError);
      return NextResponse.json(
        { error: "Failed to save response" },
        { status: 500 }
      );
    }

    // Update attempt stats
    const { data: responses } = await supabase
      .from("question_responses")
      .select("question_id, is_correct, attempt_number")
      .eq("attempt_id", attemptId);

    // Group responses by question_id to handle retries correctly
    const responsesByQuestion = (responses || []).reduce((acc: Record<string, any[]>, response) => {
      if (!acc[response.question_id]) {
        acc[response.question_id] = [];
      }
      acc[response.question_id].push(response);
      return acc;
    }, {});

    // Count correct answers, one per question (latest correct response wins)
    let correctCount = 0;
    for (const questionId in responsesByQuestion) {
      const questionResponses = responsesByQuestion[questionId];
      questionResponses.sort((a, b) => (a.attempt_number || 1) - (b.attempt_number || 1));
      const latestResponse = questionResponses[questionResponses.length - 1];
      if (latestResponse.is_correct) {
        correctCount++;
      }
    }

    await supabase
      .from("quiz_attempts")
      .update({ correct_answers: correctCount })
      .eq("id", attemptId);

    const mode = attempt.quizzes.mode;

    // For test mode, don't reveal answers
    if (mode === "test") {
      return NextResponse.json({
        success: true,
        received: true,
        progress: {
          answered: responses?.length || 0,
          total: attempt.total_questions,
        },
      });
    }

    // For learn/revision modes, show feedback
    return NextResponse.json({
      success: true,
      isCorrect,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
      sourceReference: question.source_reference,
      progress: {
        answered: responses?.length || 0,
        total: attempt.total_questions,
        correctSoFar: correctCount,
      },
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
