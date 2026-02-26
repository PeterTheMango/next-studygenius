"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QuizPlayer } from "@/components/quiz/quiz-player";
import { ResumeQuizBanner } from "@/components/quiz/resume-quiz-banner";
import {
  getLocalResponses,
  mergeResponses,
  getStartingQuestionIndex,
  type SavedResponse,
} from "@/lib/quiz-sync";
import { applyQuestionOrder } from "@/lib/shuffle";
import { toast } from "sonner";
import {
  ArrowLeft,
  GraduationCap,
  FileQuestion,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Question {
  id: string;
  type: string;
  topic: string;
  difficulty: string;
  questionText: string;
  options?: string[];
  hint?: string;
  timeEstimate: number;
  matchingPairs?: { left: string; right: string }[];
  orderingItems?: string[];
  correctAnswer?: string;
  explanation?: string;
  sourceReference?: string;
}

interface InProgressAttempt {
  id: string;
  startedAt: string;
  answeredCount: number;
  responses: SavedResponse[];
  questionOrder?: {
    questions: string[];
    optionSeeds: Record<string, number>;
  };
}

interface QuizData {
  id: string;
  title?: string;
  mode: string;
  settings?: {
    timeLimit?: number;
  };
}

export default function TakeQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: quizId } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string>("");
  const [inProgressAttempt, setInProgressAttempt] =
    useState<InProgressAttempt | null>(null);
  const [shouldShowPlayer, setShouldShowPlayer] = useState(false);
  const [initialResponses, setInitialResponses] = useState<
    Map<string, SavedResponse>
  >(new Map());
  const [startingIndex, setStartingIndex] = useState(0);
  const [questionOrder, setQuestionOrder] = useState<string[]>([]);
  const [optionSeeds, setOptionSeeds] = useState<Record<string, number>>({});

  useEffect(() => {
    loadQuizData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadQuizData = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const res = await fetch(`/api/quizzes/${quizId}/check-progress`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load quiz");
      }

      setQuiz(data.quiz);

      if (data.inProgressAttempt) {
        setInProgressAttempt(data.inProgressAttempt);
        setAttemptId(data.inProgressAttempt.id);

        if (data.inProgressAttempt.questionOrder) {
          const storedOrder =
            data.inProgressAttempt.questionOrder.questions || [];
          const storedSeeds =
            data.inProgressAttempt.questionOrder.optionSeeds || {};

          setQuestionOrder(storedOrder);
          setOptionSeeds(storedSeeds);

          if (storedOrder.length > 0) {
            const shuffledQuestions = applyQuestionOrder(
              data.questions as Question[],
              storedOrder
            );
            setQuestions(shuffledQuestions);
          } else {
            setQuestions(data.questions as Question[]);
          }
        } else {
          setQuestions(data.questions as Question[]);
        }
      } else {
        setQuestions(data.questions as Question[]);
        await createNewAttempt();
      }
    } catch (error) {
      console.error("Load quiz error:", error);
      setHasError(true);
      toast.error(
        error instanceof Error ? error.message : "Failed to load quiz"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const createNewAttempt = async () => {
    try {
      const res = await fetch(`/api/quizzes/${quizId}/start`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start quiz");
      }

      setAttemptId(data.attempt.id);

      if (data.attempt.questionOrder && data.attempt.optionSeeds) {
        setQuestionOrder(data.attempt.questionOrder);
        setOptionSeeds(data.attempt.optionSeeds);

        if (data.attempt.questionOrder.length > 0 && questions.length > 0) {
          const shuffledQuestions = applyQuestionOrder(
            questions,
            data.attempt.questionOrder
          );
          setQuestions(shuffledQuestions);
        }
      }

      setShouldShowPlayer(true);
    } catch (error) {
      console.error("Create attempt error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start quiz"
      );
    }
  };

  const handleResume = () => {
    if (!inProgressAttempt) return;

    const localResponses = getLocalResponses(inProgressAttempt.id);
    const merged = mergeResponses(localResponses, inProgressAttempt.responses);

    const savedResponsesMap = new Map<string, SavedResponse>();
    inProgressAttempt.responses.forEach((resp) => {
      savedResponsesMap.set(resp.questionId, resp);
    });

    merged.forEach((value, questionId) => {
      const existing = savedResponsesMap.get(questionId);
      savedResponsesMap.set(questionId, {
        id: existing?.id || questionId,
        questionId: questionId,
        answer: value.answer,
        isCorrect: value.isCorrect,
        score: value.score ?? null,
        timeSpent: value.timeSpent,
        answeredAt: existing?.answeredAt || new Date().toISOString(),
        evaluationStatus: value.evaluationStatus,
      });
    });

    const answeredIds = new Set(merged.keys());
    const startIdx = getStartingQuestionIndex(questions, answeredIds);

    setInitialResponses(savedResponsesMap);
    setStartingIndex(startIdx);
    setShouldShowPlayer(true);
    setInProgressAttempt(null);

    toast.success(`Resuming from question ${startIdx + 1}`);
  };

  const handleRestart = () => {
    router.refresh();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
        {/* Back nav skeleton */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="h-4 w-28 bg-muted rounded-md animate-pulse" />
        </div>

        {/* Header skeleton */}
        <div
          className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: "50ms", animationFillMode: "backwards" }}
        >
          <div className="p-2.5 bg-muted rounded-xl shrink-0">
            <div className="w-5 h-5" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="h-7 w-48 bg-muted rounded-md animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded-md animate-pulse" />
          </div>
        </div>

        {/* Quiz player area skeleton */}
        <div
          className="bg-card border border-border rounded-2xl p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
        >
          <div className="flex flex-col items-center justify-center gap-4 py-8 sm:py-12">
            <div className="p-3 bg-primary/10 rounded-full">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-foreground">
                Preparing your quiz...
              </p>
              <p className="text-xs text-muted-foreground">
                Loading questions and checking progress
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error / empty state
  if (hasError || !quiz || questions.length === 0) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
        {/* Back nav */}
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationFillMode: "backwards" }}
        >
          <Link
            href={`/quizzes/${quizId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Quiz
          </Link>
        </div>

        {/* Empty state card */}
        <div
          className="bg-card border border-border border-dashed rounded-2xl p-8 sm:p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
        >
          <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            {hasError ? (
              <AlertTriangle className="w-7 h-7 text-muted-foreground" />
            ) : (
              <FileQuestion className="w-7 h-7 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1.5">
            {hasError ? "Failed to load quiz" : "Quiz not available"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
            {hasError
              ? "Something went wrong while loading the quiz. Please try again."
              : "This quiz could not be found or has no questions yet."}
          </p>
          {hasError ? (
            <button
              onClick={() => loadQuizData()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all"
            >
              Try Again
            </button>
          ) : (
            <Link
              href="/quizzes"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all"
            >
              Back to Quizzes
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Resume banner state (in-progress attempt, player not yet shown)
  if (inProgressAttempt && !shouldShowPlayer) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
        {/* Back nav */}
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationFillMode: "backwards" }}
        >
          <Link
            href={`/quizzes/${quizId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Quiz
          </Link>
        </div>

        {/* Page header */}
        <div
          className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: "50ms", animationFillMode: "backwards" }}
        >
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
              {quiz.title || "Take Quiz"}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge
                variant="secondary"
                className="text-xs font-normal capitalize"
              >
                {quiz.mode}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {questions.length} question{questions.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Resume banner */}
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
        >
          <ResumeQuizBanner
            attemptId={inProgressAttempt.id}
            quizId={quizId}
            answeredCount={inProgressAttempt.answeredCount}
            totalQuestions={questions.length}
            lastAnsweredAt={inProgressAttempt.startedAt}
            onResume={handleResume}
            onRestart={handleRestart}
          />
        </div>
      </div>
    );
  }

  // Active quiz player
  return (
    <div className="animate-in fade-in duration-300">
      {shouldShowPlayer && attemptId && quiz && (
        <QuizPlayer
          quizId={quizId}
          attemptId={attemptId}
          mode={quiz.mode as "learn" | "revision" | "test"}
          questions={questions}
          timeLimit={quiz.settings?.timeLimit}
          initialResponses={initialResponses}
          startingQuestionIndex={startingIndex}
          optionSeeds={optionSeeds}
        />
      )}
    </div>
  );
}
