"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Timer } from "./timer";
import { QuestionCard } from "./question-card";
import { QuestionNavigator } from "./question-navigator";
import { ReviewOverview } from "./review-overview";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  WifiOff,
  Wifi,
  ArrowLeft,
  Eye,
  AlertCircle,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  saveResponse,
  setupSyncListeners,
  hasPendingSaves,
  getPendingSaveCount,
  clearLocalResponses,
  hasPendingEvaluations,
  getPendingEvaluationCount,
  type QuizResponse,
} from "@/lib/quiz-sync";

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

interface QuizPlayerProps {
  quizId: string;
  attemptId: string;
  mode: "learn" | "revision" | "test";
  questions: Question[];
  timeLimit?: number;
  initialResponses?: Map<string, SavedResponse>;
  startingQuestionIndex?: number;
  optionSeeds?: Record<string, number>;
}

interface SavedResponse {
  id: string;
  questionId: string;
  answer: any;
  isCorrect: boolean | null;
  score: number | null;
  timeSpent: number;
  answeredAt: string;
  evaluationStatus: "pending" | "evaluated" | "failed";
}

interface Response {
  questionId: string;
  answer: any;
  isCorrect: boolean | null;
  score?: number | null;
  timeSpent: number;
  evaluationStatus: "pending" | "evaluated" | "failed";
  attemptNumber?: number;
  isRetryRound?: boolean;
}

interface MasteryProgress {
  consecutiveCorrect: number; // Track consecutive correct answers (need 2 for mastery)
  totalAttempts: number; // Total number of attempts for this question
}

export function QuizPlayer({
  quizId,
  attemptId,
  mode,
  questions,
  timeLimit,
  initialResponses,
  startingQuestionIndex = 0,
  optionSeeds = {},
}: QuizPlayerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(startingQuestionIndex);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean | null;
    correctAnswer: string;
    explanation: string;
    score?: number | null;
    isPending?: boolean;
  } | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showReviewOverview, setShowReviewOverview] = useState(false);
  const previousAnswerRef = useRef<any>(null);

  // Store all responses locally
  const [responses, setResponses] = useState<Map<string, Response>>(() => {
    // Initialize with previous responses if resuming
    if (initialResponses && initialResponses.size > 0) {
      const responseMap = new Map<string, Response>();
      initialResponses.forEach((value) => {
        responseMap.set(value.questionId, {
          questionId: value.questionId,
          answer:
            typeof value.answer === "string" &&
            (value.answer.startsWith("{") || value.answer.startsWith("["))
              ? JSON.parse(value.answer)
              : value.answer,
          isCorrect: value.isCorrect,
          score: value.score ?? undefined,
          timeSpent: value.timeSpent,
          evaluationStatus: value.evaluationStatus,
        });
      });
      return responseMap;
    }
    return new Map();
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSaveCount, setPendingSaveCount] = useState(0);
  const [pendingEvaluationCount, setPendingEvaluationCount] = useState(0);
  const [isOverriding, setIsOverriding] = useState(false);

  // Retry round state (learning mode only)
  const [isRetryRound, setIsRetryRound] = useState(false);
  const [retryQuestions, setRetryQuestions] = useState<Question[]>([]);
  const [retryQuestionIndex, setRetryQuestionIndex] = useState(0);
  const [masteryProgress, setMasteryProgress] = useState<
    Map<string, MasteryProgress>
  >(new Map());
  const [firstAttemptResponses, setFirstAttemptResponses] = useState<
    Map<string, Response>
  >(new Map());

  // Determine current question based on mode (normal or retry round)
  const currentQuestion = isRetryRound
    ? retryQuestions[retryQuestionIndex]
    : questions[currentIndex];

  const isLastQuestion = isRetryRound
    ? false // Never last in retry round until mastery achieved
    : currentIndex === questions.length - 1;

  const progress = isRetryRound
    ? 100 // Show full progress in retry round
    : ((currentIndex + (submitted ? 1 : 0)) / questions.length) * 100;

  const correctCount = Array.from(responses.values()).filter(
    (r) => r.isCorrect
  ).length;

  useEffect(() => {
    setQuestionStartTime(Date.now());

    // In test mode, load previous answer if it exists
    if (mode === "test") {
      const existingResponse = responses.get(currentQuestion.id);
      if (existingResponse) {
        setSelectedAnswer(existingResponse.answer);
        previousAnswerRef.current = existingResponse.answer;
      } else {
        setSelectedAnswer(null);
        previousAnswerRef.current = null;
      }
    } else {
      // In learn/revision mode, reset answer on new question
      setSelectedAnswer(null);
      previousAnswerRef.current = null;
    }

    setSubmitted(false);
    setFeedback(null);
  }, [currentIndex, mode, currentQuestion.id]); // Removed 'responses' to prevent premature reset

  // Setup sync listeners for online/offline detection
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      setPendingSaveCount(getPendingSaveCount(attemptId));
      setPendingEvaluationCount(getPendingEvaluationCount(attemptId));
    };

    // Initial check
    updateOnlineStatus();

    // Setup event listeners
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Setup sync listeners for auto-retry
    const cleanupSync = setupSyncListeners();

    // Periodic check for pending saves and evaluations
    const intervalId = setInterval(() => {
      setPendingSaveCount(getPendingSaveCount(attemptId));
      setPendingEvaluationCount(getPendingEvaluationCount(attemptId));
    }, 5000); // Every 5 seconds

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      cleanupSync();
      clearInterval(intervalId);
    };
  }, [attemptId]);

  const checkAnswer = (question: Question, answer: any): boolean => {
    if (answer == "F" || answer == "T") {
      // True/False questions - normalize to boolean
      answer = answer === "T" ? "True" : "False";
    }

    if (question.type === "matching" && question.matchingPairs) {
      if (!Array.isArray(answer)) return false;
      // Check if every pair in the question matches the user's answer
      return question.matchingPairs.every((pair) => {
        const userMatch = answer.find((a: any) => a.left === pair.left);
        return userMatch && userMatch.right === pair.right;
      });
    }

    if (question.type === "ordering" && question.orderingItems) {
      if (!Array.isArray(answer)) return false;
      return JSON.stringify(answer) === JSON.stringify(question.orderingItems);
    }

    if (question.type === "fill_blank" || question.type === "short_answer") {
      return (
        String(answer).trim().toLowerCase() ===
        String(question.correctAnswer).trim().toLowerCase()
      );
    }

    // Multiple choice / True False - compare the letters directly
    // Both answer and correctAnswer are original option letters (A, B, C, D)
    // The question-card component already maps shuffled letters back to original letters
    return (
      String(answer).toUpperCase() ===
      String(question.correctAnswer).toUpperCase()
    );
  };

  const handleSubmitAnswer = async () => {
    if (
      !selectedAnswer &&
      currentQuestion.type !== "matching" &&
      currentQuestion.type !== "ordering"
    ) {
      toast.error("Please select an answer");
      return;
    }

    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    const isCorrect = checkAnswer(currentQuestion, selectedAnswer);

    // Store response locally
    setResponses((prev) => {
      const newMap = new Map(prev);
      newMap.set(currentQuestion.id, {
        questionId: currentQuestion.id,
        answer: selectedAnswer,
        isCorrect,
        timeSpent,
        evaluationStatus: "evaluated",
      });
      return newMap;
    });

    if (mode === "test") {
      // In test mode, immediately move to next or finish
      if (isLastQuestion) {
        await submitAllResults(true); // pass true to indicate it's from the last question step
      } else {
        setCurrentIndex((prev) => prev + 1);
        setSubmitted(false);
      }
    } else {
      // In learn/revision mode, show feedback
      setFeedback({
        isCorrect: isCorrect,
        correctAnswer: currentQuestion.correctAnswer || "See explanation",
        explanation: currentQuestion.explanation || "No explanation provided.",
      });
      setSubmitted(true);

      if (isCorrect) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  };

  const submitAllResults = async (finalSubmission = false) => {
    // If called from last question in test mode, we might need to ensure the last answer is included.
    // logic in handleSubmitAnswer already updates state, but state update is async?
    // Actually, we should use a ref or pass the latest response if needed,
    // but simpler is to rely on 'responses' map being updated.
    // Wait, in `handleSubmitAnswer` for test mode:
    // setResponses calls state update.
    // Then `submitAllResults` is called.
    // The `responses` variable in this closure will be STALE.
    // We must construct the final list including the current answer if we are on the last question and just submitted.

    // Better approach:
    // In `handleSubmitAnswer`, we construct the new map.
    // We can pass that new map to `submitAllResults`.

    // Let's refine `handleSubmitAnswer` logic below to handle this.
    // But for now, let's just define the submission logic.

    setIsSubmitting(true);
    try {
      // Re-construct latest responses from state + current if needed?
      // Actually, let's fix the flow in handleSubmitAnswer instead.
      // Here we just assume `responses` is ready or passed as arg?
      // Let's change signature to accept responses optionally.
    } catch (e) {
      /*...*/
    }
  };

  // Revised submit function that takes responses as argument
  const performFinalSubmission = async (finalResponses: Response[]) => {
    setIsSubmitting(true);
    try {
      // Check if there are pending saves before final submission
      if (hasPendingSaves(attemptId)) {
        toast.warning("Some answers are still syncing. Please wait...");
        // Wait a moment and retry
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // If still pending after wait, warn user
        if (hasPendingSaves(attemptId)) {
          const shouldContinue = confirm(
            "Some answers failed to sync to the server but are saved locally. Do you want to continue? They will sync when you're back online."
          );
          if (!shouldContinue) {
            setIsSubmitting(false);
            return;
          }
        }
      }

      const res = await fetch(`/api/quizzes/${quizId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          responses: finalResponses,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Clear local storage after successful completion
      clearLocalResponses(attemptId);

      if (data.redirect) {
        router.push(data.redirect);
      } else {
        router.push(`/quizzes/${quizId}/results?attempt=${attemptId}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit quiz");
      setIsSubmitting(false);
    }
  };

  // Function to enter retry round for learning mode
  const enterRetryRound = () => {
    if (mode !== "learn" && mode !== "revision") return;

    // Find all questions that were answered incorrectly on first attempt
    const incorrectQuestions = questions.filter((q) => {
      const response = responses.get(q.id);
      return response && !response.isCorrect;
    });

    if (incorrectQuestions.length === 0) {
      // No incorrect questions, proceed to results
      if (typeof window !== "undefined") {
        const scoresData = Array.from(responses.values()).map((r) => ({
          questionId: r.questionId,
          score: r.score,
          answer: r.answer,
        }));
        sessionStorage.setItem(
          `quiz-scores-${attemptId}`,
          JSON.stringify(scoresData)
        );
      }
      const allResponses = Array.from(responses.values());
      performFinalSubmission(allResponses);
      return;
    }

    // Save first attempt responses
    setFirstAttemptResponses(new Map(responses));

    // Initialize mastery progress for each incorrect question
    const initialProgress = new Map<string, MasteryProgress>();
    incorrectQuestions.forEach((q) => {
      initialProgress.set(q.id, {
        consecutiveCorrect: 0,
        totalAttempts: 0,
      });
    });
    setMasteryProgress(initialProgress);

    // Shuffle retry questions for variety
    const shuffled = [...incorrectQuestions].sort(() => Math.random() - 0.5);
    setRetryQuestions(shuffled);
    setRetryQuestionIndex(0);
    setIsRetryRound(true);
    setSubmitted(false);
    setFeedback(null);

    toast.info(
      `Let's retry ${incorrectQuestions.length} question${
        incorrectQuestions.length > 1 ? "s" : ""
      } until you master them!`,
      {
        duration: 4000,
      }
    );
  };

  const handleNext = () => {
    if (isRetryRound) {
      // In retry round, move to next retry question or cycle back
      const nextIndex = retryQuestionIndex + 1;

      // Check if all questions have achieved mastery
      const allMastered = Array.from(masteryProgress.values()).every(
        (progress) => progress.consecutiveCorrect >= 2
      );

      if (allMastered) {
        // All questions mastered, proceed to results
        if (typeof window !== "undefined") {
          const scoresData = Array.from(responses.values()).map((r) => ({
            questionId: r.questionId,
            score: r.score,
            answer: r.answer,
          }));
          sessionStorage.setItem(
            `quiz-scores-${attemptId}`,
            JSON.stringify(scoresData)
          );
        }
        const allResponses = Array.from(responses.values());
        performFinalSubmission(allResponses);
        return;
      }

      if (nextIndex >= retryQuestions.length) {
        // Reached end of retry questions, cycle back to questions that need more practice
        const questionsNeedingPractice = retryQuestions.filter((q) => {
          const progress = masteryProgress.get(q.id);
          return progress && progress.consecutiveCorrect < 2;
        });

        if (questionsNeedingPractice.length === 0) {
          // All mastered (shouldn't reach here due to check above)
          const allResponses = Array.from(responses.values());
          performFinalSubmission(allResponses);
          return;
        }

        // Reshuffle questions that still need practice
        const reshuffled = [...questionsNeedingPractice].sort(
          () => Math.random() - 0.5
        );
        setRetryQuestions(reshuffled);
        setRetryQuestionIndex(0);
      } else {
        setRetryQuestionIndex(nextIndex);
      }

      setSubmitted(false);
      setFeedback(null);
    } else {
      // Normal mode logic
      if (isLastQuestion) {
        // Check if we should enter retry round (learning/revision mode only)
        if (mode === "learn" || mode === "revision") {
          enterRetryRound();
        } else {
          // Test mode - go straight to results
          if (typeof window !== "undefined") {
            const scoresData = Array.from(responses.values()).map((r) => ({
              questionId: r.questionId,
              score: r.score,
              answer: r.answer,
            }));
            sessionStorage.setItem(
              `quiz-scores-${attemptId}`,
              JSON.stringify(scoresData)
            );
          }
          const allResponses = Array.from(responses.values());
          performFinalSubmission(allResponses);
        }
      } else {
        setCurrentIndex((prev) => prev + 1);
        setSubmitted(false);
        setFeedback(null);
      }
    }
  };

  // Overwriting handleSubmitAnswer to correctly handle state closure
  const handleAnswerWrapper = async () => {
    if (
      !selectedAnswer &&
      currentQuestion.type !== "matching" &&
      currentQuestion.type !== "ordering"
    ) {
      toast.error("Please select an answer");
      return;
    }

    setIsSubmitting(true);

    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    let isCorrect: boolean | null = false;
    let score: number | null = 0;
    let explanation = currentQuestion.explanation;
    let evaluationStatus: "pending" | "evaluated" | "failed" = "evaluated";
    let isPendingEvaluation = false;

    try {
      if (
        currentQuestion.type === "short_answer" ||
        currentQuestion.type === "fill_blank"
      ) {
        // 1. Optimistic strict check
        const strictMatch =
          String(selectedAnswer).trim().toLowerCase() ===
          String(currentQuestion.correctAnswer).trim().toLowerCase();

        if (strictMatch) {
          isCorrect = true;
          score = 100;
          evaluationStatus = "evaluated";
        } else {
          // 2. AI Evaluation (only if online)
          if (!navigator.onLine) {
            // Mark as pending when offline
            isCorrect = null;
            score = null;
            evaluationStatus = "pending";
            isPendingEvaluation = true;
            explanation =
              "Your answer has been saved and will be evaluated when you're back online.";
          } else {
            try {
              const res = await fetch("/api/quizzes/evaluate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  questionText: currentQuestion.questionText,
                  modelAnswer: currentQuestion.correctAnswer,
                  userAnswer: selectedAnswer,
                  threshold: 70,
                }),
              });

              if (!res.ok) throw new Error("Evaluation failed");

              const data = await res.json();
              isCorrect = data.isCorrect;
              score = data.score;
              evaluationStatus = "evaluated";
              if (data.explanation) {
                explanation = data.explanation;
              }
            } catch (err) {
              console.error("AI Eval error:", err);
              // Mark as pending on evaluation failure
              isCorrect = null;
              score = null;
              evaluationStatus = "pending";
              isPendingEvaluation = true;
              explanation =
                "Answer saved. Evaluation will be retried automatically.";
              toast.warning(
                "Could not evaluate answer. Will retry automatically."
              );
            }
          }
        }
      } else {
        // Simple questions can be evaluated client-side immediately
        isCorrect = checkAnswer(currentQuestion, selectedAnswer);
        score = isCorrect ? 100 : 0;
        evaluationStatus = "evaluated";
      }

      // Calculate attempt number for this question
      const currentAttemptNumber = isRetryRound
        ? (masteryProgress.get(currentQuestion.id)?.totalAttempts || 0) + 1
        : 1;

      const newResponse: Response = {
        questionId: currentQuestion.id,
        answer: selectedAnswer,
        isCorrect,
        score,
        timeSpent,
        evaluationStatus,
        attemptNumber: currentAttemptNumber,
        isRetryRound: isRetryRound,
      };

      // Update mastery progress if in retry round
      if (isRetryRound && isCorrect !== null) {
        const currentProgress = masteryProgress.get(currentQuestion.id) || {
          consecutiveCorrect: 0,
          totalAttempts: 0,
        };

        const updatedProgress: MasteryProgress = {
          totalAttempts: currentAttemptNumber,
          consecutiveCorrect: isCorrect
            ? currentProgress.consecutiveCorrect + 1
            : 0, // Reset on incorrect answer
        };

        setMasteryProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(currentQuestion.id, updatedProgress);
          return newMap;
        });

        // Show mastery feedback
        if (isCorrect && updatedProgress.consecutiveCorrect === 1) {
          toast.success("Correct! One more time to master this question.", {
            duration: 3000,
          });
        } else if (isCorrect && updatedProgress.consecutiveCorrect >= 2) {
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
          toast.success("🎉 Mastered! You answered correctly twice in a row!", {
            duration: 4000,
          });
        } else if (!isCorrect) {
          toast.error("Not quite right. Let's keep practicing!", {
            duration: 3000,
          });
        }
      }

      // Update state
      const newResponsesMap = new Map(responses);
      newResponsesMap.set(currentQuestion.id, newResponse);
      setResponses(newResponsesMap);

      // **NEW: Save answer incrementally (local-first with background sync)**
      const quizResponse: QuizResponse = {
        attemptId,
        questionId: currentQuestion.id,
        answer: selectedAnswer,
        isCorrect,
        score,
        timeSpent,
        timestamp: Date.now(),
        evaluationStatus,
        attemptNumber: currentAttemptNumber,
        isRetryRound: isRetryRound,
      };

      const saveResult = await saveResponse(quizId, quizResponse);

      if (!saveResult.savedToServer) {
        // Show subtle warning if save failed but continue
        if (!navigator.onLine) {
          if (isPendingEvaluation) {
            toast.info("Answer saved offline. Will be evaluated when online.");
          } else {
            toast.info(
              "Offline - answer saved locally and will sync when online"
            );
          }
        } else {
          toast.warning("Answer saved locally but failed to sync to server");
        }
        setPendingSaveCount(getPendingSaveCount(attemptId));
        setPendingEvaluationCount(getPendingEvaluationCount(attemptId));
      } else if (
        saveResult.data?.evaluationStatus === "evaluated" &&
        evaluationStatus === "pending"
      ) {
        // Evaluation completed during sync, update local state
        const serverData = saveResult.data;
        newResponse.isCorrect = serverData.isCorrect;
        newResponse.score = serverData.score;
        newResponse.evaluationStatus = serverData.evaluationStatus;
        isCorrect = serverData.isCorrect;
        score = serverData.score;
        evaluationStatus = serverData.evaluationStatus;
        isPendingEvaluation = false;

        // Update responses map with evaluated result
        const updatedMap = new Map(newResponsesMap);
        updatedMap.set(currentQuestion.id, newResponse);
        setResponses(updatedMap);
      }

      if (mode === "test") {
        if (isLastQuestion) {
          // Store scores in session storage for results page
          if (typeof window !== "undefined") {
            const scoresData = Array.from(newResponsesMap.values()).map(
              (r) => ({
                questionId: r.questionId,
                score: r.score,
                answer: r.answer,
              })
            );
            sessionStorage.setItem(
              `quiz-scores-${attemptId}`,
              JSON.stringify(scoresData)
            );
          }
          await performFinalSubmission(Array.from(newResponsesMap.values()));
          // Do not set submitting to false, we are redirecting
          return;
        } else {
          setCurrentIndex((prev) => prev + 1);
          setSubmitted(false);
        }
      } else {
        // Learn mode
        setFeedback({
          isCorrect: isCorrect,
          correctAnswer: currentQuestion.correctAnswer || "See explanation",
          explanation: explanation || "No explanation provided.",
          score: score,
          isPending: isPendingEvaluation,
        });
        setSubmitted(true);
        if (isCorrect === true) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    toast.warning("Time is up!");
    // Submit whatever we have
    performFinalSubmission(Array.from(responses.values()));
  };

  // NEW: Handle overriding an answer to mark it as correct
  const handleOverrideAnswer = async () => {
    if (!currentQuestion || isOverriding) return;

    const confirmOverride = confirm(
      "Are you sure you want to mark this answer as correct? This will override the current evaluation."
    );

    if (!confirmOverride) return;

    setIsOverriding(true);

    try {
      const res = await fetch(`/api/quizzes/${quizId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId: currentQuestion.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to override answer");
      }

      // Update local state
      const updatedResponse: Response = {
        questionId: currentQuestion.id,
        answer: selectedAnswer,
        isCorrect: true,
        score: 100,
        timeSpent: responses.get(currentQuestion.id)?.timeSpent || 0,
        evaluationStatus: "evaluated",
      };

      setResponses((prev) => {
        const newMap = new Map(prev);
        newMap.set(currentQuestion.id, updatedResponse);
        return newMap;
      });

      // Update mastery progress if in retry round
      if (isRetryRound) {
        const currentProgress = masteryProgress.get(currentQuestion.id) || {
          consecutiveCorrect: 0,
          totalAttempts: 0,
        };

        const updatedProgress: MasteryProgress = {
          totalAttempts: currentProgress.totalAttempts,
          consecutiveCorrect: currentProgress.consecutiveCorrect + 1,
        };

        setMasteryProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(currentQuestion.id, updatedProgress);
          return newMap;
        });

        // Also update firstAttemptResponses to reflect the override
        setFirstAttemptResponses((prev) => {
          const newMap = new Map(prev);
          const firstAttempt = newMap.get(currentQuestion.id);
          if (firstAttempt) {
            newMap.set(currentQuestion.id, {
              ...firstAttempt,
              isCorrect: true,
              score: 100,
            });
          }
          return newMap;
        });

        // Show mastery feedback
        if (updatedProgress.consecutiveCorrect === 1) {
          toast.success(
            "Marked correct! One more time to master this question.",
            { duration: 3000 }
          );
        } else if (updatedProgress.consecutiveCorrect >= 2) {
          toast.success(
            "🎉 Mastered! This question is now marked as mastered!",
            { duration: 4000 }
          );
        }
      } else {
        toast.success("Answer marked as correct!");
      }

      // Update feedback to show it's now correct
      setFeedback({
        isCorrect: true,
        correctAnswer: currentQuestion.correctAnswer || "See explanation",
        explanation: currentQuestion.explanation || "No explanation provided.",
        score: 100,
        isPending: false,
      });

      // Show confetti for the override
      confetti({
        particleCount:
          isRetryRound &&
          (masteryProgress.get(currentQuestion.id)?.consecutiveCorrect || 0) >=
            1
            ? 150
            : 100,
        spread:
          isRetryRound &&
          (masteryProgress.get(currentQuestion.id)?.consecutiveCorrect || 0) >=
            1
            ? 100
            : 70,
        origin: { y: 0.6 },
      });
    } catch (error: any) {
      console.error("Override error:", error);
      toast.error(error.message || "Failed to override answer");
    } finally {
      setIsOverriding(false);
    }
  };

  // NEW: Handle navigation in test mode with auto-save
  const handleNavigateToQuestion = async (newIndex: number) => {
    if (newIndex === currentIndex) return;

    // In test mode, auto-save the current answer before navigating
    if (mode === "test" && selectedAnswer !== null) {
      await autoSaveCurrentAnswer();
    }

    setCurrentIndex(newIndex);
  };

  // NEW: Auto-save answer without evaluation (for test mode navigation)
  const autoSaveCurrentAnswer = async () => {
    if (
      !selectedAnswer &&
      currentQuestion.type !== "matching" &&
      currentQuestion.type !== "ordering"
    ) {
      return; // No answer to save
    }

    // Check if answer has changed
    if (
      JSON.stringify(selectedAnswer) ===
      JSON.stringify(previousAnswerRef.current)
    ) {
      return; // No changes, skip save
    }

    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    let isCorrect: boolean | null = false;
    let score: number | null = 0;
    let evaluationStatus: "pending" | "evaluated" | "failed" = "evaluated";

    // Check if this is a written answer that needs AI evaluation
    if (
      currentQuestion.type === "short_answer" ||
      currentQuestion.type === "fill_blank"
    ) {
      // 1. Try strict match first
      const strictMatch =
        String(selectedAnswer).trim().toLowerCase() ===
        String(currentQuestion.correctAnswer).trim().toLowerCase();

      if (strictMatch) {
        isCorrect = true;
        score = 100;
        evaluationStatus = "evaluated";
      } else {
        // 2. Mark as pending for background AI evaluation
        isCorrect = null;
        score = null;
        evaluationStatus = "pending";
      }
    } else {
      // Simple questions can be evaluated client-side immediately
      isCorrect = checkAnswer(currentQuestion, selectedAnswer);
      score = isCorrect ? 100 : 0;
      evaluationStatus = "evaluated";
    }

    const newResponse: Response = {
      questionId: currentQuestion.id,
      answer: selectedAnswer,
      isCorrect: isCorrect,
      score: score,
      timeSpent,
      evaluationStatus,
    };

    // Update state
    const newResponsesMap = new Map(responses);
    newResponsesMap.set(currentQuestion.id, newResponse);
    setResponses(newResponsesMap);

    // Save to server (local-first with background sync)
    const quizResponse: QuizResponse = {
      attemptId,
      questionId: currentQuestion.id,
      answer: selectedAnswer,
      isCorrect: isCorrect,
      score: score,
      timeSpent,
      timestamp: Date.now(),
      evaluationStatus,
    };

    const saveResult = await saveResponse(quizId, quizResponse);

    if (!saveResult.savedToServer) {
      if (!navigator.onLine) {
        if (evaluationStatus === "pending") {
          toast.info("Answer saved offline. Will be evaluated when online.", {
            duration: 2000,
          });
        } else {
          toast.info("Answer saved offline", { duration: 2000 });
        }
      }
      setPendingSaveCount(getPendingSaveCount(attemptId));
      setPendingEvaluationCount(getPendingEvaluationCount(attemptId));
    } else if (
      saveResult.data?.evaluationStatus === "evaluated" &&
      evaluationStatus === "pending"
    ) {
      // Evaluation completed during sync, update local state
      const serverData = saveResult.data;
      newResponse.isCorrect = serverData.isCorrect;
      newResponse.score = serverData.score;
      newResponse.evaluationStatus = serverData.evaluationStatus;

      // Update responses map with evaluated result
      const updatedMap = new Map(newResponsesMap);
      updatedMap.set(currentQuestion.id, newResponse);
      setResponses(updatedMap);
    } else if (evaluationStatus === "pending") {
      // Answer saved but evaluation is pending
      setPendingEvaluationCount(getPendingEvaluationCount(attemptId));
    }

    // Update previous answer ref
    previousAnswerRef.current = selectedAnswer;
  };

  // NEW: Handle showing review overview
  const handleShowReview = async () => {
    // Auto-save current answer if any
    if (mode === "test" && selectedAnswer !== null) {
      await autoSaveCurrentAnswer();
    }
    setShowReviewOverview(true);
  };

  // NEW: Handle going back from review to quiz
  const handleBackToQuiz = () => {
    setShowReviewOverview(false);
  };

  // NEW: Handle submit from review overview
  const handleSubmitFromReview = async () => {
    await performFinalSubmission(Array.from(responses.values()));
  };

  // Calculate answered question IDs for navigator
  const answeredQuestionIds = new Set(
    Array.from(responses.keys()).filter(
      (qId) => responses.get(qId)?.answer !== null
    )
  );

  // Calculate pending evaluation question IDs
  const pendingEvaluationQuestionIds = new Set(
    Array.from(responses.keys()).filter(
      (qId) => responses.get(qId)?.evaluationStatus === "pending"
    )
  );

  // If showing review overview, render that instead
  if (showReviewOverview) {
    return (
      <ReviewOverview
        questions={questions}
        answeredQuestionIds={answeredQuestionIds}
        pendingEvaluationQuestionIds={pendingEvaluationQuestionIds}
        onNavigateToQuestion={(index) => {
          setCurrentIndex(index);
          setShowReviewOverview(false);
        }}
        onSubmitQuiz={handleSubmitFromReview}
        onGoBack={handleBackToQuiz}
        isSubmitting={isSubmitting}
      />
    );
  }

  return (
    <div
      className={mode === "test" ? "flex gap-6" : "max-w-3xl mx-auto space-y-6"}
    >
      {/* Question Navigator Sidebar (Test mode only) */}
      {mode === "test" && (
        <aside className="w-64 flex-shrink-0">
          <QuestionNavigator
            questions={questions}
            currentIndex={currentIndex}
            answeredQuestionIds={answeredQuestionIds}
            onNavigate={handleNavigateToQuestion}
          />
        </aside>
      )}

      {/* Main Quiz Content */}
      <div className="flex-1 space-y-6 max-w-3xl">
        {/* Online/Offline Status Indicator */}
        {(!isOnline || pendingSaveCount > 0 || pendingEvaluationCount > 0) && (
          <Card
            className={`p-3 ${
              !isOnline
                ? "bg-orange-500/10 border-orange-500"
                : "bg-blue-500/10 border-blue-500"
            }`}
          >
            <div className="flex items-center gap-2 text-sm">
              {!isOnline ? (
                <>
                  <WifiOff className="w-4 h-4 text-orange-500" />
                  <span className="text-orange-500 font-medium">Offline</span>
                  <span className="text-muted-foreground">
                    - Answers saved locally
                    {pendingEvaluationCount > 0 &&
                      ` (${pendingEvaluationCount} pending evaluation)`}
                  </span>
                </>
              ) : pendingSaveCount > 0 ? (
                <>
                  <Wifi className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-500 font-medium">Syncing...</span>
                  <span className="text-muted-foreground">
                    {pendingSaveCount} answer{pendingSaveCount > 1 ? "s" : ""}{" "}
                    pending
                    {pendingEvaluationCount > 0 &&
                      ` (${pendingEvaluationCount} awaiting evaluation)`}
                  </span>
                </>
              ) : pendingEvaluationCount > 0 ? (
                <>
                  <Wifi className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-500 font-medium">
                    Evaluating...
                  </span>
                  <span className="text-muted-foreground">
                    {pendingEvaluationCount} answer
                    {pendingEvaluationCount > 1 ? "s" : ""} pending evaluation
                  </span>
                </>
              ) : null}
            </div>
          </Card>
        )}

        {/* Retry Round Banner */}
        {isRetryRound && (
          <Card className="p-4 bg-purple-500/10 border-purple-500">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-500 hover:bg-purple-600">
                    Retry Round
                  </Badge>
                  <span className="text-sm font-medium">
                    Master these questions
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Answer correctly twice in a row
                </span>
              </div>

              {/* Mastery Progress */}
              <div className="space-y-2">
                {retryQuestions.map((q) => {
                  const progress = masteryProgress.get(q.id);
                  const masteryLevel = progress?.consecutiveCorrect || 0;
                  const isMastered = masteryLevel >= 2;

                  return (
                    <div key={q.id} className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <div className="h-2 flex-1 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isMastered ? "bg-green-500" : "bg-purple-500"
                            }`}
                            style={{ width: `${(masteryLevel / 2) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground min-w-[3rem]">
                          {isMastered ? "✓ Mastered" : `${masteryLevel}/2`}
                        </span>
                      </div>
                      {currentQuestion.id === q.id && (
                        <Badge variant="outline" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {isRetryRound ? (
                <>
                  Retry Question {retryQuestionIndex + 1} of{" "}
                  {retryQuestions.length}
                  {masteryProgress.get(currentQuestion.id) && (
                    <span className="ml-2">
                      (Attempt #
                      {(masteryProgress.get(currentQuestion.id)
                        ?.totalAttempts || 0) + 1}
                      )
                    </span>
                  )}
                </>
              ) : (
                <>
                  Question {currentIndex + 1} of {questions.length}
                </>
              )}
            </p>
            <Badge variant="outline" className="mt-1">
              {currentQuestion.topic}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {mode !== "test" && (
              <div className="text-sm">
                <span className="text-green-500 font-medium">
                  {correctCount}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  / {responses.size}
                </span>
              </div>
            )}
            {timeLimit && (
              <Timer totalSeconds={timeLimit} onTimeUp={handleTimeUp} />
            )}
          </div>
        </div>

        {/* Progress */}
        {mode === "test" ? (
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-500 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : (
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
            <div
              className="bg-green-500 h-full transition-all duration-500 ease-in-out"
              style={{
                width: `${
                  (Array.from(responses.values()).filter((r) => r.isCorrect)
                    .length /
                    questions.length) *
                  100
                }%`,
              }}
            />
            <div
              className="bg-red-500 h-full transition-all duration-500 ease-in-out"
              style={{
                width: `${
                  (Array.from(responses.values()).filter((r) => !r.isCorrect)
                    .length /
                    questions.length) *
                  100
                }%`,
              }}
            />
          </div>
        )}

        {/* Question */}
        <QuestionCard
          question={currentQuestion}
          selectedAnswer={selectedAnswer}
          onSelectAnswer={setSelectedAnswer}
          disabled={submitted || isSubmitting}
          showHint={mode === "learn"}
          showFeedback={submitted}
          optionSeed={optionSeeds[currentQuestion.id]}
        />

        {/* Feedback (Learn/Revision modes) */}
        {feedback && (
          <Card
            className={`p-4 ${
              feedback.isPending
                ? "bg-blue-500/10 border-blue-500"
                : feedback.isCorrect
                ? "bg-green-500/10 border-green-500"
                : "bg-red-500/10 border-red-500"
            }`}
          >
            <div className="flex items-start gap-3">
              {feedback.isPending ? (
                <Wifi className="w-5 h-5 text-blue-500 mt-0.5 animate-pulse" />
              ) : feedback.isCorrect ? (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">
                  {feedback.isPending
                    ? "Answer Submitted - Evaluation Pending"
                    : feedback.isCorrect
                    ? "Correct!"
                    : "Incorrect"}
                </p>
                {feedback.score !== null &&
                  feedback.score !== undefined &&
                  !feedback.isPending &&
                  (currentQuestion.type === "short_answer" ||
                    currentQuestion.type === "fill_blank") && (
                    <p className="text-sm mt-1 text-muted-foreground">
                      (AI Confidence Score: {feedback.score}/100)
                    </p>
                  )}
                {!feedback.isCorrect && !feedback.isPending && (
                  <p className="text-sm mt-1">
                    The correct answer is:{" "}
                    <strong>{feedback.correctAnswer}</strong>
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {feedback.explanation}
                </p>

                {/* Override Button - Show only when answer is incorrect */}
                {!feedback.isCorrect && !feedback.isPending && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOverrideAnswer}
                    disabled={isOverriding}
                    className="mt-3 border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {isOverriding
                      ? "Overriding..."
                      : "Override: Mark Answer as Correct"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          {/* Test mode navigation buttons */}
          {mode === "test" && (
            <>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    handleNavigateToQuestion(Math.max(0, currentIndex - 1))
                  }
                  disabled={currentIndex === 0}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                {currentIndex < questions.length - 1 && (
                  <Button
                    variant="outline"
                    onClick={() => handleNavigateToQuestion(currentIndex + 1)}
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
              <Button
                onClick={handleShowReview}
                size="lg"
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Eye className="w-4 h-4 mr-2" />
                Review & Submit
              </Button>
            </>
          )}

          {/* Learn/Revision mode buttons */}
          {mode !== "test" && (
            <div className="flex justify-end w-full">
              {!submitted ? (
                <Button
                  onClick={handleAnswerWrapper}
                  disabled={
                    (!selectedAnswer &&
                      currentQuestion.type !== "matching" &&
                      currentQuestion.type !== "ordering") ||
                    isSubmitting
                  }
                >
                  {isSubmitting
                    ? currentQuestion.type === "fill_blank" ||
                      currentQuestion.type === "short_answer"
                      ? "Evaluating answer..."
                      : "Submitting..."
                    : "Submit Answer"}
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={isSubmitting}>
                  {isSubmitting
                    ? "Submitting..."
                    : isLastQuestion
                    ? "View Results"
                    : "Next Question"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
