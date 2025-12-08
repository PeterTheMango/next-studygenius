import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTopics } from "@/lib/gemini/question-generator";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      );
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Update status to processing
    await supabase
      .from("documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(document.file_path);

    if (downloadError || !fileData) {
      await supabase
        .from("documents")
        .update({ status: "failed", error_message: "Failed to download file" })
        .eq("id", documentId);
      return NextResponse.json(
        { error: "Failed to download file" },
        { status: 500 }
      );
    }

    // Extract text from PDF using Gemini
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const { genAI, GEMINI_MODEL } = await import("@/lib/gemini/client");

    const extractionResponse = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64,
          },
        },
        {
          text: "Extract all text content from this PDF document. Return only the extracted text, preserving the structure and formatting as much as possible.",
        },
      ],
    });

    const extractedText = extractionResponse.text;

    if (!extractedText || extractedText.length < 100) {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: "Could not extract text from PDF",
        })
        .eq("id", documentId);
      return NextResponse.json(
        { error: "Failed to extract text" },
        { status: 500 }
      );
    }

    // Extract topics
    const topics = await extractTopics(extractedText);

    // Update document with extracted content
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "ready",
        extracted_text: extractedText,
        topics: topics,
        page_count: Math.ceil(extractedText.length / 3000), // Rough estimate
      })
      .eq("id", documentId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update document" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      topics,
      textLength: extractedText.length,
    });
  } catch (error) {
    console.error("Process handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
