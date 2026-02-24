"use client"

import { Database } from "@/types/database"
import {
  BookOpen,
  Play,
  ArrowUpRight,
  Zap,
  RefreshCw,
  GraduationCap,
} from "lucide-react"
import { useRouter } from "next/navigation"

type Quiz = Database["public"]["Tables"]["quizzes"]["Row"] & {
  document: {
    id: string
    file_name: string
    course_id: string | null
  }
}

interface CourseQuizzesTabProps {
  quizzes: Quiz[]
  loading: boolean
}

export function CourseQuizzesTab({ quizzes, loading }: CourseQuizzesTabProps) {
  const router = useRouter()

  const getModeConfig = (mode: string) => {
    switch (mode) {
      case "learn":
        return {
          icon: GraduationCap,
          label: "Learn",
          className: "bg-chart-2/15 text-chart-2",
        }
      case "revision":
        return {
          icon: RefreshCw,
          label: "Revision",
          className: "bg-chart-1/15 text-chart-1",
        }
      case "test":
        return {
          icon: Zap,
          label: "Test",
          className: "bg-chart-4/15 text-chart-4",
        }
      default:
        return {
          icon: BookOpen,
          label: mode,
          className: "bg-muted text-muted-foreground",
        }
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "ready":
        return { label: "Ready", className: "bg-chart-2/15 text-chart-2" }
      case "generating":
        return { label: "Generating", className: "bg-chart-5/15 text-chart-5" }
      case "draft":
        return { label: "Draft", className: "bg-muted text-muted-foreground" }
      case "archived":
        return {
          label: "Archived",
          className: "bg-muted text-muted-foreground/60",
        }
      default:
        return {
          label: status || "Draft",
          className: "bg-muted text-muted-foreground",
        }
    }
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

  if (quizzes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 md:py-20 text-center">
        <div className="relative mb-5">
          <div className="p-5 bg-muted/60 rounded-2xl">
            <BookOpen className="w-10 h-10 text-muted-foreground/60" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1.5">
          No quizzes yet
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">
          Create quizzes from your course documents to start practicing
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {quizzes.map((quiz) => {
        const modeConfig = getModeConfig(quiz.mode)
        const statusConfig = getStatusConfig(quiz.status || "draft")
        const ModeIcon = modeConfig.icon

        return (
          <div
            key={quiz.id}
            onClick={() => router.push(`/quizzes/${quiz.id}`)}
            className="group bg-card rounded-xl border border-border hover:border-primary/40 hover:shadow-sm cursor-pointer transition-all duration-200"
          >
            <div className="flex items-center gap-3 md:gap-4 p-3.5 md:p-4">
              {/* Icon */}
              <div className="p-2 bg-primary/8 text-primary rounded-lg group-hover:bg-primary/12 transition-colors shrink-0">
                <ModeIcon className="w-4 h-4 md:w-5 md:h-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm md:text-base font-semibold text-foreground truncate">
                  {quiz.title}
                </h4>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium ${modeConfig.className}`}
                  >
                    {modeConfig.label}
                  </span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium ${statusConfig.className}`}
                  >
                    {statusConfig.label}
                  </span>
                  {quiz.question_count && (
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      {quiz.question_count}q
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground truncate max-w-[120px] hidden sm:inline">
                    {quiz.document.file_name}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {quiz.status === "ready" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/quizzes/${quiz.id}/take`)
                    }}
                    className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    title="Start Quiz"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
