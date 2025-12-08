"use client"

import { DocumentCard } from "./document-card"
import { Database } from "@/types/database"

type Document = Database['public']['Tables']['documents']['Row']

interface DocumentListProps {
  documents: Document[]
}

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No documents found. Upload one to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  )
}

