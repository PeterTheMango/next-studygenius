"use client";

import { cn } from "@/lib/utils";
import { Check, Circle, LayoutGrid, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface QuestionNavigatorProps {
  questions: { id: string }[];
  currentIndex: number;
  answeredQuestionIds: Set<string>;
  onNavigate: (index: number) => void;
  className?: string;
}

export function QuestionNavigator({
  questions,
  currentIndex,
  answeredQuestionIds,
  onNavigate,
  className,
}: QuestionNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const answeredCount = answeredQuestionIds.size;
  const totalQuestions = questions.length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        className="lg:hidden fixed bottom-4 right-4 z-50 gap-2 shadow-lg bg-card border-border"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="w-4 h-4" />
        ) : (
          <>
            <LayoutGrid className="w-4 h-4" />
            <span className="tabular-nums text-xs font-semibold">
              {answeredCount}/{totalQuestions}
            </span>
          </>
        )}
      </Button>

      {/* Navigator Panel */}
      <Card
        className={cn(
          "flex flex-col transition-all duration-300 border-border",
          // Mobile: slide-up sheet from bottom
          isOpen
            ? "translate-y-0 opacity-100"
            : "translate-y-full lg:translate-y-0 opacity-0 lg:opacity-100",
          "fixed lg:sticky bottom-0 left-0 right-0 lg:top-16 z-40 lg:z-0",
          "max-h-[60vh] lg:max-h-[calc(100vh-6rem)] lg:h-fit",
          "rounded-b-none lg:rounded-xl",
          className
        )}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-foreground">Questions</h3>
            <Badge
              variant="secondary"
              className="font-mono text-xs tabular-nums"
            >
              {answeredCount}/{totalQuestions}
            </Badge>
          </div>
        </div>

        {/* Question Grid */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4">
          <div className="grid grid-cols-5 gap-2">
            {questions.map((question, index) => {
              const isAnswered = answeredQuestionIds.has(question.id);
              const isCurrent = index === currentIndex;

              return (
                <button
                  key={question.id}
                  onClick={() => {
                    onNavigate(index);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "relative aspect-square rounded-lg border-2 transition-all",
                    "flex items-center justify-center font-medium text-sm",
                    "hover:scale-105 active:scale-95",
                    isCurrent
                      ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-card"
                      : isAnswered
                      ? "border-chart-2/40 bg-chart-2/8"
                      : "border-border bg-card hover:border-muted-foreground/40"
                  )}
                  aria-label={`Question ${index + 1}${
                    isCurrent ? " (current)" : ""
                  }${isAnswered ? " (answered)" : ""}`}
                >
                  <span
                    className={cn(
                      isCurrent
                        ? "text-primary font-bold"
                        : isAnswered
                        ? "text-chart-2 font-semibold"
                        : "text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </span>

                  {/* Status indicator */}
                  {isAnswered && !isCurrent && (
                    <Check
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-chart-2 text-white p-0.5"
                    />
                  )}
                  {!isAnswered && !isCurrent && (
                    <Circle className="absolute -top-1 -right-1 w-3.5 h-3.5 text-muted-foreground/50" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Footer */}
        <div className="p-3.5 sm:p-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground font-medium">Progress</span>
            <span className="font-bold text-foreground tabular-nums">
              {progressPercent}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="bg-chart-2 h-full transition-all duration-500 ease-in-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
