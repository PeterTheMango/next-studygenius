"use client"

import { useEffect, useState } from "react"
import { Database } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Search, FileText, Check } from "lucide-react"

type Document = Database['public']['Tables']['documents']['Row']

interface AssignDocumentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  onDocumentsAssigned: () => void
}

export function AssignDocumentsDialog({
  open,
  onOpenChange,
  courseId,
  onDocumentsAssigned,
}: AssignDocumentsDialogProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (open) {
      fetchAvailableDocuments()
    }
  }, [open])

  const fetchAvailableDocuments = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/documents")
      if (!response.ok) throw new Error("Failed to fetch documents")

      const result = await response.json()
      const availableDocs = (result.data || []).filter(
        (doc: Document) => doc.course_id !== courseId && doc.status === 'ready'
      )
      setDocuments(availableDocs)
    } catch (error) {
      toast.error("Failed to load documents")
    } finally {
      setLoading(false)
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return doc.file_name.toLowerCase().includes(query)
  })

  const toggleDocument = (docId: string) => {
    const newSelected = new Set(selectedDocuments)
    if (newSelected.has(docId)) {
      newSelected.delete(docId)
    } else {
      newSelected.add(docId)
    }
    setSelectedDocuments(newSelected)
  }

  const handleAssign = async () => {
    if (selectedDocuments.size === 0) {
      toast.error("Please select at least one document")
      return
    }

    setAssigning(true)
    try {
      const promises = Array.from(selectedDocuments).map((docId) =>
        fetch(`/api/courses/${courseId}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document_id: docId }),
        })
      )

      const results = await Promise.all(promises)
      const failedCount = results.filter((r) => !r.ok).length

      if (failedCount === 0) {
        toast.success(
          `${selectedDocuments.size} document${
            selectedDocuments.size > 1 ? "s" : ""
          } assigned to course`
        )
        setSelectedDocuments(new Set())
        onDocumentsAssigned()
        onOpenChange(false)
      } else {
        toast.error(`Failed to assign ${failedCount} document(s)`)
      }
    } catch (error) {
      toast.error("Failed to assign documents")
    } finally {
      setAssigning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 md:px-6 md:pt-6">
          <DialogTitle className="text-lg">Add Documents</DialogTitle>
          <DialogDescription className="text-sm">
            Select documents to add to this course
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative px-5 pb-3 md:px-6">
          <Search className="absolute left-8 md:left-9 top-1/2 -translate-y-[calc(50%+6px)] w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 md:px-6 min-h-[260px] max-h-[400px]">
          <div className="space-y-1.5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">Loading documents...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-muted/50 rounded-2xl mb-3">
                  <FileText className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "No documents found"
                    : "No available documents"}
                </p>
              </div>
            ) : (
              filteredDocuments.map((doc) => {
                const isSelected = selectedDocuments.has(doc.id)
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDocument(doc.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "border-primary/50 bg-primary/[0.04]"
                        : "border-transparent hover:bg-accent/50"
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="w-5 h-5 bg-primary rounded-md flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-border rounded-md transition-colors" />
                      )}
                    </div>

                    {/* Doc info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {doc.file_name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>

                    <FileText className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 md:px-6 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {selectedDocuments.size} selected
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAssign}
              disabled={assigning || selectedDocuments.size === 0}
            >
              {assigning ? "Adding..." : "Add to Course"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
