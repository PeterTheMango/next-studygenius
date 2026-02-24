"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  GraduationCap,
  ArrowRight,
  Search,
  LayoutGrid,
  List,
  FileText,
  Trophy,
  HelpCircle,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type QuizAttempt = {
  id: string
  score: number | null
  started_at: string | null
}

type Quiz = {
  id: string
  title: string
  mode: string
  question_count: number
  created_at: string | null
  documents?: {
    file_name: string
  } | null
  quiz_attempts?: QuizAttempt[]
}

interface QuizzesListProps {
  quizzes: Quiz[]
}

const modeConfig: Record<string, { label: string; className: string }> = {
  learn: {
    label: "Learn",
    className: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  },
  revision: {
    label: "Revision",
    className: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  },
  test: {
    label: "Test",
    className: "bg-chart-1/15 text-chart-1 border-chart-1/25",
  },
}

function getBestScore(attempts?: QuizAttempt[]): number | null {
  if (!attempts || attempts.length === 0) return null
  const scores = attempts
    .map((a) => a.score)
    .filter((s): s is number => s !== null)
  return scores.length > 0 ? Math.round(Math.max(...scores) * 100) : null
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function QuizzesList({ quizzes }: QuizzesListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"card" | "list">("card")

  const filteredQuizzes = useMemo(() => {
    if (!searchQuery.trim()) return quizzes

    const query = searchQuery.toLowerCase()
    return quizzes.filter((quiz) => {
      const titleMatch = quiz.title.toLowerCase().includes(query)
      const documentNameMatch =
        quiz.documents?.file_name?.toLowerCase().includes(query) || false
      return titleMatch || documentNameMatch
    })
  }, [quizzes, searchQuery])

  return (
    <div className="space-y-5">
      {/* Search & View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) =>
            value && setViewMode(value as "card" | "list")
          }
          className="border rounded-md shrink-0"
        >
          <ToggleGroupItem value="card" aria-label="Card view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Card View */}
      {viewMode === "card" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map((quiz, i) => {
            const bestScore = getBestScore(quiz.quiz_attempts)
            const attemptCount = quiz.quiz_attempts?.length ?? 0
            const mode = modeConfig[quiz.mode] ?? modeConfig.learn

            return (
              <Link
                key={quiz.id}
                href={`/quizzes/${quiz.id}`}
                className="group bg-card p-5 rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg cursor-pointer transition-all duration-200 relative flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{
                  animationDelay: `${Math.min(i * 50, 300)}ms`,
                  animationFillMode: "backwards",
                }}
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-medium capitalize ${mode.className}`}
                  >
                    {mode.label}
                  </Badge>
                </div>

                {/* Title */}
                <h4 className="font-bold text-foreground mb-1 truncate leading-snug">
                  {quiz.title}
                </h4>

                {/* Source document */}
                {quiz.documents?.file_name && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">
                      {quiz.documents.file_name}
                    </p>
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <HelpCircle className="w-3 h-3" />
                    {quiz.question_count} Qs
                  </span>
                  {attemptCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Trophy className="w-3 h-3" />
                      {attemptCount} {attemptCount === 1 ? "attempt" : "attempts"}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {bestScore !== null ? (
                      <span
                        className={`text-sm font-semibold ${
                          bestScore >= 80
                            ? "text-chart-2"
                            : bestScore >= 50
                              ? "text-chart-4"
                              : "text-destructive"
                        }`}
                      >
                        Best: {bestScore}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Not attempted
                      </span>
                    )}
                  </div>
                  <span className="text-primary text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filteredQuizzes.map((quiz, i) => {
            const bestScore = getBestScore(quiz.quiz_attempts)
            const attemptCount = quiz.quiz_attempts?.length ?? 0
            const mode = modeConfig[quiz.mode] ?? modeConfig.learn

            return (
              <Link
                key={quiz.id}
                href={`/quizzes/${quiz.id}`}
                className="group bg-card p-3.5 sm:p-4 rounded-xl border border-border hover:border-primary/50 hover:shadow-md cursor-pointer transition-all duration-200 flex items-center gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-1 duration-200"
                style={{
                  animationDelay: `${Math.min(i * 30, 200)}ms`,
                  animationFillMode: "backwards",
                }}
              >
                {/* Icon */}
                <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:scale-110 transition-transform shrink-0">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-bold text-sm text-foreground truncate">
                      {quiz.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium capitalize shrink-0 hidden sm:inline-flex ${mode.className}`}
                    >
                      {mode.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{quiz.question_count} questions</span>
                    <span className="text-border">·</span>
                    <span className="truncate">
                      {quiz.documents?.file_name ?? "Unknown source"}
                    </span>
                    {quiz.created_at && (
                      <>
                        <span className="text-border hidden sm:inline">·</span>
                        <span className="hidden sm:inline">
                          {formatDate(quiz.created_at)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Score + Arrow */}
                <div className="flex items-center gap-3 shrink-0">
                  {bestScore !== null ? (
                    <span
                      className={`text-sm font-semibold tabular-nums hidden sm:block ${
                        bestScore >= 80
                          ? "text-chart-2"
                          : bestScore >= 50
                            ? "text-chart-4"
                            : "text-destructive"
                      }`}
                    >
                      {bestScore}%
                    </span>
                  ) : attemptCount === 0 ? (
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      New
                    </span>
                  ) : null}
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Empty search state */}
      {filteredQuizzes.length === 0 && (
        <div className="bg-card border border-border border-dashed rounded-2xl p-8 sm:p-12 text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            No quizzes found
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {searchQuery.trim()
              ? `No results for "${searchQuery}". Try a different search term.`
              : "Generate your first quiz from a document to get started."}
          </p>
        </div>
      )}
    </div>
  )
}
