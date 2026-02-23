"use client"

import { useState, useMemo, useEffect } from "react"
import { CourseCard } from "./CourseCard"
import { Course, CourseStatusFilter } from "@/types/course"
import { Input } from "@/components/ui/input"
import { Search, LayoutGrid, List, Plus } from "lucide-react"
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

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((course) => course.status === statusFilter)
    }

    // Filter by search query
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

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-6 bg-muted rounded-full mb-4">
          <LayoutGrid className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No courses yet
        </h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Create your first course to organize your study materials by subject or class
        </p>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Course
        </Button>
        <CreateCourseDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by course name, code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as "card" | "list")}
          className="border rounded-md"
        >
          <ToggleGroupItem value="card" aria-label="Card view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Course
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          All ({courses.length})
        </button>
        <button
          onClick={() => setStatusFilter("active")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            statusFilter === "active"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          Active ({activeCourses})
        </button>
        <button
          onClick={() => setStatusFilter("archived")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            statusFilter === "archived"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          Archived ({archivedCourses})
        </button>
      </div>

      {viewMode === "card" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="group bg-card p-4 rounded-lg border border-border hover:border-primary hover:shadow-md cursor-pointer transition-all"
              onClick={() => window.location.href = `/courses/${course.id}`}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-1 h-12 rounded-full"
                  style={{ backgroundColor: course.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-foreground truncate">
                      {course.title}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {course.course_code}
                    </Badge>
                    {course.status === "archived" && (
                      <Badge variant="secondary" className="text-xs">
                        Archived
                      </Badge>
                    )}
                  </div>
                  {course.description && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {course.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No courses found matching your search.
          </p>
        </div>
      )}

      <CreateCourseDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  )
}
