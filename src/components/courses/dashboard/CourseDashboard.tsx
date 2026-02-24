"use client"

import { useEffect, useState, useCallback } from "react"
import { CourseWithStats } from "@/types/course"
import { Database } from "@/types/database"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CourseStatsCards } from "./CourseStatsCards"
import { CourseDocumentsTab } from "./CourseDocumentsTab"
import { CourseQuizzesTab } from "./CourseQuizzesTab"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, BookOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import * as LucideIcons from "lucide-react"

type Document = Database["public"]["Tables"]["documents"]["Row"]
type Quiz = Database["public"]["Tables"]["quizzes"]["Row"] & {
  document: {
    id: string
    file_name: string
    course_id: string | null
  }
}

interface CourseDashboardProps {
  course: CourseWithStats
}

export default function CourseDashboard({ course }: CourseDashboardProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)

  const IconComponent =
    ((LucideIcons as any)[
      course.icon
        .split("-")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("")
    ] as React.ComponentType<{ className?: string }>) || LucideIcons.BookOpen

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [docsRes, quizzesRes] = await Promise.all([
        fetch(`/api/courses/${course.course_id}/documents`),
        fetch(`/api/courses/${course.course_id}/quizzes`),
      ])

      if (!docsRes.ok) throw new Error("Failed to fetch documents")
      if (!quizzesRes.ok) throw new Error("Failed to fetch quizzes")

      const [docsResult, quizzesResult] = await Promise.all([
        docsRes.json(),
        quizzesRes.json(),
      ])

      setDocuments(docsResult.data || [])
      setQuizzes(quizzesResult.data || [])
    } catch (error) {
      toast.error("Failed to load course data")
    } finally {
      setLoading(false)
    }
  }, [course.course_id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Header with course color accent */}
      <div className="relative overflow-hidden">
        {/* Subtle gradient backdrop using course color */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
          style={{
            background: `linear-gradient(135deg, ${course.color} 0%, transparent 60%)`,
          }}
        />
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-[0.06] dark:opacity-[0.1] -translate-y-1/2 translate-x-1/4"
          style={{ backgroundColor: course.color }}
        />

        <div className="relative px-4 pt-4 pb-6 md:px-8 md:pt-6 md:pb-8">
          {/* Top bar: back + status */}
          <div className="flex items-center justify-between mb-5 md:mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/courses")}
              className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Courses</span>
            </Button>

            <Badge
              variant="outline"
              className="text-xs font-medium tracking-wide"
              style={{
                borderColor: `${course.color}40`,
                color: course.color,
              }}
            >
              {course.status === "active" ? "Active" : "Archived"}
            </Badge>
          </div>

          {/* Course identity */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
              style={{
                backgroundColor: `${course.color}14`,
                color: course.color,
              }}
            >
              <IconComponent className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {course.title}
                </h1>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold tracking-wide shrink-0"
                  style={{
                    backgroundColor: `${course.color}12`,
                    color: course.color,
                  }}
                >
                  {course.course_code}
                </span>
              </div>
              {course.description && (
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl line-clamp-2">
                  {course.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Stats + Content */}
      <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <CourseStatsCards course={course} />

        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex h-10">
            <TabsTrigger value="documents" className="gap-1.5 text-sm">
              <FileText className="w-3.5 h-3.5 hidden sm:block" />
              Documents
              <span className="text-muted-foreground ml-0.5">
                ({documents.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-1.5 text-sm">
              <BookOpen className="w-3.5 h-3.5 hidden sm:block" />
              Quizzes
              <span className="text-muted-foreground ml-0.5">
                ({quizzes.length})
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="mt-5 md:mt-6">
            <CourseDocumentsTab
              courseId={course.course_id}
              documents={documents}
              loading={loading}
              onDocumentsChanged={fetchData}
            />
          </TabsContent>

          <TabsContent value="quizzes" className="mt-5 md:mt-6">
            <CourseQuizzesTab
              quizzes={quizzes}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
