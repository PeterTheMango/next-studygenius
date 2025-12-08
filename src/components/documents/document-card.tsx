"use client"

import Link from "next/link"
import { FileText, Trash2, ArrowUpRight } from "lucide-react"
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

  // Parse topics safely
  let topics: string[] = []
  if (Array.isArray(document.topics)) {
    topics = document.topics as string[]
  } else if (typeof document.topics === 'string') {
    try {
        topics = JSON.parse(document.topics)
    } catch (e) { /* ignore */ }
  }

  return (
    <div 
        onClick={() => router.push(`/documents/${document.id}`)}
        className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg cursor-pointer transition-all relative"
    >
      <button 
        onClick={handleDelete} 
        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors z-10"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
            <FileText className="w-6 h-6" />
        </div>
        <span className="text-xs font-medium text-slate-400 mr-8">
            {(document.file_size / 1024 / 1024).toFixed(2)} MB
        </span>
      </div>

      <h4 className="font-bold text-slate-800 mb-2 truncate pr-6">
        {document.file_name}
      </h4>

      <div className="flex flex-wrap gap-2 mb-4">
        {topics.slice(0, 3).map((topic, i) => (
            <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
                {topic}
            </span>
        ))}
        {topics.length === 0 && <span className="text-xs text-slate-400 italic">No topics</span>}
      </div>

      <div className="text-sm text-blue-600 font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
        Generate Quiz <ArrowUpRight className="w-4 h-4" />
      </div>
    </div>
  )
}

