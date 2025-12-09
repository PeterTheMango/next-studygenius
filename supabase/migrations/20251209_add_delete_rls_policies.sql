-- Enable RLS on the tables if not already enabled
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_responses ENABLE ROW LEVEL SECURITY;

-- Policy for deleting own quiz attempts
DROP POLICY IF EXISTS "Users can delete own quiz attempts." ON public.quiz_attempts;
CREATE POLICY "Users can delete own quiz attempts."
ON public.quiz_attempts FOR DELETE
USING (auth.uid() = user_id);

-- Policy for deleting own question responses
DROP POLICY IF EXISTS "Users can delete own question responses." ON public.question_responses;
CREATE POLICY "Users can delete own question responses."
ON public.question_responses FOR DELETE
USING (auth.uid() = (SELECT user_id FROM public.quiz_attempts WHERE id = attempt_id));
