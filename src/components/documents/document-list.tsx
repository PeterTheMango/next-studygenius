"use client"

import { useState, useMemo } from "react"
import { DocumentCard } from "./document-card"
import { Database } from "@/types/database"
import { Input } from "@/components/ui/input"
import { Search, LayoutGrid, List, FileText, Trash2, ArrowUpRight } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { deleteDocument } from "@/app/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type Document = Database['public']['Tables']['documents']['Row']

interface DocumentListProps {
  documents: Document[]
}

export function DocumentList({ documents }: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const router = useRouter()

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) {
      return documents
    }

    const query = searchQuery.toLowerCase()
    return documents.filter((doc) => {
      const fileNameMatch = doc.file_name.toLowerCase().includes(query)

      // Search in topics if they exist
      let topicsMatch = false
      if (doc.topics && Array.isArray(doc.topics)) {
        topicsMatch = doc.topics.some((topic: any) => {
          if (typeof topic === 'string') {
            return topic.toLowerCase().includes(query)
          }
          if (typeof topic === 'object' && topic.name) {
            return topic.name.toLowerCase().includes(query)
          }
          return false
        })
      }

      return fileNameMatch || topicsMatch
    })
  }, [documents, searchQuery])

  const handleDelete = async (e: React.MouseEvent, documentId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (confirm('Are you sure you want to delete this document?')) {
      toast.promise(deleteDocument(documentId), {
        loading: 'Document is being deleted...',
        success: 'Document deleted',
        error: 'Failed to delete document',
      })
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

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No documents found. Upload one to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by document name or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as "card" | "list")}
          className="border rounded-md"
        >
          <ToggleGroupItem value="card" aria-label="Card view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {viewMode === "card" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocuments.map((doc) => {
            const topics = parseTopics(doc)
            return (
              <div
                key={doc.id}
                onClick={() => router.push(`/documents/${doc.id}`)}
                className="group bg-card p-4 rounded-lg border border-border hover:border-primary hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:scale-110 transition-transform shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground truncate">
                      {doc.file_name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {topics.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {topics.slice(0, 3).map((topic, i) => (
                            <span key={i} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md">
                              {topic}
                            </span>
                          ))}
                          {topics.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{topics.length - 3} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No topics</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, doc.id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ArrowUpRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No documents found matching your search.</p>
        </div>
      )}
    </div>
  )
}

