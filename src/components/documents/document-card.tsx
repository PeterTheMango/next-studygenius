"use client"

import { FileText, Trash2, ArrowUpRight, Calendar } from "lucide-react"
import { Database } from "@/types/database"
import { deleteDocument } from "@/app/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type Document = Database['public']['Tables']['documents']['Row']

interface DocumentCardProps {
  document: Document
}

export function DocumentCard({ document }: DocumentCardProps) {
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (confirm('Are you sure you want to delete this document?')) {
      toast.promise(deleteDocument(document.id), {
        loading: 'Document is being deleted...',
        success: 'Document deleted',
        error: 'Failed to delete document',
      })
    }
  }

  let topics: string[] = []
  if (Array.isArray(document.topics)) {
    topics = document.topics as string[]
  } else if (typeof document.topics === 'string') {
    try {
      topics = JSON.parse(document.topics)
    } catch (e) { /* ignore */ }
  }

  const createdDate = document.created_at
    ? new Date(document.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div
      onClick={() => router.push(`/documents/${document.id}`)}
      className="
        group bg-card rounded-2xl border border-border
        hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5
        cursor-pointer transition-all duration-200
        relative flex flex-col
      "
    >
      {/* Card Header */}
      <div className="p-4 sm:p-5 pb-0 sm:pb-0 flex items-start gap-3.5">
        <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:scale-110 group-hover:bg-primary/15 transition-all duration-200 shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h4 className="font-semibold text-foreground text-sm sm:text-base leading-tight truncate pr-6">
            {document.file_name}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {(document.file_size / 1024 / 1024).toFixed(1)} MB
            </span>
            {createdDate && (
              <>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <span className="text-xs text-muted-foreground">{createdDate}</span>
              </>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="
            absolute top-3 right-3 p-1.5 rounded-lg
            text-muted-foreground/60 hover:text-destructive
            hover:bg-destructive/10
            opacity-0 group-hover:opacity-100
            transition-all duration-200 z-10
          "
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Topics */}
      <div className="px-4 sm:px-5 pt-3 pb-1 flex-1">
        {topics.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {topics.slice(0, 3).map((topic, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-muted text-muted-foreground text-[11px] font-medium rounded-md leading-relaxed"
              >
                {topic}
              </span>
            ))}
            {topics.length > 3 && (
              <span className="text-[11px] text-muted-foreground/60 font-medium px-1 py-0.5">
                +{topics.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground/50 italic">No topics extracted</span>
        )}
      </div>

      {/* Card Footer / CTA */}
      <div className="px-4 sm:px-5 py-3 mt-auto border-t border-border/50">
        <span className="
          text-xs font-medium text-primary
          inline-flex items-center gap-1
          group-hover:gap-1.5 transition-all duration-200
        ">
          View Document
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
        </span>
      </div>
    </div>
  )
}
