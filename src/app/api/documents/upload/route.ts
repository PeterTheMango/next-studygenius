import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileName, fileSize, batchId } = await request.json();

    // Validate
    if (!fileName || typeof fileName !== "string" || !fileName.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    if (!fileSize || typeof fileSize !== "number" || fileSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Build storage path
    const path = `${user.id}/${Date.now()}-${fileName.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    )}`;

    // Create signed upload URL so the client can upload directly to Supabase
    const { data: signedData, error: signedError } = await supabase.storage
      .from("documents")
      .createSignedUploadUrl(path);

    if (signedError) {
      console.error("Signed URL error:", signedError);
      return NextResponse.json(
        { error: "Failed to create upload URL" },
        { status: 500 }
      );
    }

    // Create document record
    const { data: document, error: dbError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        file_name: fileName,
        file_path: path,
        file_size: fileSize,
        status: "pending",
        ...(batchId ? { batch_id: batchId } : {}),
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      return NextResponse.json(
        { error: "Failed to save document" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        signedUrl: signedData.signedUrl,
        token: signedData.token,
        path,
        document,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
