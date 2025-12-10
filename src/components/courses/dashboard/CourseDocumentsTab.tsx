"use client"

import { useEffect, useState } from "react"
import { Database } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Trash2, ArrowUpRight, Upload } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { AssignDocumentsDialog } from "./AssignDocumentsDialog"

type Document = Database['public']['Tables']['documents']['Row']

interface CourseDocumentsTabProps {
  courseId: string
}

export function CourseDocumentsTab({ courseId }: CourseDocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchDocuments()
  }, [courseId])

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/documents`)
      if (!response.ok) throw new Error("Failed to fetch documents")

      const result = await response.json()
      setDocuments(result.data || [])
    } catch (error) {
      toast.error("Failed to load documents")
    } finally {
      setLoading(false)
    }
  }

  const handleUnlinkDocument = async (documentId: string) => {
    if (!confirm("Remove this document from the course? The document will not be deleted.")) {
      return
    }

    try {
      const response = await fetch(`/api/courses/${courseId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId }),
      })

      if (!response.ok) throw new Error("Failed to unlink document")

      setDocuments(documents.filter((doc) => doc.id !== documentId))
      toast.success("Document removed from course")
    } catch (error) {
      toast.error("Failed to remove document")
    }
  }

  const parseTopics = (doc: Document): string[] => {
    let topics: string[] = []
    if (Array.isArray(doc.topics)) {
      topics = doc.topics as string[]
    } else if (typeof doc.topics === 'string') {
      try {
        topics = JSON.parse(doc.topics)
      } catch (e) { /* ignore */ }
    }
    return topics
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-6 bg-slate-50 rounded-full mb-4">
          <FileText className="w-12 h-12 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          No documents in this course
        </h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Add existing documents or upload new ones to get started
        </p>
        <div className="flex gap-3">
          <Button onClick={() => setAssignDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Documents
          </Button>
          <Button variant="outline" onClick={() => router.push("/documents")}>
            <Upload className="w-4 h-4 mr-2" />
            Upload New
          </Button>
        </div>
        <AssignDocumentsDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          courseId={courseId}
          onDocumentsAssigned={fetchDocuments}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAssignDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Documents
        </Button>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => {
          const topics = parseTopics(doc)
          return (
            <div
              key={doc.id}
              onClick={() => router.push(`/documents/${doc.id}`)}
              className="group bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 truncate">
                    {doc.file_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    {topics.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {topics.slice(0, 3).map((topic, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md"
                          >
                            {topic}
                          </span>
                        ))}
                        {topics.length > 3 && (
                          <span className="text-xs text-slate-400">
                            +{topics.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No topics</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUnlinkDocument(doc.id)
                  }}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ArrowUpRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          )
        })}
      </div>

      <AssignDocumentsDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        courseId={courseId}
        onDocumentsAssigned={fetchDocuments}
      />
    </div>
  )
}
