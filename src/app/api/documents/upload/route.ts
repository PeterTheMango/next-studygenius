import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    // Validate file
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      // 50MB limit
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${file.name.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    )}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Create document record
    const { data: document, error: dbError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        status: "pending",
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup uploaded file on DB error
      await supabase.storage.from("documents").remove([uploadData.path]);
      console.error("DB error:", dbError);
      return NextResponse.json(
        { error: "Failed to save document" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
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
