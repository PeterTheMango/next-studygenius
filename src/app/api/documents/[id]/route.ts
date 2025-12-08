import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Get authenticated user (proxy guarantees authentication)
    const { data: { user } } = await supabase.auth.getUser()

    // Get document to find file path
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("file_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([document.file_path])

    if (storageError) {
      console.error("Storage delete error:", storageError)
      // Continue to delete from DB even if storage fails
    }

    // Delete from DB
    const { error: dbError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (dbError) {
      return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete handler error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
