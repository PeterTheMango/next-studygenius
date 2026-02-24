import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const MAX_BATCH_SIZE = 5;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const BatchUploadSchema = z.object({
  files: z
    .array(
      z.object({
        fileName: z.string().min(1),
        fileSize: z.number().positive(),
      })
    )
    .min(1)
    .max(MAX_BATCH_SIZE),
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
    const validationResult = BatchUploadSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { files } = validationResult.data;

    // Validate each file
    for (const file of files) {
      if (!file.fileName.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: `Only PDF files are allowed: ${file.fileName}` },
          { status: 400 }
        );
      }
      if (file.fileSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File exceeds 50MB limit: ${file.fileName}` },
          { status: 400 }
        );
      }
    }

    // Create batch record
    const { data: batch, error: batchError } = await supabase
      .from("document_batches")
      .insert({
        user_id: user.id,
        status: "processing",
        total_count: files.length,
      })
      .select()
      .single();

    if (batchError || !batch) {
      console.error("Batch creation error:", batchError);
      return NextResponse.json(
        { error: "Failed to create batch" },
        { status: 500 }
      );
    }

    // Create document records and signed URLs for each file
    const results: Array<{
      documentId: string;
      fileName: string;
      signedUrl: string;
      token: string;
      path: string;
    }> = [];

    for (const file of files) {
      const path = `${user.id}/${Date.now()}-${file.fileName.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      )}`;

      // Create signed upload URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from("documents")
        .createSignedUploadUrl(path);

      if (signedError) {
        console.error("Signed URL error for batch file:", signedError);
        continue;
      }

      // Create document record
      const { data: document, error: dbError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          file_name: file.fileName,
          file_path: path,
          file_size: file.fileSize,
          status: "pending",
          batch_id: batch.id,
        })
        .select()
        .single();

      if (dbError || !document) {
        console.error("DB error for batch file:", dbError);
        continue;
      }

      results.push({
        documentId: document.id,
        fileName: file.fileName,
        signedUrl: signedData.signedUrl,
        token: signedData.token,
        path,
      });
    }

    if (results.length === 0) {
      // Clean up batch if no files succeeded
      await supabase.from("document_batches").delete().eq("id", batch.id);
      return NextResponse.json(
        { error: "Failed to prepare any files for upload" },
        { status: 500 }
      );
    }

    // Update batch total_count to actual successful count
    if (results.length !== files.length) {
      await supabase
        .from("document_batches")
        .update({ total_count: results.length })
        .eq("id", batch.id);
    }

    return NextResponse.json(
      { batchId: batch.id, files: results },
      { status: 201 }
    );
  } catch (error) {
    console.error("Batch upload handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
