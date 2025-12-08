import { create } from 'zustand';
import { Question } from '@/types/quiz';

interface QuizState {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string>; // questionId -> answer
  setQuestions: (questions: Question[]) => void;
  setAnswer: (questionId: string, answer: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  reset: () => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  questions: [],
  currentQuestionIndex: 0,
  answers: {},
  setQuestions: (questions) => set({ questions }),
  setAnswer: (questionId, answer) => 
    set((state) => ({ 
      answers: { ...state.answers, [questionId]: answer } 
    })),
  nextQuestion: () => 
    set((state) => ({ 
      currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, state.questions.length - 1) 
    })),
  prevQuestion: () => 
    set((state) => ({ 
      currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0) 
    })),
  reset: () => set({ questions: [], currentQuestionIndex: 0, answers: {} }),
}));
