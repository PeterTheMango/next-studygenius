import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTopics } from "@/lib/gemini/question-generator";
import { filterPDFPages } from "@/lib/pdf/filter-pipeline";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user (proxy guarantees authentication)
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    // Extract and filter PDF pages
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    let filteringResult;
    try {
      filteringResult = await filterPDFPages(base64);
    } catch (extractionError) {
      const errorMessage =
        extractionError instanceof Error
          ? extractionError.message
          : "Failed to extract and filter PDF content";

      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", documentId);

      return NextResponse.json(
        { error: "Failed to process PDF" },
        { status: 500 }
      );
    }

    const { filteredText, pageMetadata, stats } = filteringResult;

    // Validate: all pages filtered scenario
    if (stats.keptPages === 0) {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message:
            "All pages were filtered out. Document may only contain non-content pages.",
        })
        .eq("id", documentId);

      return NextResponse.json(
        { error: "No content pages found in document" },
        { status: 400 }
      );
    }

    // Validate: minimum content length
    if (!filteredText || filteredText.length < 100) {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: "Insufficient content extracted after filtering",
        })
        .eq("id", documentId);

      return NextResponse.json(
        { error: "Failed to extract sufficient content" },
        { status: 500 }
      );
    }

    // Extract topics from filtered content
    const topics = await extractTopics(filteredText);

    // Update document with filtered content and metadata
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "ready",
        extracted_text: filteredText,
        topics: topics,
        page_count: stats.keptPages,
        original_page_count: stats.totalPages,
        filtered_page_count: stats.keptPages,
        page_metadata: pageMetadata,
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
      textLength: filteredText.length,
      filteringStats: {
        totalPages: stats.totalPages,
        keptPages: stats.keptPages,
        filteredPages: stats.filteredPages,
        byType: stats.byClassification,
      },
    });
  } catch (error) {
    console.error("Process handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
