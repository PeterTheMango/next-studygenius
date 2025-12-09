"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      // Fetch quiz and check for in-progress attempts
      const res = await fetch(`/api/quizzes/${quizId}/check-progress`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load quiz");
      }

      setQuiz(data.quiz);

      if (data.inProgressAttempt) {
        // User has an in-progress attempt - show banner
        setInProgressAttempt(data.inProgressAttempt);
        setAttemptId(data.inProgressAttempt.id);

        // Store question order and option seeds if available
        if (data.inProgressAttempt.questionOrder) {
          const storedOrder = data.inProgressAttempt.questionOrder.questions || [];
          const storedSeeds = data.inProgressAttempt.questionOrder.optionSeeds || {};

          setQuestionOrder(storedOrder);
          setOptionSeeds(storedSeeds);

          // Apply shuffled order immediately if we have it
          if (storedOrder.length > 0) {
            const shuffledQuestions = applyQuestionOrder(data.questions, storedOrder);
            setQuestions(shuffledQuestions);
          } else {
            setQuestions(data.questions);
          }
        } else {
          setQuestions(data.questions);
        }
      } else {
        // Set questions in original order initially
        setQuestions(data.questions);
        // No in-progress attempt - create new one and start immediately
        await createNewAttempt();
      }
    } catch (error) {
      console.error("Load quiz error:", error);
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

      // Store question order and option seeds from new attempt
      if (data.attempt.questionOrder && data.attempt.optionSeeds) {
        setQuestionOrder(data.attempt.questionOrder);
        setOptionSeeds(data.attempt.optionSeeds);

        // Apply shuffled order to questions immediately
        if (data.attempt.questionOrder.length > 0 && questions.length > 0) {
          const shuffledQuestions = applyQuestionOrder(questions, data.attempt.questionOrder);
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

    // Merge local and database responses
    const localResponses = getLocalResponses(inProgressAttempt.id);
    const merged = mergeResponses(localResponses, inProgressAttempt.responses);

    // Convert to SavedResponse Map for initialResponses
    const savedResponsesMap = new Map<string, SavedResponse>();
    inProgressAttempt.responses.forEach((resp) => {
      savedResponsesMap.set(resp.questionId, resp);
    });

    // Overlay with merged data (which includes local responses)
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
      });
    });

    // Questions are already in shuffled order from loadQuizData
    // Calculate starting index (first unanswered question in shuffled order)
    const answeredIds = new Set(merged.keys());
    const startIdx = getStartingQuestionIndex(questions, answeredIds);

    setInitialResponses(savedResponsesMap);
    setStartingIndex(startIdx);
    setShouldShowPlayer(true);
    setInProgressAttempt(null); // Hide banner

    toast.success(`Resuming from question ${startIdx + 1}`);
  };

  const handleRestart = () => {
    // The banner component handles the abandon API call
    // After successful abandon, it will reload the page
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-muted-foreground">
            Quiz not found or has no questions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto">
        {/* Show resume banner if in-progress attempt exists and player not started */}
        {inProgressAttempt && !shouldShowPlayer && (
          <ResumeQuizBanner
            attemptId={inProgressAttempt.id}
            quizId={quizId}
            answeredCount={inProgressAttempt.answeredCount}
            totalQuestions={questions.length}
            lastAnsweredAt={inProgressAttempt.startedAt}
            onResume={handleResume}
            onRestart={handleRestart}
          />
        )}

        {/* Show quiz player when ready */}
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
    </div>
  );
}
