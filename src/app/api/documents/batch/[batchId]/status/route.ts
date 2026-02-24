import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get batch
    const { data: batch, error: batchError } = await supabase
      .from("document_batches")
      .select("*")
      .eq("id", batchId)
      .eq("user_id", user.id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Get documents in batch
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, file_name, status, processing_stage, error_message, error_stage")
      .eq("batch_id", batchId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (docsError) {
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      batch: {
        id: batch.id,
        status: batch.status,
        total_count: batch.total_count,
        completed_count: batch.completed_count,
        failed_count: batch.failed_count,
        created_at: batch.created_at,
        completed_at: batch.completed_at,
      },
      documents: documents || [],
    });
  } catch (error) {
    console.error("Batch status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
