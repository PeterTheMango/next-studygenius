'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function deleteDocument(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  // Get document to find file path
  const { data: document } = await supabase
    .from('documents')
    .select('file_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (document?.file_path) {
    // Delete from storage
    await supabase.storage
      .from('documents')
      .remove([document.file_path])
  }

  // Delete from DB
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw new Error("Failed to delete document")
  }

  revalidatePath('/documents')
  revalidatePath('/dashboard')
}
