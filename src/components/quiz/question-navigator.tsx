"use client";

import { cn } from "@/lib/utils";
import { Check, Circle, Menu, X } from "lucide-react";
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const answeredCount = answeredQuestionIds.size;
  const totalQuestions = questions.length;

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        className="lg:hidden fixed top-20 left-4 z-50"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
      </Button>

      {/* Navigator Sidebar */}
      <Card
        className={cn(
          "h-full flex flex-col transition-all duration-300",
          isCollapsed ? "-translate-x-full lg:translate-x-0" : "translate-x-0",
          "fixed lg:sticky top-16 left-0 z-40 lg:z-0",
          "w-64 lg:w-auto",
          className
        )}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Questions</h3>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="font-mono">
              {answeredCount}/{totalQuestions}
            </Badge>
            <span className="text-xs text-muted-foreground">answered</span>
          </div>
        </div>

        {/* Question Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-5 gap-2">
            {questions.map((question, index) => {
              const isAnswered = answeredQuestionIds.has(question.id);
              const isCurrent = index === currentIndex;

              return (
                <button
                  key={question.id}
                  onClick={() => onNavigate(index)}
                  className={cn(
                    "relative aspect-square rounded-lg border-2 transition-all",
                    "flex items-center justify-center font-medium",
                    "hover:shadow-md hover:scale-105",
                    isCurrent
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-500 ring-offset-2"
                      : isAnswered
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : "border-border bg-card dark:bg-card hover:border-muted-foreground/40"
                  )}
                  aria-label={`Question ${index + 1}${
                    isCurrent ? " (current)" : ""
                  }${isAnswered ? " (answered)" : ""}`}
                >
                  {/* Question Number */}
                  <span
                    className={cn(
                      "text-sm",
                      isCurrent
                        ? "text-blue-700 dark:text-blue-300"
                        : isAnswered
                        ? "text-green-700 dark:text-green-300"
                        : "text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </span>

                  {/* Status Icon */}
                  {isAnswered && (
                    <Check
                      className={cn(
                        "absolute -top-1 -right-1 w-4 h-4",
                        "rounded-full bg-green-500 text-white p-0.5"
                      )}
                    />
                  )}
                  {!isAnswered && !isCurrent && (
                    <Circle
                      className={cn(
                        "absolute -top-1 -right-1 w-4 h-4",
                        "text-muted-foreground"
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Summary */}
        <div className="p-4 border-t bg-muted/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">
              {Math.round((answeredCount / totalQuestions) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="bg-green-500 h-full transition-all duration-500 ease-in-out"
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Backdrop for mobile */}
      {!isCollapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
}
