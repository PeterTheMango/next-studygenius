import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_RETRIES = 3;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch quiz and verify ownership + failed status
    const { data: quiz, error } = await supabase
      .from("quizzes")
      .select("*, documents(extracted_text)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (quiz.status !== "failed") {
      return NextResponse.json(
        { error: "Quiz is not in a failed state" },
        { status: 400 }
      );
    }

    if ((quiz.retry_count ?? 0) >= MAX_RETRIES) {
      return NextResponse.json(
        { error: "Maximum retry attempts reached" },
        { status: 400 }
      );
    }

    const documentContent = (quiz.documents as any)?.extracted_text;
    if (!documentContent) {
      return NextResponse.json(
        { error: "Document content not available" },
        { status: 400 }
      );
    }

    // Delete any partial questions from failed attempt
    await supabase
      .from("questions")
      .delete()
      .eq("quiz_id", id);

    // Reset quiz to queued
    await supabase
      .from("quizzes")
      .update({
        status: "queued",
        error_message: null,
        error_stage: null,
        generation_stage: null,
        generation_started_at: null,
        generation_completed_at: null,
        retry_count: (quiz.retry_count ?? 0) + 1,
      })
      .eq("id", id);

    // Re-invoke Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const settings = quiz.settings as any;
      fetch(`${supabaseUrl}/functions/v1/generate-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          quizId: id,
          documentContent,
          mode: quiz.mode,
          settings: settings || {
            questionTypes: ["multiple_choice", "true_false"],
            difficulty: "mixed",
          },
          userId: user.id,
          documentId: quiz.document_id,
        }),
      }).catch((err) => {
        console.error("Failed to invoke Edge Function for retry:", err);
        supabase
          .from("quizzes")
          .update({
            status: "failed",
            error_message: "Failed to restart generation",
            error_stage: "queued",
          })
          .eq("id", id)
          .then(() => {});
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Retry handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
