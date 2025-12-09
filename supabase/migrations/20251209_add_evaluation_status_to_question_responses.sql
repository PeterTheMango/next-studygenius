-- Add evaluation_status field to question_responses table
-- This supports offline AI evaluation by tracking whether an answer has been evaluated

-- Add evaluation_status column with default 'evaluated' for backwards compatibility
ALTER TABLE question_responses
ADD COLUMN evaluation_status TEXT NOT NULL DEFAULT 'evaluated' CHECK (evaluation_status IN ('pending', 'evaluated', 'failed'));

-- Add comment to document the field
COMMENT ON COLUMN question_responses.evaluation_status IS 'Status of AI evaluation: pending (not yet evaluated), evaluated (evaluation complete), failed (evaluation error)';

-- Create index for efficient queries of pending evaluations
CREATE INDEX idx_question_responses_evaluation_status
ON question_responses(evaluation_status)
WHERE evaluation_status = 'pending';

-- Add index on (attempt_id, evaluation_status) for efficient pending evaluation lookups per attempt
CREATE INDEX idx_question_responses_attempt_evaluation_status
ON question_responses(attempt_id, evaluation_status);
