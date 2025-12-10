"use client"

import { useEffect, useState } from "react"
import { Database } from "@/types/database"
import { BookOpen, Play, ArrowUpRight } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

type Quiz = Database['public']['Tables']['quizzes']['Row'] & {
  document: {
    id: string
    file_name: string
    course_id: string | null
  }
}

interface CourseQuizzesTabProps {
  courseId: string
}

export function CourseQuizzesTab({ courseId }: CourseQuizzesTabProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchQuizzes()
  }, [courseId])

  const fetchQuizzes = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/quizzes`)
      if (!response.ok) throw new Error("Failed to fetch quizzes")

      const result = await response.json()
      setQuizzes(result.data || [])
    } catch (error) {
      toast.error("Failed to load quizzes")
    } finally {
      setLoading(false)
    }
  }

  const getModeColor = (mode: string) => {
    switch (mode) {
      case "learn":
        return "bg-green-100 text-green-700"
      case "revision":
        return "bg-blue-100 text-blue-700"
      case "test":
        return "bg-purple-100 text-purple-700"
      default:
        return "bg-slate-100 text-slate-700"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "bg-green-100 text-green-700"
      case "generating":
        return "bg-yellow-100 text-yellow-700"
      case "draft":
        return "bg-slate-100 text-slate-700"
      case "archived":
        return "bg-slate-100 text-slate-500"
      default:
        return "bg-slate-100 text-slate-700"
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>
  }

  if (quizzes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-6 bg-slate-50 rounded-full mb-4">
          <BookOpen className="w-12 h-12 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          No quizzes in this course
        </h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Create quizzes from your course documents to start practicing
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {quizzes.map((quiz) => (
        <div
          key={quiz.id}
          onClick={() => router.push(`/quizzes/${quiz.id}`)}
          className="group bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 truncate">
                {quiz.title}
              </h4>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={getModeColor(quiz.mode)}>
                  {quiz.mode.toUpperCase()}
                </Badge>
                <Badge className={getStatusColor(quiz.status || 'draft')}>
                  {quiz.status?.toUpperCase() || 'DRAFT'}
                </Badge>
                {quiz.question_count && (
                  <span className="text-xs text-slate-400">
                    {quiz.question_count} questions
                  </span>
                )}
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-400">
                  {quiz.document.file_name}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {quiz.status === "ready" && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/quizzes/${quiz.id}/take`)
                }}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Start Quiz"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <ArrowUpRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      ))}
    </div>
  )
}
