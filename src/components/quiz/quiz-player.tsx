"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Timer } from "./timer";
import { QuestionCard } from "./question-card";
import { toast } from "sonner";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";

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
}

interface Response {
  questionId: string;
  answer: any;
  isCorrect: boolean;
  score?: number;
  timeSpent: number;
}

export function QuizPlayer({
  quizId,
  attemptId,
  mode,
  questions,
  timeLimit,
}: QuizPlayerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  } | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  
  // Store all responses locally
  const [responses, setResponses] = useState<Map<string, Response>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress =
    ((currentIndex + (submitted ? 1 : 0)) / questions.length) * 100;
  
  const correctCount = Array.from(responses.values()).filter(r => r.isCorrect).length;

  useEffect(() => {
    setQuestionStartTime(Date.now());
    setSelectedAnswer(null); // Reset answer on new question
  }, [currentIndex]);

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
      let isCorrect = false;
      let score = 0;
      let explanation = currentQuestion.explanation;

      try {
        if (currentQuestion.type === 'short_answer' || currentQuestion.type === 'fill_blank') {
            // 1. Optimistic strict check
            const strictMatch = String(selectedAnswer).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase();
            
            if (strictMatch) {
                isCorrect = true;
                score = 100;
            } else {
                // 2. AI Evaluation
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
                    if (data.explanation) {
                        explanation = data.explanation;
                    }
                } catch (err) {
                    console.error("AI Eval error:", err);
                    // Fallback to strict check (which already failed if we are here, but just in case)
                    isCorrect = strictMatch;
                    score = strictMatch ? 100 : 0;
                    toast.warning("Could not verify answer with AI, used strict matching.");
                }
            }
        } else {
            isCorrect = checkAnswer(currentQuestion, selectedAnswer);
            score = isCorrect ? 100 : 0;
        }

        const newResponse: Response = {
            questionId: currentQuestion.id,
            answer: selectedAnswer,
            isCorrect,
            score,
            timeSpent
        };
        
        // Update state
        const newResponsesMap = new Map(responses);
        newResponsesMap.set(currentQuestion.id, newResponse);
        setResponses(newResponsesMap);
        
        if (mode === 'test') {
            if (isLastQuestion) {
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
            });
            setSubmitted(true);
            if (isCorrect) {
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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

      {/* Question */}
      <QuestionCard
        question={currentQuestion}
        selectedAnswer={selectedAnswer}
        onSelectAnswer={setSelectedAnswer}
        disabled={submitted || isSubmitting}
        showHint={mode === "learn"}
        showFeedback={submitted}
      />

      {/* Feedback (Learn/Revision modes) */}
      {feedback && (
        <Card
          className={`p-4 ${
            feedback.isCorrect
              ? "bg-green-500/10 border-green-500"
              : "bg-red-500/10 border-red-500"
          }`}
        >
          <div className="flex items-start gap-3">
            {feedback.isCorrect ? (
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                {feedback.isCorrect ? "Correct!" : "Incorrect"}
              </p>
              {!feedback.isCorrect && (
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
      <div className="flex justify-end">
        {!submitted ? (
          <Button onClick={handleAnswerWrapper} disabled={(!selectedAnswer && currentQuestion.type !== 'matching' && currentQuestion.type !== 'ordering') || isSubmitting}>
            {isSubmitting 
              ? ((currentQuestion.type === 'fill_blank' || currentQuestion.type === 'short_answer') ? "Evaluating answer..." : "Submitting...") 
              : isLastQuestion && mode === 'test' ? "Finish Quiz" : "Submit Answer"}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : isLastQuestion ? "View Results" : "Next Question"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
