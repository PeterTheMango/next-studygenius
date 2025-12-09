-- Fix retry scoring for quiz attempts
-- This migration recalculates correct_answers to properly handle retries
-- Scoring rules:
-- - Each question can only contribute 1 point maximum
-- - Use the latest evaluated response for each question

-- Create a temporary function to recalculate correct answers for an attempt
CREATE OR REPLACE FUNCTION recalculate_attempt_score(attempt_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  correct_count INTEGER;
BEGIN
  -- Count distinct questions where the latest evaluated response is correct
  WITH latest_responses AS (
    SELECT DISTINCT ON (question_id)
      question_id,
      is_correct,
      evaluation_status
    FROM question_responses
    WHERE attempt_id = attempt_uuid
      AND evaluation_status = 'evaluated'
    ORDER BY question_id, attempt_number DESC
  )
  SELECT COUNT(*)
  INTO correct_count
  FROM latest_responses
  WHERE is_correct = true;

  RETURN COALESCE(correct_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Update all quiz attempts with recalculated scores
UPDATE quiz_attempts
SET correct_answers = recalculate_attempt_score(id)
WHERE status = 'completed';

-- Also update the score decimal field to match
UPDATE quiz_attempts
SET score = CASE
  WHEN total_questions > 0 THEN correct_answers::DECIMAL / total_questions
  ELSE 0
END
WHERE status = 'completed';

-- Drop the temporary function
DROP FUNCTION recalculate_attempt_score(UUID);

-- Add comment to document the fix
COMMENT ON COLUMN quiz_attempts.correct_answers IS 'Number of questions answered correctly. For questions with retries, only the latest evaluated response counts.';
