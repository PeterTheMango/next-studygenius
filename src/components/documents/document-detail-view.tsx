"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Clock,
  HardDrive,
  BookOpen,
  Layers,
  Tag,
  Sparkles,
  ChevronRight,
  Timer,
  Repeat,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Hourglass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QuizBuilder } from "@/components/quiz/quiz-builder";
import type { Database } from "@/types/database";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

interface Quiz {
  id: string;
  title: string;
  mode: string;
  question_count: number | null;
  status: string | null;
  created_at: string | null;
}

interface Course {
  id: string;
  title: string;
  color: string;
  icon: string;
}

interface DocumentDetailViewProps {
  document: DocumentRow;
  quizzes: Quiz[];
  course: Course | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  ready: {
    label: "Ready",
    icon: CheckCircle2,
    className: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  },
  processing: {
    label: "Processing",
    icon: Loader2,
    className: "bg-chart-4/15 text-chart-4 border-chart-4/25",
  },
  pending: {
    label: "Pending",
    icon: Hourglass,
    className: "bg-muted text-muted-foreground border-border",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    className: "bg-destructive/15 text-destructive border-destructive/25",
  },
};

const modeIcons: Record<string, React.ElementType> = {
  learn: BookOpen,
  revision: Repeat,
  test: Timer,
};

export function DocumentDetailView({ document, quizzes, course }: DocumentDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("generate");

  const topics = Array.isArray(document.topics) ? (document.topics as string[]) : [];
  const status = document.status ?? "pending";
  const statusInfo = statusConfig[status] ?? statusConfig.pending;
  const StatusIcon = statusInfo.icon;
  const accentColor = course?.color ?? "var(--color-primary)";

  return (
    <div className="animate-in fade-in duration-500">
      {/* Hero header */}
      <div className="relative overflow-hidden">
        {/* Gradient backdrop */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, transparent 60%)`,
          }}
        />
        {/* Blur orb */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-[0.06] dark:opacity-[0.1] -translate-y-1/2 translate-x-1/4"
          style={{ backgroundColor: accentColor }}
        />

        <div className="relative px-4 pt-4 pb-6 md:px-8 md:pt-6 md:pb-8">
          {/* Top bar: back + status */}
          <div className="flex items-center justify-between mb-5 md:mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
              onClick={() => router.push("/documents")}
            >
              <ArrowLeft className="w-4 h-4" />
              Documents
            </Button>

            <div className="flex items-center gap-2">
              {course && (
                <Link href={`/courses/${course.id}`}>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors"
                    style={{ borderColor: `${course.color}40`, color: course.color }}
                  >
                    {course.title}
                  </Badge>
                </Link>
              )}
              <Badge
                variant="outline"
                className={`gap-1 ${statusInfo.className}`}
              >
                <StatusIcon
                  className={`w-3 h-3 ${status === "processing" ? "animate-spin" : ""}`}
                />
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          {/* Document icon + title + meta */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
              style={{
                backgroundColor: `color-mix(in oklch, ${accentColor} 8%, transparent)`,
                color: accentColor,
              }}
            >
              <FileText className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words">
                {document.file_name}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5" />
                  {formatFileSize(document.file_size)}
                </span>
                {document.page_count && (
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    {document.filtered_page_count ?? document.page_count} pages
                    {document.original_page_count && document.filtered_page_count && document.original_page_count !== document.filtered_page_count && (
                      <span className="text-xs text-muted-foreground/60">
                        ({document.original_page_count} total)
                      </span>
                    )}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {formatRelativeDate(document.created_at)}
                </span>
              </div>

              {/* Topics */}
              {topics.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {topics.slice(0, 6).map((topic, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-muted text-muted-foreground text-[11px] font-medium rounded-md"
                    >
                      {String(topic)}
                    </span>
                  ))}
                  {topics.length > 6 && (
                    <span className="text-xs text-muted-foreground">
                      +{topics.length - 6} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Content area */}
      <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div
            className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: "50ms", animationFillMode: "backwards" }}
          >
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Quizzes</p>
              <p className="text-lg font-bold text-foreground leading-tight">
                {quizzes.length}
              </p>
            </div>
          </div>

          <div
            className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
          >
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Pages</p>
              <p className="text-lg font-bold text-foreground leading-tight">
                {document.filtered_page_count ?? document.page_count ?? "—"}
              </p>
            </div>
          </div>

          <div
            className="hidden sm:flex bg-card border border-border rounded-xl p-3.5 items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: "150ms", animationFillMode: "backwards" }}
          >
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Tag className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Topics</p>
              <p className="text-lg font-bold text-foreground leading-tight">
                {topics.length}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex h-10">
            <TabsTrigger value="generate" className="gap-1.5 text-sm">
              <Sparkles className="w-3.5 h-3.5 hidden sm:block" />
              Generate Quiz
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-1.5 text-sm">
              <BookOpen className="w-3.5 h-3.5 hidden sm:block" />
              Quizzes
              <span className="text-muted-foreground ml-0.5">({quizzes.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Generate quiz tab */}
          <TabsContent value="generate" className="mt-5 md:mt-6">
            {status === "ready" ? (
              <QuizBuilder documentId={document.id} documentTitle={document.file_name} />
            ) : (
              <div className="bg-card border border-border border-dashed rounded-2xl p-8 sm:p-12 text-center">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  {status === "processing" ? (
                    <Loader2 className="w-7 h-7 text-muted-foreground animate-spin" />
                  ) : status === "failed" ? (
                    <AlertCircle className="w-7 h-7 text-destructive" />
                  ) : (
                    <Hourglass className="w-7 h-7 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1.5">
                  {status === "processing"
                    ? "Document is being processed"
                    : status === "failed"
                      ? "Processing failed"
                      : "Document is queued"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {status === "processing"
                    ? "Your document is being analyzed. Quiz generation will be available once processing is complete."
                    : status === "failed"
                      ? document.error_message ?? "Something went wrong while processing your document. Please try re-uploading."
                      : "Your document is waiting to be processed. This usually takes a few minutes."}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Quizzes tab */}
          <TabsContent value="quizzes" className="mt-5 md:mt-6">
            {quizzes.length > 0 ? (
              <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                {quizzes.map((quiz, i) => {
                  const ModeIcon = modeIcons[quiz.mode] ?? BookOpen;
                  const quizStatus = quiz.status ?? "ready";
                  const isReady = quizStatus === "ready";

                  return (
                    <Link
                      key={quiz.id}
                      href={isReady ? `/quizzes/${quiz.id}` : `/quizzes/${quiz.id}/generating`}
                      className="group flex items-center gap-3 sm:gap-4 px-4 py-3.5 hover:bg-accent/50 cursor-pointer transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300"
                      style={{
                        animationDelay: `${i * 50}ms`,
                        animationFillMode: "backwards",
                      }}
                    >
                      <div className="p-2 bg-primary/10 rounded-lg shrink-0 group-hover:bg-primary/15 transition-colors">
                        <ModeIcon className="w-4 h-4 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {quiz.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {quiz.question_count ?? "—"} questions · {formatRelativeDate(quiz.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize hidden sm:inline-flex"
                        >
                          {quiz.mode}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="bg-card border border-border border-dashed rounded-2xl p-8 sm:p-12 text-center">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1.5">
                  No quizzes yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
                  Generate your first quiz from this document to start studying.
                </p>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => setActiveTab("generate")}
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Quiz
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
