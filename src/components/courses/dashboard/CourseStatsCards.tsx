"use client"

import { CourseWithStats } from "@/types/course"
import { Card } from "@/components/ui/card"
import { Trophy, FileText, BookOpen, Clock, TrendingUp } from "lucide-react"

interface CourseStatsCardsProps {
  course: CourseWithStats
}

export function CourseStatsCards({ course }: CourseStatsCardsProps) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getScoreIndicator = (score: number | null) => {
    if (score === null) return null
    if (score >= 80) return "text-chart-2"
    if (score >= 50) return "text-chart-4"
    return "text-destructive"
  }

  const stats = [
    {
      title: "Avg. Score",
      value: course.avg_quiz_score !== null
        ? `${Math.round(course.avg_quiz_score)}%`
        : "—",
      icon: Trophy,
      color: "#22c55e",
      subtitle: course.total_attempts > 0
        ? `${course.total_attempts} attempt${course.total_attempts !== 1 ? "s" : ""}`
        : "No attempts yet",
    },
    {
      title: "Documents",
      value: course.total_documents.toString(),
      icon: FileText,
      color: course.color,
      subtitle: course.unique_topics > 0
        ? `${course.unique_topics} topic${course.unique_topics !== 1 ? "s" : ""}`
        : "Upload to begin",
    },
    {
      title: "Quizzes",
      value: course.total_quizzes.toString(),
      icon: BookOpen,
      color: "#8b5cf6",
      subtitle: course.completed_quizzes > 0
        ? `${course.completed_quizzes} completed`
        : "Create from docs",
    },
    {
      title: "Study Time",
      value: course.total_time_spent > 0
        ? formatTime(course.total_time_spent)
        : "0m",
      icon: Clock,
      color: "#f97316",
      subtitle: course.recent_attempts > 0
        ? `${course.recent_attempts} recent session${course.recent_attempts !== 1 ? "s" : ""}`
        : "Start studying",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="group relative overflow-hidden p-4 md:p-5 transition-all hover:shadow-md hover:shadow-black/[0.03] dark:hover:shadow-black/20"
          style={{
            animationDelay: `${index * 60}ms`,
            animationFillMode: "backwards",
          }}
        >
          {/* Subtle top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-px opacity-40"
            style={{ backgroundColor: stat.color }}
          />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                {stat.title}
              </p>
              <div
                className="p-1.5 md:p-2 rounded-lg transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: `${stat.color}12`,
                  color: stat.color,
                }}
              >
                <stat.icon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            </div>

            <div>
              <p className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                {stat.value}
              </p>
              <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 truncate">
                {stat.subtitle}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
