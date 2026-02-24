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

    // Fetch document and verify ownership + failed status
    const { data: document, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (document.status !== "failed") {
      return NextResponse.json(
        { error: "Document is not in a failed state" },
        { status: 400 }
      );
    }

    if ((document.retry_count ?? 0) >= MAX_RETRIES) {
      return NextResponse.json(
        { error: "Maximum retry attempts reached" },
        { status: 400 }
      );
    }

    // Reset document to pending
    await supabase
      .from("documents")
      .update({
        status: "pending",
        error_message: null,
        error_stage: null,
        processing_stage: null,
        processing_started_at: null,
        processing_completed_at: null,
        retry_count: (document.retry_count ?? 0) + 1,
      })
      .eq("id", id);

    // Re-invoke Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      fetch(`${supabaseUrl}/functions/v1/process-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          documentId: id,
          userId: user.id,
          filePath: document.file_path,
          batchId: document.batch_id || undefined,
        }),
      }).catch((err) => {
        console.error("Failed to invoke Edge Function for retry:", err);
        supabase
          .from("documents")
          .update({
            status: "failed",
            error_message: "Failed to restart processing",
            error_stage: "extracting",
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
