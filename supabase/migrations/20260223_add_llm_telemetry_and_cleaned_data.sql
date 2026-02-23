-- 1. Telemetry table
CREATE TABLE public.llm_telemetry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_type text NOT NULL,
  model_id text NOT NULL,
  effort text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  thinking_tokens integer,
  estimated_cost_usd numeric(10, 8),
  latency_ms integer NOT NULL,
  status text NOT NULL,
  error_message text,
  pricing_version text NOT NULL DEFAULT 'v1',
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.llm_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own telemetry"
  ON public.llm_telemetry
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert telemetry"
  ON public.llm_telemetry
  FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_llm_telemetry_user_id ON public.llm_telemetry(user_id);
CREATE INDEX idx_llm_telemetry_document_id ON public.llm_telemetry(document_id);
CREATE INDEX idx_llm_telemetry_created_at ON public.llm_telemetry(created_at);

-- 2. Add cleaned_data column to documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS cleaned_data text;
