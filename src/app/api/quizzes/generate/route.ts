import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const GenerateQuizSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string().min(1).max(200),
  mode: z.enum(["learn", "revision", "test"]),
  idempotencyKey: z.string().uuid().optional(),
  settings: z.object({
    questionCount: z.number().min(5).max(50).optional(),
    questionTypes: z
      .array(
        z.enum([
          "multiple_choice",
          "true_false",
          "fill_blank",
          "short_answer",
          "matching",
          "ordering",
        ])
      )
      .min(1),
    difficulty: z.enum(["mixed", "easy", "medium", "hard"]).default("mixed"),
    timeLimit: z.number().optional(),
    timeLimitPerQuestion: z.number().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = GenerateQuizSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { documentId, title, mode, settings } = validationResult.data;

    // Get document with extracted text
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .eq("status", "ready")
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found or not ready" },
        { status: 404 }
      );
    }

    if (!document.extracted_text) {
      return NextResponse.json(
        { error: "Document has no extracted text" },
        { status: 400 }
      );
    }

    // Idempotency check: look for a quiz with same params created in last 30s
    const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();
    const { data: existingQuiz } = await supabase
      .from("quizzes")
      .select("id, status")
      .eq("document_id", documentId)
      .eq("user_id", user.id)
      .eq("title", title)
      .eq("mode", mode)
      .gte("created_at", thirtySecondsAgo)
      .in("status", ["queued", "generating", "cleaning", "structuring", "finalizing"])
      .limit(1)
      .single();

    if (existingQuiz) {
      // Return existing quiz instead of creating a duplicate
      return NextResponse.json(
        { quizId: existingQuiz.id },
        { status: 201 }
      );
    }

    // Create quiz record with queued status
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        document_id: documentId,
        user_id: user.id,
        title,
        mode,
        settings,
        status: "queued",
      })
      .select()
      .single();

    if (quizError) {
      console.error("Quiz creation error:", quizError);
      return NextResponse.json(
        { error: "Failed to create quiz" },
        { status: 500 }
      );
    }

    // Fire-and-forget: invoke Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      fetch(`${supabaseUrl}/functions/v1/generate-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          quizId: quiz.id,
          documentContent: document.extracted_text,
          mode,
          settings,
          userId: user.id,
          documentId,
        }),
      }).catch((err) => {
        console.error("Failed to invoke Edge Function:", err);
        // Mark quiz as failed if we can't even invoke the function
        supabase
          .from("quizzes")
          .update({
            status: "failed",
            error_message: "Failed to start generation",
            error_stage: "queued",
          })
          .eq("id", quiz.id)
          .then(() => {});
      });
    } else {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Edge Function invocation");
      await supabase
        .from("quizzes")
        .update({
          status: "failed",
          error_message: "Server configuration error",
          error_stage: "queued",
        })
        .eq("id", quiz.id);
    }

    // Return immediately with quiz ID
    return NextResponse.json(
      { quizId: quiz.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Generate handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
