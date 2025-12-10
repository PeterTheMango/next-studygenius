"use client"

import { CourseWithStats } from "@/types/course"
import { Card } from "@/components/ui/card"
import { Trophy, FileText, BookOpen, Clock } from "lucide-react"

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

  const stats = [
    {
      title: "Average Quiz Score",
      value: course.avg_quiz_score !== null
        ? `${Math.round(course.avg_quiz_score)}%`
        : "N/A",
      icon: Trophy,
      color: "#22c55e",
      bgColor: "#22c55e15",
    },
    {
      title: "Course Files",
      value: course.total_documents.toString(),
      icon: FileText,
      color: course.color,
      bgColor: `${course.color}15`,
    },
    {
      title: "Total Quizzes",
      value: course.total_quizzes.toString(),
      icon: BookOpen,
      color: "#8b5cf6",
      bgColor: "#8b5cf615",
    },
    {
      title: "Study Time",
      value: course.total_time_spent > 0
        ? formatTime(course.total_time_spent)
        : "0m",
      icon: Clock,
      color: "#f97316",
      bgColor: "#f9731615",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </p>
              <p className="text-2xl font-bold mt-2">{stat.value}</p>
            </div>
            <div
              className="p-3 rounded-xl"
              style={{
                backgroundColor: stat.bgColor,
                color: stat.color,
              }}
            >
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
