"use client"

import { useRouter } from "next/navigation"
import { Archive, MoreVertical, Pencil, Trash2, BookOpen, FileText, Trophy } from "lucide-react"
import { Course } from "@/types/course"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCourseStore } from "@/stores/course-store"
import * as LucideIcons from "lucide-react"

interface CourseCardProps {
  course: Course
}

export function CourseCard({ course }: CourseCardProps) {
  const router = useRouter()
  const { updateCourse, removeCourse } = useCourseStore()

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const newStatus = course.status === "active" ? "archived" : "active"

    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update course")
      }

      updateCourse(course.id, { status: newStatus })
      toast.success(
        newStatus === "archived" ? "Course archived" : "Course restored"
      )
    } catch (error) {
      toast.error("Failed to update course")
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm("Are you sure you want to delete this course? Documents and quizzes will not be deleted, only unlinked.")) {
      return
    }

    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete course")
      }

      removeCourse(course.id)
      toast.success("Course deleted")
    } catch (error) {
      toast.error("Failed to delete course")
    }
  }

  // Get the icon component dynamically
  const IconComponent = (LucideIcons as any)[
    course.icon
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("")
  ] as React.ComponentType<{ className?: string }> || BookOpen

  return (
    <div
      onClick={() => router.push(`/courses/${course.id}`)}
      className="group bg-card p-6 rounded-2xl border border-border hover:border-primary hover:shadow-lg cursor-pointer transition-all relative overflow-hidden"
    >
      {/* Color accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: course.color }}
      />

      {/* Actions menu */}
      <div className="absolute top-4 right-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => router.push(`/courses/${course.id}`)}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              View Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="w-4 h-4 mr-2" />
              {course.status === "active" ? "Archive" : "Restore"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Icon and code */}
      <div className="flex items-start justify-between mb-4 pl-4">
        <div
          className="p-3 rounded-xl group-hover:scale-110 transition-transform"
          style={{
            backgroundColor: `${course.color}15`,
            color: course.color,
          }}
        >
          <IconComponent className="w-6 h-6" />
        </div>
        <Badge variant="outline" className="mr-8">
          {course.course_code}
        </Badge>
      </div>

      {/* Title and description */}
      <div className="pl-4">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-bold text-foreground truncate flex-1 pr-6">
            {course.title}
          </h4>
        </div>

        {course.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]">
            {course.description}
          </p>
        )}

        {!course.description && (
          <div className="mb-4 min-h-[2.5rem]" />
        )}

        {/* Status badge */}
        {course.status === "archived" && (
          <Badge variant="secondary" className="mb-4">
            Archived
          </Badge>
        )}

        {/* View dashboard link */}
        <div className="text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1"
          style={{ color: course.color }}
        >
          View Dashboard
          <svg
            className="w-4 h-4"
            fill="none"
            strokeWidth="2"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </div>
      </div>
    </div>
  )
}
