export type QuizMode = 'learn' | 'revision' | 'test';

export type QuestionType = 
  | 'multiple_choice' 
  | 'true_false' 
  | 'fill_blank' 
  | 'short_answer' 
  | 'matching' 
  | 'ordering';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuizSettings {
  questionCount: number;
  questionTypes: QuestionType[];
  difficulty: Difficulty | 'mixed';
  timeLimit?: number; // in seconds
  timeLimitPerQuestion?: number; // in seconds
}

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
  orderIndex: number;
  matchingPairs?: { left: string; right: string }[];
  orderingItems?: string[];
}