-- Add question_order column to quiz_attempts table to store shuffled question order
-- This enables consistent question ordering across page refreshes and quiz resume

ALTER TABLE quiz_attempts
ADD COLUMN question_order jsonb;

-- Add comment to explain the column's purpose
COMMENT ON COLUMN quiz_attempts.question_order IS 'Stores the shuffled order of question IDs for this attempt. Format: ["question_id_1", "question_id_2", ...]. Ensures consistent question order across sessions and resume.';
