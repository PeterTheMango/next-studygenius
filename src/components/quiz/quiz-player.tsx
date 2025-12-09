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
import { CheckCircle, XCircle, ArrowRight, WifiOff, Wifi, ArrowLeft, Eye } from "lucide-react";
import confetti from "canvas-confetti";
import {
  saveResponse,
  setupSyncListeners,
  hasPendingSaves,
  getPendingSaveCount,
  clearLocalResponses,
  hasPendingEvaluations,
  getPendingEvaluationCount,
  type QuizResponse
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
  evaluationStatus: 'pending' | 'evaluated' | 'failed';
}

interface Response {
  questionId: string;
  answer: any;
  isCorrect: boolean | null;
  score?: number | null;
  timeSpent: number;
  evaluationStatus: 'pending' | 'evaluated' | 'failed';
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
          answer: typeof value.answer === 'string' && (value.answer.startsWith('{') || value.answer.startsWith('['))
            ? JSON.parse(value.answer)
            : value.answer,
          isCorrect: value.isCorrect,
          score: value.score ?? undefined,
          timeSpent: value.timeSpent,
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

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress =
    ((currentIndex + (submitted ? 1 : 0)) / questions.length) * 100;
  
  const correctCount = Array.from(responses.values()).filter(r => r.isCorrect).length;

  useEffect(() => {
    setQuestionStartTime(Date.now());

    // In test mode, load previous answer if it exists
    if (mode === 'test') {
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
  }, [currentIndex, mode, responses, currentQuestion.id]);

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
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Setup sync listeners for auto-retry
    const cleanupSync = setupSyncListeners();

    // Periodic check for pending saves and evaluations
    const intervalId = setInterval(() => {
      setPendingSaveCount(getPendingSaveCount(attemptId));
      setPendingEvaluationCount(getPendingEvaluationCount(attemptId));
    }, 5000); // Every 5 seconds

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      cleanupSync();
      clearInterval(intervalId);
    };
  }, [attemptId]);

  const checkAnswer = (question: Question, answer: any): boolean => {
    if (question.type === 'matching' && question.matchingPairs) {
        if (!Array.isArray(answer)) return false;
        // Check if every pair in the question matches the user's answer
        return question.matchingPairs.every(pair => {
            const userMatch = answer.find((a: any) => a.left === pair.left);
            return userMatch && userMatch.right === pair.right;
        });
    }

    if (question.type === 'ordering' && question.orderingItems) {
        if (!Array.isArray(answer)) return false;
        return JSON.stringify(answer) === JSON.stringify(question.orderingItems);
    }

    if (question.type === 'fill_blank' || question.type === 'short_answer') {
        return String(answer).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase();
    }

    // Multiple choice / True False
    return String(answer).toLowerCase() === String(question.correctAnswer).toLowerCase();
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer && currentQuestion.type !== 'matching' && currentQuestion.type !== 'ordering') {
      toast.error("Please select an answer");
      return;
    }

    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    const isCorrect = checkAnswer(currentQuestion, selectedAnswer);

    // Store response locally
    setResponses(prev => {
        const newMap = new Map(prev);
        newMap.set(currentQuestion.id, {
            questionId: currentQuestion.id,
            answer: selectedAnswer,
            isCorrect,
            timeSpent
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
          origin: { y: 0.6 }
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
      } catch(e) { /*...*/ }
  };
  
  // Revised submit function that takes responses as argument
  const performFinalSubmission = async (finalResponses: Response[]) => {
      setIsSubmitting(true);
      try {
        // Check if there are pending saves before final submission
        if (hasPendingSaves(attemptId)) {
          toast.warning("Some answers are still syncing. Please wait...");
          // Wait a moment and retry
          await new Promise(resolve => setTimeout(resolve, 2000));

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

  const handleNext = () => {
    if (isLastQuestion) {
      // Store scores in session storage for results page
      if (typeof window !== 'undefined') {
        const scoresData = Array.from(responses.values()).map(r => ({
          questionId: r.questionId,
          score: r.score,
          answer: r.answer
        }));
        sessionStorage.setItem(
          `quiz-scores-${attemptId}`,
          JSON.stringify(scoresData)
        );
      }
      // Convert map to array and submit
      const allResponses = Array.from(responses.values());
      performFinalSubmission(allResponses);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSubmitted(false);
      setFeedback(null);
    }
  };
  
  // Overwriting handleSubmitAnswer to correctly handle state closure
  const handleAnswerWrapper = async () => {
      if (!selectedAnswer && currentQuestion.type !== 'matching' && currentQuestion.type !== 'ordering') {
        toast.error("Please select an answer");
        return;
      }

      setIsSubmitting(true);

      const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
      let isCorrect: boolean | null = false;
      let score: number | null = 0;
      let explanation = currentQuestion.explanation;
      let evaluationStatus: 'pending' | 'evaluated' | 'failed' = 'evaluated';
      let isPendingEvaluation = false;

      try {
        if (currentQuestion.type === 'short_answer' || currentQuestion.type === 'fill_blank') {
            // 1. Optimistic strict check
            const strictMatch = String(selectedAnswer).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase();

            if (strictMatch) {
                isCorrect = true;
                score = 100;
                evaluationStatus = 'evaluated';
            } else {
                // 2. AI Evaluation (only if online)
                if (!navigator.onLine) {
                    // Mark as pending when offline
                    isCorrect = null;
                    score = null;
                    evaluationStatus = 'pending';
                    isPendingEvaluation = true;
                    explanation = "Your answer has been saved and will be evaluated when you're back online.";
                } else {
                    try {
                        const res = await fetch("/api/quizzes/evaluate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                questionText: currentQuestion.questionText,
                                modelAnswer: currentQuestion.correctAnswer,
                                userAnswer: selectedAnswer,
                                threshold: 70
                            })
                        });

                        if (!res.ok) throw new Error("Evaluation failed");

                        const data = await res.json();
                        isCorrect = data.isCorrect;
                        score = data.score;
                        evaluationStatus = 'evaluated';
                        if (data.explanation) {
                            explanation = data.explanation;
                        }
                    } catch (err) {
                        console.error("AI Eval error:", err);
                        // Mark as pending on evaluation failure
                        isCorrect = null;
                        score = null;
                        evaluationStatus = 'pending';
                        isPendingEvaluation = true;
                        explanation = "Answer saved. Evaluation will be retried automatically.";
                        toast.warning("Could not evaluate answer. Will retry automatically.");
                    }
                }
            }
        } else {
            // Simple questions can be evaluated client-side immediately
            isCorrect = checkAnswer(currentQuestion, selectedAnswer);
            score = isCorrect ? 100 : 0;
            evaluationStatus = 'evaluated';
        }

        const newResponse: Response = {
            questionId: currentQuestion.id,
            answer: selectedAnswer,
            isCorrect,
            score,
            timeSpent,
            evaluationStatus
        };

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
        };

        const saveResult = await saveResponse(quizId, quizResponse);

        if (!saveResult.savedToServer) {
          // Show subtle warning if save failed but continue
          if (!navigator.onLine) {
            if (isPendingEvaluation) {
              toast.info("Answer saved offline. Will be evaluated when online.");
            } else {
              toast.info("Offline - answer saved locally and will sync when online");
            }
          } else {
            toast.warning("Answer saved locally but failed to sync to server");
          }
          setPendingSaveCount(getPendingSaveCount(attemptId));
          setPendingEvaluationCount(getPendingEvaluationCount(attemptId));
        } else if (saveResult.data?.evaluationStatus === 'evaluated' && evaluationStatus === 'pending') {
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

        if (mode === 'test') {
            if (isLastQuestion) {
                // Store scores in session storage for results page
                if (typeof window !== 'undefined') {
                  const scoresData = Array.from(newResponsesMap.values()).map(r => ({
                    questionId: r.questionId,
                    score: r.score,
                    answer: r.answer
                  }));
                  sessionStorage.setItem(
                    `quiz-scores-${attemptId}`,
                    JSON.stringify(scoresData)
                  );
                }
                await performFinalSubmission(Array.from(newResponsesMap.values()));
                // Do not set submitting to false, we are redirecting
                return;
            } else {
                setCurrentIndex(prev => prev + 1);
                setSubmitted(false);
            }
        } else {
            // Learn mode
            setFeedback({
                isCorrect: isCorrect,
                correctAnswer: currentQuestion.correctAnswer || "See explanation",
                explanation: explanation || "No explanation provided.",
                score: score,
                isPending: isPendingEvaluation
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

  // NEW: Handle navigation in test mode with auto-save
  const handleNavigateToQuestion = async (newIndex: number) => {
    if (newIndex === currentIndex) return;

    // In test mode, auto-save the current answer before navigating
    if (mode === 'test' && selectedAnswer !== null) {
      await autoSaveCurrentAnswer();
    }

    setCurrentIndex(newIndex);
  };

  // NEW: Auto-save answer without evaluation (for test mode navigation)
  const autoSaveCurrentAnswer = async () => {
    if (!selectedAnswer && currentQuestion.type !== 'matching' && currentQuestion.type !== 'ordering') {
      return; // No answer to save
    }

    // Check if answer has changed
    if (JSON.stringify(selectedAnswer) === JSON.stringify(previousAnswerRef.current)) {
      return; // No changes, skip save
    }

    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    // Save without evaluation (evaluation happens on final submission)
    const newResponse: Response = {
      questionId: currentQuestion.id,
      answer: selectedAnswer,
      isCorrect: false, // Placeholder, will be evaluated on submission
      score: 0, // Placeholder
      timeSpent,
      evaluationStatus: 'evaluated' // Placeholder for test mode
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
      isCorrect: false, // Placeholder
      score: 0, // Placeholder
      timeSpent,
      timestamp: Date.now(),
      evaluationStatus: 'evaluated', // Placeholder for test mode
    };

    const saveResult = await saveResponse(quizId, quizResponse);

    if (!saveResult.savedToServer) {
      if (!navigator.onLine) {
        toast.info("Answer saved offline", { duration: 2000 });
      }
      setPendingSaveCount(getPendingSaveCount(attemptId));
      setPendingEvaluationCount(getPendingEvaluationCount(attemptId));
    }

    // Update previous answer ref
    previousAnswerRef.current = selectedAnswer;
  };

  // NEW: Handle showing review overview
  const handleShowReview = async () => {
    // Auto-save current answer if any
    if (mode === 'test' && selectedAnswer !== null) {
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
    Array.from(responses.keys()).filter(qId => responses.get(qId)?.answer !== null)
  );

  // Calculate pending evaluation question IDs
  const pendingEvaluationQuestionIds = new Set(
    Array.from(responses.keys()).filter(qId => responses.get(qId)?.evaluationStatus === 'pending')
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
    <div className={mode === 'test' ? "flex gap-6" : "max-w-3xl mx-auto space-y-6"}>
      {/* Question Navigator Sidebar (Test mode only) */}
      {mode === 'test' && (
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
        <Card className={`p-3 ${!isOnline ? 'bg-orange-500/10 border-orange-500' : 'bg-blue-500/10 border-blue-500'}`}>
          <div className="flex items-center gap-2 text-sm">
            {!isOnline ? (
              <>
                <WifiOff className="w-4 h-4 text-orange-500" />
                <span className="text-orange-500 font-medium">Offline</span>
                <span className="text-muted-foreground">
                  - Answers saved locally
                  {pendingEvaluationCount > 0 && ` (${pendingEvaluationCount} pending evaluation)`}
                </span>
              </>
            ) : pendingSaveCount > 0 ? (
              <>
                <Wifi className="w-4 h-4 text-blue-500" />
                <span className="text-blue-500 font-medium">Syncing...</span>
                <span className="text-muted-foreground">
                  {pendingSaveCount} answer{pendingSaveCount > 1 ? 's' : ''} pending
                  {pendingEvaluationCount > 0 && ` (${pendingEvaluationCount} awaiting evaluation)`}
                </span>
              </>
            ) : pendingEvaluationCount > 0 ? (
              <>
                <Wifi className="w-4 h-4 text-blue-500" />
                <span className="text-blue-500 font-medium">Evaluating...</span>
                <span className="text-muted-foreground">
                  {pendingEvaluationCount} answer{pendingEvaluationCount > 1 ? 's' : ''} pending evaluation
                </span>
              </>
            ) : null}
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </p>
          <Badge variant="outline" className="mt-1">
            {currentQuestion.topic}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {mode !== "test" && (
            <div className="text-sm">
              <span className="text-green-500 font-medium">{correctCount}</span>
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
            style={{ width: `${(Array.from(responses.values()).filter(r => r.isCorrect).length / questions.length) * 100}%` }}
          />
          <div
            className="bg-red-500 h-full transition-all duration-500 ease-in-out"
            style={{ width: `${(Array.from(responses.values()).filter(r => !r.isCorrect).length / questions.length) * 100}%` }}
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
            <div>
              <p className="font-medium">
                {feedback.isPending
                  ? "Answer Submitted - Evaluation Pending"
                  : feedback.isCorrect
                  ? "Correct!"
                  : "Incorrect"}
              </p>
              {feedback.score !== null && feedback.score !== undefined &&
               !feedback.isPending &&
               (currentQuestion.type === 'short_answer' || currentQuestion.type === 'fill_blank') && (
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
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        {/* Test mode navigation buttons */}
        {mode === 'test' && (
          <>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleNavigateToQuestion(Math.max(0, currentIndex - 1))}
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
        {mode !== 'test' && (
          <div className="flex justify-end w-full">
            {!submitted ? (
              <Button onClick={handleAnswerWrapper} disabled={(!selectedAnswer && currentQuestion.type !== 'matching' && currentQuestion.type !== 'ordering') || isSubmitting}>
                {isSubmitting
                  ? ((currentQuestion.type === 'fill_blank' || currentQuestion.type === 'short_answer') ? "Evaluating answer..." : "Submitting...")
                  : "Submit Answer"}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : isLastQuestion ? "View Results" : "Next Question"}
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
