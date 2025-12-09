"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, Repeat, Timer, Sparkles, Sliders, PenLine, CheckSquare } from 'lucide-react';
import { QuizMode, QuestionType } from "@/types/quiz";

interface QuizBuilderProps {
  documentId: string;
  documentTitle: string;
}

export function QuizBuilder({ documentId, documentTitle }: QuizBuilderProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("Reading Document");
  const [mode, setMode] = useState<QuizMode>('learn');
  const [difficulty, setDifficulty] = useState<'easy'|'medium'|'hard'|'mixed'>('mixed');
  const [title, setTitle] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(['multiple_choice', 'true_false', 'fill_blank', 'matching', 'ordering', 'short_answer']);

  // Update default title when mode changes
  useEffect(() => {
    setTitle(`${mode.charAt(0).toUpperCase() + mode.slice(1)} Quiz: ${documentTitle}`);
  }, [mode, documentTitle]);

  const modes = [
    {
      id: 'learn',
      title: 'Learn Mode',
      desc: 'Build foundational knowledge with hints and detailed explanations.',
      icon: BookOpen,
      color: 'bg-blue-100 text-blue-600',
      border: 'border-blue-200'
    },
    {
      id: 'revision',
      title: 'Revision Mode',
      desc: 'Active recall practice. Fast-paced, no hints, immediate feedback.',
      icon: Repeat,
      color: 'bg-purple-100 text-purple-600',
      border: 'border-purple-200'
    },
    {
      id: 'test',
      title: 'Test Mode',
      desc: 'Simulate exam conditions. Timer enabled, no feedback until the end.',
      icon: Timer,
      color: 'bg-orange-100 text-orange-600',
      border: 'border-orange-200'
    }
  ] as const;

  const toggleType = (type: QuestionType) => {
    setSelectedTypes(prev => {
        if (prev.includes(type) && prev.length > 1) {
            return prev.filter(t => t !== type);
        } else if (!prev.includes(type)) {
            return [...prev, type];
        }
        return prev;
    });
  };

  const handleStart = async () => {
    setIsLoading(true);
    setLoadingStep("Reading Document");

    // Simulate progress updates
    const t1 = setTimeout(() => setLoadingStep("Generating Questions"), 2000);
    const t2 = setTimeout(() => setLoadingStep("System Initialization"), 4500);

    try {
      const res = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          title: title || "New Quiz",
          mode,
          settings: {
            questionTypes: selectedTypes,
            difficulty,
            timeLimitPerQuestion: mode === 'test' ? 60 : undefined,
          },
        }),
      });

      const data = await res.json();
      
      // Clear timers
      clearTimeout(t1);
      clearTimeout(t2);

      if (!res.ok) throw new Error(data.error);

      setLoadingStep("DONE!");
      toast.success("Quiz generated successfully!");

      // Delay before redirect to show DONE state
      setTimeout(() => {
        router.push(`/quizzes/${data.quiz.id}`);
      }, 1000);
    } catch (error: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      toast.error(error.message || "Failed to generate quiz");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Configure Your Quiz</h2>
        <p className="text-slate-500">Based on <span className="font-semibold text-slate-700">{documentTitle}</span></p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {modes.map((m) => {
          const Icon = m.icon;
          const isSelected = mode === m.id;
          return (
            <div
              key={m.id}
              onClick={() => setMode(m.id as QuizMode)}
              className={`relative cursor-pointer rounded-2xl p-6 border-2 transition-all duration-200 ${
                isSelected 
                  ? `border-blue-500 bg-blue-50 ring-4 ring-blue-500/10` 
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl ${m.color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 mb-2">{m.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{m.desc}</p>
              {isSelected && (
                <div className="absolute top-4 right-4 w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6 text-slate-800 font-semibold">
          <Sliders className="w-5 h-5 text-slate-400" />
          Settings
        </div>
        
        <div className="space-y-8">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quiz Title
                </label>
                <div className="relative">
                    <PenLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="Enter quiz title..."
                    />
                </div>
            </div>

            <div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                    Difficulty Level
                    </label>
                    <div className="flex gap-2">
                    {['easy', 'mixed', 'hard'].map((d) => (
                        <button
                        key={d}
                        onClick={() => setDifficulty(d as any)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors ${
                            difficulty === d
                            ? 'bg-slate-800 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        >
                        {d}
                        </button>
                    ))}
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                    Include Question Types
                </label>
                <div className="flex flex-wrap gap-3">
                    {[
                        { id: 'multiple_choice', label: 'Multiple Choice' },
                        { id: 'true_false', label: 'True/False' },
                        { id: 'fill_blank', label: 'Fill in Blank' },
                        { id: 'short_answer', label: 'Short Answer' },
                        { id: 'matching', label: 'Matching' },
                        { id: 'ordering', label: 'Ordering' }
                    ].map((type) => {
                        const isChecked = selectedTypes.includes(type.id as QuestionType);
                        return (
                            <button
                                key={type.id}
                                onClick={() => toggleType(type.id as QuestionType)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                                    isChecked 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {isChecked && <CheckSquare className="w-4 h-4" />}
                                {type.label}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={handleStart}
          disabled={isLoading}
          className="group relative px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 transition-all disabled:opacity-70 disabled:hover:scale-100"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 animate-spin" />
              {loadingStep}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Start Generation
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}