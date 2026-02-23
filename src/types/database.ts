export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          subscription_tier: 'free' | 'plus' | 'pro' | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'plus' | 'pro' | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'plus' | 'pro' | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      courses: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          course_code: string
          color: string
          icon: string
          status: 'active' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          course_code: string
          color?: string
          icon?: string
          status?: 'active' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          course_code?: string
          color?: string
          icon?: string
          status?: 'active' | 'archived'
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_path: string
          file_size: number
          page_count: number | null
          status: 'pending' | 'processing' | 'ready' | 'failed' | null
          extracted_text: string | null
          topics: Json | null
          page_metadata: Json | null
          filtered_page_count: number | null
          original_page_count: number | null
          error_message: string | null
          course_id: string | null
          cleaned_data: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_path: string
          file_size: number
          page_count?: number | null
          status?: 'pending' | 'processing' | 'ready' | 'failed' | null
          extracted_text?: string | null
          topics?: Json | null
          page_metadata?: Json | null
          filtered_page_count?: number | null
          original_page_count?: number | null
          error_message?: string | null
          course_id?: string | null
          cleaned_data?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          page_count?: number | null
          status?: 'pending' | 'processing' | 'ready' | 'failed' | null
          extracted_text?: string | null
          topics?: Json | null
          page_metadata?: Json | null
          filtered_page_count?: number | null
          original_page_count?: number | null
          error_message?: string | null
          course_id?: string | null
          cleaned_data?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      quizzes: {
        Row: {
          id: string
          document_id: string
          user_id: string
          title: string
          description: string | null
          mode: 'learn' | 'revision' | 'test'
          settings: Json | null
          question_count: number | null
          status: 'queued' | 'generating' | 'cleaning' | 'structuring' | 'finalizing' | 'ready' | 'failed' | 'archived' | null
          generation_stage: string | null
          error_message: string | null
          error_stage: string | null
          retry_count: number
          generation_started_at: string | null
          generation_completed_at: string | null
          difficulty_distribution: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          document_id: string
          user_id: string
          title: string
          description?: string | null
          mode: 'learn' | 'revision' | 'test'
          settings?: Json | null
          question_count?: number | null
          status?: 'queued' | 'generating' | 'cleaning' | 'structuring' | 'finalizing' | 'ready' | 'failed' | 'archived' | null
          generation_stage?: string | null
          error_message?: string | null
          error_stage?: string | null
          retry_count?: number
          generation_started_at?: string | null
          generation_completed_at?: string | null
          difficulty_distribution?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          title?: string
          description?: string | null
          mode?: 'learn' | 'revision' | 'test'
          settings?: Json | null
          question_count?: number | null
          status?: 'queued' | 'generating' | 'cleaning' | 'structuring' | 'finalizing' | 'ready' | 'failed' | 'archived' | null
          generation_stage?: string | null
          error_message?: string | null
          error_stage?: string | null
          retry_count?: number
          generation_started_at?: string | null
          generation_completed_at?: string | null
          difficulty_distribution?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      questions: {
        Row: {
          id: string
          quiz_id: string
          type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'matching' | 'ordering'
          topic: string | null
          difficulty: 'easy' | 'medium' | 'hard' | null
          question_text: string
          options: Json | null
          correct_answer: string
          explanation: string | null
          hint: string | null
          source_reference: string | null
          time_estimate: number | null
          order_index: number
          created_at: string | null
        }
        Insert: {
          id?: string
          quiz_id: string
          type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'matching' | 'ordering'
          topic?: string | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          question_text: string
          options?: Json | null
          correct_answer: string
          explanation?: string | null
          hint?: string | null
          source_reference?: string | null
          time_estimate?: number | null
          order_index: number
          created_at?: string | null
        }
        Update: {
          id?: string
          quiz_id?: string
          type?: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'matching' | 'ordering'
          topic?: string | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          question_text?: string
          options?: Json | null
          correct_answer?: string
          explanation?: string | null
          hint?: string | null
          source_reference?: string | null
          time_estimate?: number | null
          order_index?: number
          created_at?: string | null
        }
      }
      quiz_attempts: {
        Row: {
          id: string
          quiz_id: string
          user_id: string
          mode: 'learn' | 'revision' | 'test'
          started_at: string | null
          completed_at: string | null
          time_spent: number | null
          score: number | null
          total_questions: number
          correct_answers: number | null
          status: 'in_progress' | 'completed' | 'abandoned' | null
          question_order: Json | null
        }
        Insert: {
          id?: string
          quiz_id: string
          user_id: string
          mode: 'learn' | 'revision' | 'test'
          started_at?: string | null
          completed_at?: string | null
          time_spent?: number | null
          score?: number | null
          total_questions: number
          correct_answers?: number | null
          status?: 'in_progress' | 'completed' | 'abandoned' | null
          question_order?: Json | null
        }
        Update: {
          id?: string
          quiz_id?: string
          user_id?: string
          mode?: 'learn' | 'revision' | 'test'
          started_at?: string | null
          completed_at?: string | null
          time_spent?: number | null
          score?: number | null
          total_questions?: number
          correct_answers?: number | null
          status?: 'in_progress' | 'completed' | 'abandoned' | null
          question_order?: Json | null
        }
      }
      question_responses: {
        Row: {
          id: string
          attempt_id: string
          question_id: string
          user_answer: string | null
          is_correct: boolean | null
          score: number | null
          time_spent: number | null
          answered_at: string | null
          evaluation_status: 'pending' | 'evaluated' | 'failed'
        }
        Insert: {
          id?: string
          attempt_id: string
          question_id: string
          user_answer?: string | null
          is_correct?: boolean | null
          score?: number | null
          time_spent?: number | null
          answered_at?: string | null
          evaluation_status?: 'pending' | 'evaluated' | 'failed'
        }
        Update: {
          id?: string
          attempt_id?: string
          question_id?: string
          user_answer?: string | null
          is_correct?: boolean | null
          score?: number | null
          time_spent?: number | null
          answered_at?: string | null
          evaluation_status?: 'pending' | 'evaluated' | 'failed'
        }
      }
      llm_telemetry: {
        Row: {
          id: string
          task_type: string
          model_id: string
          effort: string
          input_tokens: number | null
          output_tokens: number | null
          thinking_tokens: number | null
          estimated_cost_usd: number | null
          latency_ms: number
          status: string
          error_message: string | null
          pricing_version: string
          document_id: string | null
          quiz_id: string | null
          user_id: string | null
          attempt_number: number
          created_at: string | null
        }
        Insert: {
          id?: string
          task_type: string
          model_id: string
          effort: string
          input_tokens?: number | null
          output_tokens?: number | null
          thinking_tokens?: number | null
          estimated_cost_usd?: number | null
          latency_ms: number
          status: string
          error_message?: string | null
          pricing_version?: string
          document_id?: string | null
          quiz_id?: string | null
          user_id?: string | null
          attempt_number?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          task_type?: string
          model_id?: string
          effort?: string
          input_tokens?: number | null
          output_tokens?: number | null
          thinking_tokens?: number | null
          estimated_cost_usd?: number | null
          latency_ms?: number
          status?: string
          error_message?: string | null
          pricing_version?: string
          document_id?: string | null
          quiz_id?: string | null
          user_id?: string | null
          attempt_number?: number
          created_at?: string | null
        }
      }
    }
  }
}

// PDF Page Filtering Types
export type PageClassification =
  | 'content'      // Main educational content
  | 'cover'        // Title/cover page
  | 'toc'          // Table of contents
  | 'outline'      // Course outline
  | 'objectives'   // Learning objectives
  | 'review'       // Summary/review sections
  | 'quiz'         // Quiz/test questions
  | 'blank'        // Empty pages
  | 'unknown';     // Uncertain classification

export interface PageMetadata {
  pageNumber: number;
  classification: PageClassification;
  filtered: boolean;
  confidence: number;
  detectionMethod: 'heuristic' | 'ai';
  characterCount: number;
  keywords?: string[];
}
