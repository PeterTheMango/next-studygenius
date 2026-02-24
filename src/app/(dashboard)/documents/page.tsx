import { createClient } from "@/lib/supabase/server"
import { DocumentList } from "@/components/documents/document-list"
import { UploadZone } from "@/components/documents/upload-zone"
import { FileText, BookOpen, Sparkles } from "lucide-react"

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

  const docCount = documents?.length ?? 0

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Documents</h1>
            <p className="text-sm text-muted-foreground">
              Upload study materials and let AI extract key topics for you.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar - only when documents exist */}
      {docCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Total</p>
              <p className="text-lg font-bold text-foreground leading-tight">{docCount}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Analyzed</p>
              <p className="text-lg font-bold text-foreground leading-tight">
                {documents?.filter(d => d.topics && (Array.isArray(d.topics) ? d.topics.length > 0 : false)).length ?? 0}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex bg-card border border-border rounded-xl p-3.5 items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Total Size</p>
              <p className="text-lg font-bold text-foreground leading-tight">
                {((documents?.reduce((acc, d) => acc + (d.file_size || 0), 0) ?? 0) / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <UploadZone />

      {/* Document Library */}
      {docCount > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Your Library</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
              {docCount} {docCount === 1 ? 'document' : 'documents'}
            </span>
          </div>
          <DocumentList documents={documents!} />
        </div>
      )}

      {/* Empty State */}
      {docCount === 0 && (
        <div className="bg-card border border-border border-dashed rounded-2xl p-8 sm:p-12 text-center">
          <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1.5">No documents yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Upload your first PDF above to get started. AI will automatically extract topics and prepare your study material.
          </p>
        </div>
      )}
    </div>
  )
}
