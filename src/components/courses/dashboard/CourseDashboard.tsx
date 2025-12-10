"use client"

import { CourseWithStats } from "@/types/course"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CourseStatsCards } from "./CourseStatsCards"
import { CourseDocumentsTab } from "./CourseDocumentsTab"
import { CourseQuizzesTab } from "./CourseQuizzesTab"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import * as LucideIcons from "lucide-react"

interface CourseDashboardProps {
  course: CourseWithStats
}

export default function CourseDashboard({ course }: CourseDashboardProps) {
  const router = useRouter()

  // Get the icon component dynamically
  const IconComponent = (LucideIcons as any)[
    course.icon
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("")
  ] as React.ComponentType<{ className?: string }> || LucideIcons.BookOpen

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/courses")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div
            className="p-3 rounded-xl"
            style={{
              backgroundColor: `${course.color}15`,
              color: course.color,
            }}
          >
            <IconComponent className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{course.title}</h1>
              <span
                className="px-3 py-1 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: `${course.color}15`,
                  color: course.color,
                }}
              >
                {course.course_code}
              </span>
            </div>
            {course.description && (
              <p className="text-muted-foreground mt-1">{course.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <CourseStatsCards course={course} />

      {/* Tabs for Documents and Quizzes */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList>
          <TabsTrigger value="documents">
            Documents ({course.total_documents})
          </TabsTrigger>
          <TabsTrigger value="quizzes">
            Quizzes ({course.total_quizzes})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-6">
          <CourseDocumentsTab courseId={course.course_id} />
        </TabsContent>

        <TabsContent value="quizzes" className="mt-6">
          <CourseQuizzesTab courseId={course.course_id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
