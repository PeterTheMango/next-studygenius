
export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'matching' | 'ordering';
export type QuizMode = 'learn' | 'revision' | 'test';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  type: QuestionType;
  topic: string;
  difficulty: Difficulty;
  questionText: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  hint?: string;
  sourceReference?: string;
  timeEstimate: number;
  
  // New fields for advanced types
  matchingPairs?: { left: string; right: string }[];
  orderingItems?: string[];
}

export interface QuizSettings {
  questionCount: number;
  questionTypes: QuestionType[];
  difficulty: 'mixed' | Difficulty;
  timeLimit?: number; // in seconds
}

export interface Quiz {
  id: string;
  title: string;
  mode: QuizMode;
  questions: Question[];
  createdAt: string;
  fileName: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  mode: QuizMode;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // seconds
  completedAt: string;
  answers: Record<string, {
    userAnswer: string | any; // Changed to any to support objects/arrays for complex types
    isCorrect: boolean;
    feedback?: string; // For AI grading feedback
  }>;
  isArchived?: boolean;
}

export interface DocumentMeta {
  id: string;
  name: string;
  size: number;
  topics: string[];
  uploadedAt: string;
  base64Data: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}
