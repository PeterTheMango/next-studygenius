import { createClient } from "@/lib/supabase/server"
import { DocumentList } from "@/components/documents/document-list"
import { UploadZone } from "@/components/documents/upload-zone"

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Please login</div>
  }

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <UploadZone />
      
      {documents && documents.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-4">Your Library</h3>
          <DocumentList documents={documents} />
        </div>
      )}
    </div>
  )
}


