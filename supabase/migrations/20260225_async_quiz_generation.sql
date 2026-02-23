-- Async quiz generation: add staged tracking columns to quizzes
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS generation_stage text;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS error_stage text;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS generation_started_at timestamptz;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS generation_completed_at timestamptz;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS difficulty_distribution jsonb;

-- Expand status constraint to support staged generation values
-- Drop existing check constraint if any, then re-add
DO $$ BEGIN
  ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Update any 'draft' statuses to a valid value (draft is no longer used)
UPDATE quizzes SET status = 'ready' WHERE status = 'draft';

-- Index for finding active generation jobs
CREATE INDEX IF NOT EXISTS idx_quizzes_active_generation
  ON quizzes(user_id, status) WHERE status IN ('queued','generating','cleaning','structuring','finalizing');

-- Add attempt_number to llm_telemetry for fallback tracking
ALTER TABLE llm_telemetry ADD COLUMN IF NOT EXISTS attempt_number integer DEFAULT 1;
