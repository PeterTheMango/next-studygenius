-- Add score field to question_responses table
-- This stores the numeric score (0-100) for AI-evaluated answers

ALTER TABLE question_responses
ADD COLUMN IF NOT EXISTS score INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN question_responses.score IS 'Numeric score (0-100) for AI-evaluated answers. NULL for non-AI evaluated questions.';

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_question_responses_score ON question_responses(score);
