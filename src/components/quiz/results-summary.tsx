"use client"

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, X, Clock, Target, RotateCcw, LayoutDashboard, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

interface QuizResultProps {
  quiz: {
    id: string;
    title: string;
    mode: 'learn' | 'revision' | 'test';
    questions: {
      id: string;
      questionText: string;
      correctAnswer: string;
      explanation: string;
      options?: string[];
      type?: string;
    }[];
  };
  attempt: {
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    timeSpent: number;
    answers: Record<string, {
      userAnswer: string;
      isCorrect: boolean;
      score?: number;
      attemptNumber?: number;
      totalAttempts?: number;
      hasRetries?: boolean;
      firstAttemptCorrect?: boolean;
      allAttempts?: any[];
    }>;
  };
}

export function ResultsSummary({ quiz, attempt }: QuizResultProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [overridingQuestions, setOverridingQuestions] = useState<Set<string>>(new Set());
  const [localAttempt, setLocalAttempt] = useState(attempt);

  // Retrieve and merge confidence scores from sessionStorage
  useEffect(() => {
    const attemptId = searchParams.get('attempt');
    if (attemptId && typeof window !== 'undefined') {
      const scoresJson = sessionStorage.getItem(`quiz-scores-${attemptId}`);
      if (scoresJson) {
        try {
          const scores = JSON.parse(scoresJson);
          // Merge scores into localAttempt.answers
          setLocalAttempt(prev => {
            const newAnswers = { ...prev.answers };
            scores.forEach((item: any) => {
              if (newAnswers[item.questionId]) {
                newAnswers[item.questionId] = {
                  ...newAnswers[item.questionId],
                  score: item.score
                };
              }
            });
            return {
              ...prev,
              answers: newAnswers
            };
          });
          // Clean up sessionStorage
          sessionStorage.removeItem(`quiz-scores-${attemptId}`);
        } catch (error) {
          console.error('Failed to parse session scores:', error);
        }
      }
    }
  }, [searchParams]);

  const toggleExpand = (id: string) => {
    setExpandedQuestion(expandedQuestion === id ? null : id);
  };

  const percentage = Math.round(localAttempt.score);
  const data = [
    { name: 'Correct', value: localAttempt.correctAnswers, color: '#22c55e' },
    { name: 'Incorrect', value: localAttempt.totalQuestions - localAttempt.correctAnswers, color: '#f87171' },
  ];

  // Handle empty data case for chart to avoid errors
  if (localAttempt.totalQuestions === 0) {
    data[1].value = 1; // dummy value
  }

  // Calculate retry statistics
  const questionsWithRetries = Object.values(localAttempt.answers).filter(a => a.hasRetries).length;
  const questionsImprovedInRetry = Object.values(localAttempt.answers).filter(
    a => a.hasRetries && !a.firstAttemptCorrect && a.isCorrect
  ).length;

  const onRetry = () => {
    router.push(`/quizzes/${quiz.id}`);
  };

  const onDashboard = () => {
    router.push('/dashboard');
  };

  const handleOverrideAnswer = async (questionId: string) => {
    const attemptId = searchParams.get('attempt');
    if (!attemptId || overridingQuestions.has(questionId)) return;

    const confirmOverride = confirm(
      "Are you sure you want to mark this answer as correct? This will override the current evaluation and update your score."
    );

    if (!confirmOverride) return;

    // Add to overriding set
    setOverridingQuestions(prev => new Set(prev).add(questionId));

    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to override answer");
      }

      // Update local state to reflect the change
      setLocalAttempt(prev => {
        const newAnswers = { ...prev.answers };
        if (newAnswers[questionId]) {
          newAnswers[questionId] = {
            ...newAnswers[questionId],
            isCorrect: true,
            score: 100,
          };
        }

        // Recalculate correct answers count
        const newCorrectCount = Object.values(newAnswers).filter(a => a.isCorrect).length;

        return {
          ...prev,
          answers: newAnswers,
          correctAnswers: newCorrectCount,
          score: Math.round((newCorrectCount / prev.totalQuestions) * 100),
        };
      });

      toast.success("Answer marked as correct! Your score has been updated.");

      // Show confetti for the override
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

    } catch (error: any) {
      console.error("Override error:", error);
      toast.error(error.message || "Failed to override answer");
    } finally {
      // Remove from overriding set
      setOverridingQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-bold text-slate-900 mb-2">Quiz Complete!</h2>
        <p className="text-slate-500">Here's how you performed on <span className="font-semibold">{quiz.title}</span></p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <div className="w-40 h-40 relative">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={data}
                    innerRadius={60}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    </Pie>
                </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-slate-800">{percentage}%</span>
                    <span className="text-xs text-slate-400 font-medium uppercase">Score</span>
                </div>
            </div>
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                    <Clock className="w-8 h-8" />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Time Taken</p>
                    <h3 className="text-2xl font-bold text-slate-800">
                        {Math.floor(localAttempt.timeSpent / 60)}m {Math.round(localAttempt.timeSpent % 60)}s
                    </h3>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-green-50 text-green-600 rounded-xl">
                    <Target className="w-8 h-8" />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Accuracy</p>
                    <h3 className="text-2xl font-bold text-slate-800">
                        {localAttempt.correctAnswers} / {localAttempt.totalQuestions}
                    </h3>
                </div>
            </div>

            {/* Retry Statistics Card - Only show for learn mode */}
            {quiz.mode === 'learn' && questionsWithRetries > 0 && (
              <div className="col-span-2 bg-purple-50 p-6 rounded-2xl border border-purple-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium mb-1">Retry Round Stats</p>
                    <p className="text-xs text-purple-500">
                      {questionsWithRetries} question{questionsWithRetries > 1 ? 's' : ''} practiced in retry round
                    </p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-3xl font-bold text-purple-600">
                      {questionsImprovedInRetry}
                    </h3>
                    <p className="text-xs text-purple-500">mastered</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="col-span-2 flex gap-4 mt-2">
                <button 
                    onClick={onRetry}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                >
                    <RotateCcw className="w-5 h-5" />
                    Retry Quiz
                </button>
                <button 
                    onClick={onDashboard}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                >
                    <LayoutDashboard className="w-5 h-5" />
                    Dashboard
                </button>
            </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-800">Detailed Review</h3>
        {quiz.questions.map((q, idx) => {
            const answer = localAttempt.answers[q.id];
            const isCorrect = answer?.isCorrect;
            const isExpanded = expandedQuestion === q.id;
            const isOverriding = overridingQuestions.has(q.id);

            return (
                <div key={q.id} className={`bg-white rounded-xl border transition-all ${isCorrect ? 'border-slate-200' : 'border-red-200'}`}>
                    <div 
                        onClick={() => toggleExpand(q.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-xl"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {isCorrect ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-slate-800">Question {idx + 1}</p>
                                  {/* Only show retry badges for learn mode */}
                                  {quiz.mode === 'learn' && answer?.hasRetries && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs font-medium rounded">
                                      {answer.firstAttemptCorrect ? 'Practice' : 'Mastered'}
                                    </span>
                                  )}
                                  {quiz.mode === 'learn' && answer?.totalAttempts && answer.totalAttempts > 1 && (
                                    <span className="text-xs text-slate-400">
                                      ({answer.totalAttempts} attempts)
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-500 truncate max-w-lg">{q.questionText.replace(/___/g, '...')}</p>
                            </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                    
                    {isExpanded && (
                        <div className="px-16 pb-6 pt-2 animate-in slide-in-from-top-2">
                            <div className="space-y-3">
                                <p className="text-lg text-slate-800 font-medium">{q.questionText}</p>
                                
                                <div className="grid md:grid-cols-2 gap-4 mt-4">
                                    <div className={`p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        <p className="text-xs font-bold uppercase tracking-wide mb-1 opacity-70">Your Answer</p>
                                        <p className="font-medium">{answer?.userAnswer || "Skipped"}</p>
                                    </div>
                                    <div className="p-3 rounded-lg border bg-slate-50 border-slate-200">
                                        <p className="text-xs font-bold uppercase tracking-wide mb-1 opacity-70">Correct Answer</p>
                                        <p className="font-medium">{q.correctAnswer}</p>
                                    </div>
                                </div>

                                {answer?.score !== undefined &&
                                 (q.type === 'short_answer' || q.type === 'fill_blank') && (
                                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <p className="text-sm text-slate-600">
                                      (AI Confidence Score: <strong>{answer.score}/100</strong>)
                                    </p>
                                  </div>
                                )}

                                <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm leading-relaxed">
                                    <span className="font-bold block mb-1">Explanation:</span>
                                    {q.explanation}
                                </div>

                                {/* Override Button - Show only when answer is incorrect */}
                                {!isCorrect && (
                                  <div className="mt-4">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOverrideAnswer(q.id)}
                                      disabled={isOverriding}
                                      className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                    >
                                      <AlertCircle className="w-4 h-4 mr-2" />
                                      {isOverriding ? "Overriding..." : "Override: Mark Answer as Correct"}
                                    </Button>
                                  </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
}
