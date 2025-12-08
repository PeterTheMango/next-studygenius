import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateQuestions } from "@/lib/gemini/question-generator";
import { z } from "zod";

const GenerateQuizSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string().min(1).max(200),
  mode: z.enum(["learn", "revision", "test"]),
  settings: z.object({
    questionCount: z.number().min(5).max(50).optional(),
    questionTypes: z
      .array(
        z.enum(["multiple_choice", "true_false", "fill_blank", "short_answer", "matching", "ordering"])
      )
      .min(1),
    difficulty: z.enum(["mixed", "easy", "medium", "hard"]).default("mixed"),
    timeLimit: z.number().optional(),
    timeLimitPerQuestion: z.number().optional(),
  }),
});

export async function POST(request: NextRequest) {
  console.log("POST /api/quizzes/generate called");
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

    // Create quiz record
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        document_id: documentId,
        user_id: user.id,
        title,
        mode,
        settings,
        status: "generating",
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

    try {
      // Generate questions using Gemini
      const questions = await generateQuestions({
        documentContent: document.extracted_text,
        mode,
        questionCount: settings.questionCount,
        questionTypes: settings.questionTypes,
      });

      // Insert questions
      const questionRecords = questions.map((q, index) => ({
        quiz_id: quiz.id,
        type: q.type,
        topic: q.topic,
        difficulty: q.difficulty,
        question_text: q.questionText,
        options: q.type === 'matching' ? q.matchingPairs : 
                 q.type === 'ordering' ? q.orderingItems : 
                 q.options || null,
        correct_answer: q.correctAnswer || "", // Handle optional correct answer
        explanation: q.explanation,
        hint: q.hint || null,
        source_reference: q.sourceReference || null,
        time_estimate: q.timeEstimate,
        order_index: index,
      }));

      const { error: insertError } = await supabase
        .from("questions")
        .insert(questionRecords);

      if (insertError) {
        throw insertError;
      }

      // Update quiz status
      const updates: any = {
        status: "ready",
        question_count: questions.length,
      };

      // Calculate time limit if per-question limit is set
      if (settings.timeLimitPerQuestion) {
        updates.settings = {
          ...settings,
          timeLimit: questions.length * settings.timeLimitPerQuestion,
          questionCount: questions.length // Store actual count
        };
      } else {
        // Just update count in settings for consistency
        updates.settings = {
            ...settings,
            questionCount: questions.length
        };
      }

      await supabase
        .from("quizzes")
        .update(updates)
        .eq("id", quiz.id);

      return NextResponse.json(
        {
          success: true,
          quiz: {
            ...quiz,
            status: "ready",
            question_count: questions.length,
          },
        },
        { status: 201 }
      );
    } catch (genError) {
      // Mark quiz as failed if generation fails
      await supabase
        .from("quizzes")
        .update({ status: "draft" })
        .eq("id", quiz.id);

      console.error("Question generation error:", genError);
      return NextResponse.json(
        {
          error: "Failed to generate questions",
          quizId: quiz.id, // Return quiz ID so user can retry
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Generate handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
