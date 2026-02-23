"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { GraduationCap, ArrowRight, Search, LayoutGrid, List } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Quiz = {
  id: string
  title: string
  mode: string
  question_count: number
  documents?: {
    file_name: string
  } | null
}

interface QuizzesListProps {
  quizzes: Quiz[]
}

export function QuizzesList({ quizzes }: QuizzesListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"card" | "list">("card")

  const filteredQuizzes = useMemo(() => {
    if (!searchQuery.trim()) {
      return quizzes
    }

    const query = searchQuery.toLowerCase()
    return quizzes.filter((quiz) => {
      const titleMatch = quiz.title.toLowerCase().includes(query)
      const documentNameMatch = quiz.documents?.file_name?.toLowerCase().includes(query) || false
      return titleMatch || documentNameMatch
    })
  }, [quizzes, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by quiz name or document name..."
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
      </div>

      {viewMode === "card" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/quizzes/${quiz.id}`}
              className="group bg-card p-6 rounded-2xl border border-border hover:border-primary hover:shadow-lg cursor-pointer transition-all relative flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md capitalize">
                  {quiz.mode}
                </span>
              </div>

              <h4 className="font-bold text-foreground mb-2 truncate pr-6">
                {quiz.title}
              </h4>

              <p className="text-xs text-muted-foreground mb-4 truncate">
                From: {quiz.documents?.file_name}
              </p>

              <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">{quiz.question_count} Questions</span>
                <span className="text-primary font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  View Details <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
          {filteredQuizzes.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {searchQuery.trim() ? "No quizzes found matching your search." : "No quizzes found. Go to Documents to generate one."}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredQuizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/quizzes/${quiz.id}`}
              className="group bg-card p-4 rounded-lg border border-border hover:border-primary hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:scale-110 transition-transform shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground truncate">
                    {quiz.title}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    From: {quiz.documents?.file_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md capitalize">
                  {quiz.mode}
                </span>
                <span className="font-medium text-muted-foreground text-sm whitespace-nowrap">
                  {quiz.question_count} Questions
                </span>
                <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
          {filteredQuizzes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery.trim() ? "No quizzes found matching your search." : "No quizzes found. Go to Documents to generate one."}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
