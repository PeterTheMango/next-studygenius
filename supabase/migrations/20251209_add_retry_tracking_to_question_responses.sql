-- Add retry tracking fields to question_responses table
-- This supports the retry incorrect questions feature in learning mode

-- Add attempt_number column to track which attempt this is (1st, 2nd, 3rd, etc.)
ALTER TABLE question_responses
ADD COLUMN attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0);

-- Add is_retry_round column to distinguish initial attempts from retry attempts
ALTER TABLE question_responses
ADD COLUMN is_retry_round BOOLEAN NOT NULL DEFAULT false;

-- Add comments to document the fields
COMMENT ON COLUMN question_responses.attempt_number IS 'The attempt number for this question (1 = first attempt, 2 = first retry, 3 = second retry, etc.)';
COMMENT ON COLUMN question_responses.is_retry_round IS 'Whether this response was submitted during a retry round (learning mode only)';

-- Drop the existing unique constraint on (attempt_id, question_id) if it exists
-- This allows multiple responses per question to track retry history
ALTER TABLE question_responses
DROP CONSTRAINT IF EXISTS question_responses_attempt_id_question_id_key;

-- Create a new unique constraint that includes attempt_number
-- This ensures we can have multiple attempts but not duplicate attempt numbers
ALTER TABLE question_responses
ADD CONSTRAINT question_responses_attempt_question_unique
UNIQUE (attempt_id, question_id, attempt_number);

-- Create index for efficient queries of retry attempts
CREATE INDEX idx_question_responses_retry_round
ON question_responses(attempt_id, is_retry_round)
WHERE is_retry_round = true;

-- Create index for efficient queries by attempt number
CREATE INDEX idx_question_responses_attempt_number
ON question_responses(attempt_id, question_id, attempt_number);
