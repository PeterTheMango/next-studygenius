"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Check,
  Circle,
  AlertTriangle,
  ArrowLeft,
  Send,
  Clock,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  questionText: string;
  topic?: string;
}

interface ReviewOverviewProps {
  questions: Question[];
  answeredQuestionIds: Set<string>;
  pendingEvaluationQuestionIds?: Set<string>;
  onNavigateToQuestion: (index: number) => void;
  onSubmitQuiz: () => void;
  onGoBack: () => void;
  isSubmitting?: boolean;
}

export function ReviewOverview({
  questions,
  answeredQuestionIds,
  pendingEvaluationQuestionIds = new Set(),
  onNavigateToQuestion,
  onSubmitQuiz,
  onGoBack,
  isSubmitting = false,
}: ReviewOverviewProps) {
  const answeredCount = answeredQuestionIds.size;
  const unansweredCount = questions.length - answeredCount;
  const pendingEvaluationCount = pendingEvaluationQuestionIds.size;
  const allAnswered = unansweredCount === 0;
  const progressPercent = Math.round(
    (answeredCount / questions.length) * 100
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div
        className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{ animationFillMode: "backwards" }}
      >
        <div className="p-2.5 bg-primary/10 text-primary rounded-xl w-fit mx-auto mb-3">
          <ClipboardCheck className="w-5 h-5" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          Review Your Answers
        </h1>
        <p className="text-sm text-muted-foreground">
          Review your answers before final submission
        </p>
      </div>

      {/* Summary Card */}
      <Card
        className="p-4 sm:p-6 border-border animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{ animationDelay: "50ms", animationFillMode: "backwards" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
              {answeredCount}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              of {questions.length} questions answered
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
              {progressPercent}%
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Complete</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2.5 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="bg-chart-2 h-full transition-all duration-500 ease-in-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </Card>

      {/* Warning for unanswered questions */}
      {!allAnswered && (
        <Alert
          variant="default"
          className="border-chart-4/40 bg-chart-4/8 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
        >
          <AlertTriangle className="h-4 w-4 text-chart-4" />
          <AlertDescription className="text-foreground text-sm">
            You have{" "}
            <strong>
              {unansweredCount} unanswered question
              {unansweredCount > 1 ? "s" : ""}
            </strong>
            . You can still submit, but unanswered questions will be marked as
            incorrect.
          </AlertDescription>
        </Alert>
      )}

      {/* Info for pending evaluations */}
      {pendingEvaluationCount > 0 && (
        <Alert
          variant="default"
          className="border-primary/25 bg-primary/5 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
        >
          <Clock className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground text-sm">
            <strong>
              {pendingEvaluationCount} answer
              {pendingEvaluationCount > 1 ? "s are" : " is"}
            </strong>{" "}
            pending evaluation. You can submit now and results will update when
            evaluations complete.
          </AlertDescription>
        </Alert>
      )}

      {/* Questions List */}
      <div className="space-y-2.5">
        {questions.map((question, index) => {
          const isAnswered = answeredQuestionIds.has(question.id);
          const isPendingEvaluation = pendingEvaluationQuestionIds.has(
            question.id
          );

          return (
            <Card
              key={question.id}
              className={cn(
                "p-3 sm:p-4 transition-all hover:shadow-sm cursor-pointer border animate-in fade-in slide-in-from-bottom-2 duration-300",
                isPendingEvaluation
                  ? "border-primary/20 bg-primary/3"
                  : isAnswered
                  ? "border-chart-2/20 bg-chart-2/3"
                  : "border-chart-4/20 bg-chart-4/3"
              )}
              style={{
                animationDelay: `${150 + index * 30}ms`,
                animationFillMode: "backwards",
              }}
              onClick={() => onNavigateToQuestion(index)}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Status circle */}
                <div className="shrink-0">
                  <div
                    className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold",
                      isPendingEvaluation
                        ? "bg-primary text-primary-foreground"
                        : isAnswered
                        ? "bg-chart-2 text-white"
                        : "bg-chart-4 text-white"
                    )}
                  >
                    {isPendingEvaluation ? (
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                    ) : isAnswered ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Circle className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>
                </div>

                {/* Question Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="font-semibold text-sm text-foreground">
                      Question {index + 1}
                    </h3>
                    {question.topic && (
                      <Badge
                        variant="outline"
                        className="text-[10px] sm:text-xs border-border"
                      >
                        {question.topic}
                      </Badge>
                    )}
                    <Badge
                      className={cn(
                        "text-[10px] sm:text-xs",
                        isPendingEvaluation
                          ? "bg-primary/15 text-primary border-primary/25"
                          : isAnswered
                          ? "bg-chart-2/15 text-chart-2 border-chart-2/25"
                          : "bg-chart-4/15 text-chart-4 border-chart-4/25"
                      )}
                    >
                      {isPendingEvaluation
                        ? "Pending"
                        : isAnswered
                        ? "Answered"
                        : "Unanswered"}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {question.questionText}
                  </p>
                </div>

                {/* Action */}
                <div className="shrink-0 hidden sm:block">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    View →
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div
        className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 sm:pt-6 border-t border-border animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{
          animationDelay: `${150 + questions.length * 30 + 50}ms`,
          animationFillMode: "backwards",
        }}
      >
        <Button
          variant="outline"
          onClick={onGoBack}
          disabled={isSubmitting}
          size="lg"
          className="gap-2 w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quiz
        </Button>

        <Button
          onClick={onSubmitQuiz}
          disabled={isSubmitting}
          size="lg"
          className="gap-2 w-full sm:w-auto"
        >
          {isSubmitting ? (
            "Submitting..."
          ) : (
            <>
              Submit Quiz
              <Send className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
