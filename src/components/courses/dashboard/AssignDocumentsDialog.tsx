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
      // Fetch all user documents
      const response = await fetch("/api/documents")
      if (!response.ok) throw new Error("Failed to fetch documents")

      const result = await response.json()
      // Filter out documents already assigned to this course
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
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Documents to Course</DialogTitle>
          <DialogDescription>
            Select documents to add to this course
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No documents found matching your search"
                  : "No available documents to assign"}
              </p>
            </div>
          ) : (
            filteredDocuments.map((doc) => {
              const isSelected = selectedDocuments.has(doc.id)
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDocument(doc.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {doc.file_name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedDocuments.size} document{selectedDocuments.size !== 1 ? "s" : ""}{" "}
            selected
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={assigning || selectedDocuments.size === 0}>
              {assigning ? "Assigning..." : "Add to Course"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
