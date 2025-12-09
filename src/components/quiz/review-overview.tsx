"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Circle, AlertTriangle, ArrowLeft, Send, Clock } from "lucide-react";
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Review Your Answers</h1>
        <p className="text-muted-foreground">
          Review your answers before final submission
        </p>
      </div>

      {/* Summary Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{answeredCount}</h2>
            <p className="text-sm text-muted-foreground">
              of {questions.length} questions answered
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {Math.round((answeredCount / questions.length) * 100)}%
            </div>
            <p className="text-sm text-muted-foreground">Complete</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-3 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="bg-green-500 h-full transition-all duration-500 ease-in-out"
            style={{
              width: `${(answeredCount / questions.length) * 100}%`,
            }}
          />
        </div>
      </Card>

      {/* Warning for unanswered questions */}
      {!allAnswered && (
        <Alert variant="default" className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            You have {unansweredCount} unanswered question
            {unansweredCount > 1 ? "s" : ""}. You can still submit, but
            unanswered questions will be marked as incorrect.
          </AlertDescription>
        </Alert>
      )}

      {/* Info for pending evaluations */}
      {pendingEvaluationCount > 0 && (
        <Alert variant="default" className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <Clock className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            {pendingEvaluationCount} answer{pendingEvaluationCount > 1 ? "s are" : " is"} pending evaluation.
            You can submit now and results will update when evaluations complete.
          </AlertDescription>
        </Alert>
      )}

      {/* Questions List */}
      <div className="space-y-3">
        {questions.map((question, index) => {
          const isAnswered = answeredQuestionIds.has(question.id);
          const isPendingEvaluation = pendingEvaluationQuestionIds.has(question.id);

          return (
            <Card
              key={question.id}
              className={cn(
                "p-4 transition-all hover:shadow-md cursor-pointer",
                isPendingEvaluation
                  ? "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/50"
                  : isAnswered
                  ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/50"
                  : "border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/50"
              )}
              onClick={() => onNavigateToQuestion(index)}
            >
              <div className="flex items-start gap-4">
                {/* Question Number & Status Icon */}
                <div className="flex-shrink-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                      isPendingEvaluation
                        ? "bg-blue-500 text-white"
                        : isAnswered
                        ? "bg-green-500 text-white"
                        : "bg-orange-500 text-white"
                    )}
                  >
                    {isPendingEvaluation ? (
                      <Clock className="w-5 h-5 animate-pulse" />
                    ) : isAnswered ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </div>
                </div>

                {/* Question Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">Question {index + 1}</h3>
                    {question.topic && (
                      <Badge variant="outline" className="text-xs">
                        {question.topic}
                      </Badge>
                    )}
                    <Badge
                      variant={isAnswered || isPendingEvaluation ? "default" : "secondary"}
                      className={cn(
                        "text-xs",
                        isPendingEvaluation
                          ? "bg-blue-500 hover:bg-blue-600"
                          : isAnswered
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-orange-500 hover:bg-orange-600 text-white"
                      )}
                    >
                      {isPendingEvaluation ? "Pending Evaluation" : isAnswered ? "Answered" : "Not answered"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {question.questionText}
                  </p>
                </div>

                {/* Action Arrow */}
                <div className="flex-shrink-0">
                  <Button variant="ghost" size="sm">
                    View →
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={onGoBack}
          disabled={isSubmitting}
          size="lg"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quiz
        </Button>

        <Button
          onClick={onSubmitQuiz}
          disabled={isSubmitting}
          size="lg"
          className="bg-blue-500 hover:bg-blue-600"
        >
          {isSubmitting ? (
            "Submitting..."
          ) : (
            <>
              Submit Quiz
              <Send className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
