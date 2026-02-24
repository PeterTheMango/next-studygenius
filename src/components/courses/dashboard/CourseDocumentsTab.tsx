"use client"

import { useState } from "react"
import { Database } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Trash2, ArrowUpRight, Upload } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { AssignDocumentsDialog } from "./AssignDocumentsDialog"

type Document = Database["public"]["Tables"]["documents"]["Row"]

interface CourseDocumentsTabProps {
  courseId: string
  documents: Document[]
  loading: boolean
  onDocumentsChanged: () => void
}

export function CourseDocumentsTab({
  courseId,
  documents,
  loading,
  onDocumentsChanged,
}: CourseDocumentsTabProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const router = useRouter()

  const handleUnlinkDocument = async (documentId: string) => {
    if (
      !confirm(
        "Remove this document from the course? The document will not be deleted."
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/courses/${courseId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId }),
      })

      if (!response.ok) throw new Error("Failed to unlink document")

      toast.success("Document removed from course")
      onDocumentsChanged()
    } catch (error) {
      toast.error("Failed to remove document")
    }
  }

  const parseTopics = (doc: Document): string[] => {
    let topics: string[] = []
    if (Array.isArray(doc.topics)) {
      topics = doc.topics as string[]
    } else if (typeof doc.topics === "string") {
      try {
        topics = JSON.parse(doc.topics)
      } catch (e) {
        /* ignore */
      }
    }
    return topics
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[72px] rounded-xl bg-muted/50 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 md:py-20 text-center">
        <div className="relative mb-5">
          <div className="p-5 bg-muted/60 rounded-2xl">
            <FileText className="w-10 h-10 text-muted-foreground/60" />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 bg-background border border-border rounded-lg">
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1.5">
          No documents yet
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">
          Add existing documents or upload new ones to build your course
          materials
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Button
            onClick={() => setAssignDialogOpen(true)}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Documents
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/documents")}
            className="gap-1.5"
          >
            <Upload className="w-4 h-4" />
            Upload New
          </Button>
        </div>
        <AssignDocumentsDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          courseId={courseId}
          onDocumentsAssigned={onDocumentsChanged}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setAssignDialogOpen(true)}
          size="sm"
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Documents
        </Button>
      </div>

      <div className="space-y-2">
        {documents.map((doc, index) => {
          const topics = parseTopics(doc)
          return (
            <div
              key={doc.id}
              onClick={() => router.push(`/documents/${doc.id}`)}
              className="group bg-card rounded-xl border border-border hover:border-primary/40 hover:shadow-sm cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center gap-3 md:gap-4 p-3.5 md:p-4">
                {/* Icon */}
                <div className="p-2 bg-primary/8 text-primary rounded-lg group-hover:bg-primary/12 transition-colors shrink-0">
                  <FileText className="w-4 h-4 md:w-5 md:h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm md:text-base font-semibold text-foreground truncate">
                    {doc.file_name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
                    {topics.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {topics.slice(0, 2).map((topic, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[11px] rounded-md truncate max-w-[100px]"
                          >
                            {topic}
                          </span>
                        ))}
                        {topics.length > 2 && (
                          <span className="text-[11px] text-muted-foreground">
                            +{topics.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/60">
                        {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {topics.length > 0 && (
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap hidden md:block">
                      {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUnlinkDocument(doc.id)
                    }}
                    className="p-1.5 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Remove document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <AssignDocumentsDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        courseId={courseId}
        onDocumentsAssigned={onDocumentsChanged}
      />
    </div>
  )
}
