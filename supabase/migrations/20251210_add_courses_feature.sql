-- Migration: Add Courses Feature
-- Created: 2025-12-10
-- Description: Creates courses table, updates documents table with course_id, and adds course statistics view

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  course_code TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT NOT NULL DEFAULT 'book-open',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique course codes per user
  CONSTRAINT unique_user_course_code UNIQUE(user_id, course_code)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_user_status ON courses(user_id, status);

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses table
CREATE POLICY "Users can view their own courses"
  ON courses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own courses"
  ON courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses"
  ON courses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses"
  ON courses FOR DELETE
  USING (auth.uid() = user_id);

-- Add course_id column to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- Create index for fast course-document lookups
CREATE INDEX IF NOT EXISTS idx_documents_course_id ON documents(course_id);

-- Create view for course statistics
CREATE OR REPLACE VIEW course_statistics AS
SELECT
  c.id AS course_id,
  c.user_id,
  c.title,
  c.description,
  c.course_code,
  c.color,
  c.icon,
  c.status,
  c.created_at,
  c.updated_at,
  COUNT(DISTINCT d.id) AS total_documents,
  COUNT(DISTINCT q.id) AS total_quizzes,
  COUNT(DISTINCT qa.id) AS total_attempts,
  ROUND(AVG(CASE WHEN qa.score IS NOT NULL THEN qa.score * 100 END), 1) AS avg_quiz_score,
  COUNT(DISTINCT CASE WHEN qa.status = 'completed' THEN qa.id END) AS completed_quizzes,
  COALESCE(SUM(qa.time_spent), 0) AS total_time_spent,
  COUNT(DISTINCT CASE WHEN qa.completed_at >= NOW() - INTERVAL '7 days' THEN qa.id END) AS recent_attempts,
  (
    SELECT COUNT(DISTINCT topic)
    FROM documents d2
    CROSS JOIN LATERAL jsonb_array_elements_text(d2.topics) AS topic
    WHERE d2.course_id = c.id AND d2.status = 'ready'
  ) AS unique_topics
FROM courses c
LEFT JOIN documents d ON d.course_id = c.id AND d.status = 'ready'
LEFT JOIN quizzes q ON q.document_id = d.id AND q.status = 'ready'
LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = c.user_id
GROUP BY c.id, c.user_id, c.title, c.description, c.course_code, c.color, c.icon, c.status, c.created_at, c.updated_at;

-- Add comment explaining the view
COMMENT ON VIEW course_statistics IS 'Aggregated statistics for courses including document counts, quiz performance, and time tracking';
