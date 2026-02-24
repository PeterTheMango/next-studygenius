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
    return null
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search documents or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm bg-card"
          />
        </div>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as "card" | "list")}
          className="border border-border rounded-lg bg-card shrink-0"
        >
          <ToggleGroupItem value="card" aria-label="Card view" className="h-9 w-9 p-0">
            <LayoutGrid className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view" className="h-9 w-9 p-0">
            <List className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Card View */}
      {viewMode === "card" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {filteredDocuments.map((doc) => {
            const topics = parseTopics(doc)
            const createdDate = doc.created_at
              ? new Date(doc.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : null

            return (
              <div
                key={doc.id}
                onClick={() => router.push(`/documents/${doc.id}`)}
                className="
                  group flex items-center gap-3 sm:gap-4 px-4 py-3.5
                  hover:bg-accent/50 cursor-pointer transition-colors
                "
              >
                {/* Icon */}
                <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:scale-105 transition-transform shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-sm truncate">
                    {doc.file_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    {createdDate && (
                      <>
                        <span className="text-muted-foreground/40 text-xs">·</span>
                        <span className="text-xs text-muted-foreground shrink-0">{createdDate}</span>
                      </>
                    )}
                    {/* Topics on desktop */}
                    {topics.length > 0 && (
                      <div className="hidden sm:flex items-center gap-1 ml-1">
                        <span className="text-muted-foreground/40 text-xs">·</span>
                        {topics.slice(0, 2).map((topic, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[11px] font-medium rounded">
                            {topic}
                          </span>
                        ))}
                        {topics.length > 2 && (
                          <span className="text-[11px] text-muted-foreground/50">+{topics.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleDelete(e, doc.id)}
                    className="
                      p-1.5 rounded-lg
                      text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10
                      opacity-0 group-hover:opacity-100
                      transition-all duration-200
                    "
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty search state */}
      {filteredDocuments.length === 0 && (
        <div className="text-center py-10">
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No results found</p>
          <p className="text-xs text-muted-foreground">
            Try a different search term or clear the filter.
          </p>
        </div>
      )}
    </div>
  )
}
