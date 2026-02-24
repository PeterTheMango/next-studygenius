"use client"

import { useRouter } from "next/navigation"
import { Archive, MoreVertical, Trash2, BookOpen, ArrowUpRight } from "lucide-react"
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
  variant?: "card" | "list"
}

export function CourseCard({ course, variant = "card" }: CourseCardProps) {
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
    } catch {
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
    } catch {
      toast.error("Failed to delete course")
    }
  }

  const IconComponent = (LucideIcons as any)[
    course.icon
      .split("-")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("")
  ] as React.ComponentType<{ className?: string }> || BookOpen

  const menuContent = (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => router.push(`/courses/${course.id}`)}>
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
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // ── List variant ──
  if (variant === "list") {
    return (
      <div
        onClick={() => router.push(`/courses/${course.id}`)}
        className="group bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 cursor-pointer transition-all duration-200 overflow-hidden"
      >
        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
          {/* Color bar */}
          <div
            className="w-1 self-stretch rounded-full shrink-0"
            style={{ backgroundColor: course.color }}
          />

          {/* Icon */}
          <div
            className="p-2 sm:p-2.5 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-105"
            style={{
              backgroundColor: `${course.color}15`,
              color: course.color,
            }}
          >
            <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground truncate text-sm sm:text-base">
                {course.title}
              </h4>
              <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">
                {course.course_code}
              </Badge>
              {course.status === "archived" && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Archived
                </Badge>
              )}
            </div>
            {course.description && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                {course.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {menuContent}
          </div>
        </div>
      </div>
    )
  }

  // ── Card variant ──
  return (
    <div
      onClick={() => router.push(`/courses/${course.id}`)}
      className="group bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 cursor-pointer transition-all duration-200 relative overflow-hidden h-full flex flex-col"
    >
      {/* Color accent — top edge */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: course.color }}
      />

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        {/* Top row: icon + badge + menu */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-110"
              style={{
                backgroundColor: `${course.color}12`,
                color: course.color,
              }}
            >
              <IconComponent className="w-5 h-5" />
            </div>
            <Badge variant="outline" className="text-xs font-medium">
              {course.course_code}
            </Badge>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            {menuContent}
          </div>
        </div>

        {/* Title */}
        <h4 className="font-bold text-foreground leading-snug mb-1.5 line-clamp-1">
          {course.title}
        </h4>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem] mb-4 flex-1">
          {course.description || "No description"}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          {course.status === "archived" ? (
            <Badge variant="secondary" className="text-xs">
              Archived
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground font-medium">
              {new Date(course.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}

          <span
            className="text-xs font-semibold inline-flex items-center gap-1 transition-transform duration-200 group-hover:translate-x-0.5"
            style={{ color: course.color }}
          >
            Open
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  )
}
