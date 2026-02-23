-- Add UPDATE policy for question_responses table
-- This allows users to update their own question responses (e.g., for override functionality)

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update own question responses." ON public.question_responses;

-- Create UPDATE policy that allows users to update their own responses
CREATE POLICY "Users can update own question responses."
ON public.question_responses FOR UPDATE
USING (auth.uid() = (SELECT user_id FROM public.quiz_attempts WHERE id = attempt_id))
WITH CHECK (auth.uid() = (SELECT user_id FROM public.quiz_attempts WHERE id = attempt_id));

-- Add comment to document the policy
COMMENT ON POLICY "Users can update own question responses." ON public.question_responses IS
'Allows users to update their own question responses. Validates ownership through quiz_attempts.user_id.';
