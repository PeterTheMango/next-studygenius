"use client"

import { useState, useMemo, useEffect } from "react"
import { CourseCard } from "./CourseCard"
import { Course, CourseStatusFilter } from "@/types/course"
import { Input } from "@/components/ui/input"
import { Search, LayoutGrid, List, Plus, GraduationCap } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCourseStore } from "@/stores/course-store"
import { CreateCourseDialog } from "./CreateCourseDialog"

interface CourseListProps {
  initialCourses: Course[]
}

export default function CourseList({ initialCourses }: CourseListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [statusFilter, setStatusFilter] = useState<CourseStatusFilter>("active")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { courses, setCourses } = useCourseStore()

  useEffect(() => {
    setCourses(initialCourses)
  }, [initialCourses, setCourses])

  const filteredCourses = useMemo(() => {
    let filtered = courses

    if (statusFilter !== "all") {
      filtered = filtered.filter((course) => course.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((course) => {
        const titleMatch = course.title.toLowerCase().includes(query)
        const codeMatch = course.course_code.toLowerCase().includes(query)
        const descriptionMatch = course.description?.toLowerCase().includes(query)
        return titleMatch || codeMatch || descriptionMatch
      })
    }

    return filtered
  }, [courses, searchQuery, statusFilter])

  const activeCourses = courses.filter((c) => c.status === "active").length
  const archivedCourses = courses.filter((c) => c.status === "archived").length

  const statusFilters: { key: CourseStatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: courses.length },
    { key: "active", label: "Active", count: activeCourses },
    { key: "archived", label: "Archived", count: archivedCourses },
  ]

  if (courses.length === 0) {
    return (
      <>
        <div className="bg-card border border-border border-dashed rounded-2xl p-8 sm:p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1.5">
            No courses yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            Create your first course to organize your study materials by subject or class.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} size="default">
            <Plus className="w-4 h-4" />
            Create Course
          </Button>
        </div>
        <CreateCourseDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </>
    )
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as "card" | "list")}
            className="border border-border rounded-lg"
          >
            <ToggleGroupItem value="card" aria-label="Card view" className="px-2.5">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="px-2.5">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Course</span>
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
        {statusFilters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setStatusFilter(filter.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              statusFilter === filter.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {filter.label}
            <span
              className={`text-xs tabular-nums px-1.5 py-0.5 rounded-md ${
                statusFilter === filter.key
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {filter.count}
            </span>
          </button>
        ))}
      </div>

      {/* Course Grid / List */}
      {filteredCourses.length > 0 ? (
        viewMode === "card" ? (
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course, index) => (
              <div
                key={course.id}
                className="animate-in fade-in slide-in-from-bottom-3 duration-300"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <CourseCard course={course} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCourses.map((course, index) => (
              <div
                key={course.id}
                className="animate-in fade-in slide-in-from-bottom-2 duration-200"
                style={{
                  animationDelay: `${index * 30}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <CourseCard course={course} variant="list" />
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No courses found matching &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      )}

      <CreateCourseDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  )
}
