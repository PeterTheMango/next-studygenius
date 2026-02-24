import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Verify document ownership and pending status
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, status, file_path, batch_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Idempotency: if already in active processing, return existing ID
    if (document.status === "processing") {
      return NextResponse.json({ documentId: document.id }, { status: 200 });
    }

    if (document.status !== "pending") {
      return NextResponse.json(
        { error: "Document is not in a pending state" },
        { status: 400 }
      );
    }

    // Fire-and-forget: invoke Edge Function
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
          documentId: document.id,
          userId: user.id,
          filePath: document.file_path,
          batchId: document.batch_id || undefined,
        }),
      }).catch((err) => {
        console.error("Failed to invoke process-document Edge Function:", err);
        supabase
          .from("documents")
          .update({
            status: "failed",
            error_message: "Failed to start processing",
            error_stage: "extracting",
          })
          .eq("id", document.id)
          .then(() => {});
      });
    } else {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: "Server configuration error",
          error_stage: "extracting",
        })
        .eq("id", document.id);
    }

    return NextResponse.json({ documentId: document.id }, { status: 202 });
  } catch (error) {
    console.error("Confirm upload handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
