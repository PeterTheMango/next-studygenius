"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Clock, Target, RotateCcw, LayoutDashboard, ChevronDown, ChevronUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface QuizResultProps {
  quiz: {
    id: string;
    title: string;
    questions: {
      id: string;
      questionText: string;
      correctAnswer: string;
      explanation: string;
      options?: string[];
    }[];
  };
  attempt: {
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    timeSpent: number;
    answers: Record<string, { userAnswer: string; isCorrect: boolean }>;
  };
}

export function ResultsSummary({ quiz, attempt }: QuizResultProps) {
  const router = useRouter();
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedQuestion(expandedQuestion === id ? null : id);
  };

  const percentage = Math.round(attempt.score);
  const data = [
    { name: 'Correct', value: attempt.correctAnswers, color: '#22c55e' },
    { name: 'Incorrect', value: attempt.totalQuestions - attempt.correctAnswers, color: '#f87171' },
  ];

  // Handle empty data case for chart to avoid errors
  if (attempt.totalQuestions === 0) {
    data[1].value = 1; // dummy value
  }

  const onRetry = () => {
    router.push(`/quizzes/${quiz.id}`);
  };

  const onDashboard = () => {
    router.push('/dashboard');
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
                        {Math.floor(attempt.timeSpent / 60)}m {Math.round(attempt.timeSpent % 60)}s
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
                        {attempt.correctAnswers} / {attempt.totalQuestions}
                    </h3>
                </div>
            </div>
            
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
            const answer = attempt.answers[q.id];
            const isCorrect = answer?.isCorrect;
            const isExpanded = expandedQuestion === q.id;

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
                            <div>
                                <p className="font-medium text-slate-800">Question {idx + 1}</p>
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

                                <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm leading-relaxed">
                                    <span className="font-bold block mb-1">Explanation:</span>
                                    {q.explanation}
                                </div>
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
