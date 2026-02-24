-- Async document processing: add staged tracking columns to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_stage text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS error_stage text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_completed_at timestamptz;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS batch_id uuid;

-- Index for finding active processing jobs
CREATE INDEX IF NOT EXISTS idx_documents_active_processing
  ON documents(user_id, status) WHERE status IN ('pending','processing');

-- Document batches table for multi-file uploads
CREATE TABLE IF NOT EXISTS public.document_batches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'partial', 'failed')),
  total_count integer NOT NULL DEFAULT 0,
  completed_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- RLS for document_batches
ALTER TABLE public.document_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own batches"
  ON public.document_batches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own batches"
  ON public.document_batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update batches"
  ON public.document_batches FOR UPDATE
  USING (true);

-- FK from documents to batches
ALTER TABLE documents
  ADD CONSTRAINT fk_documents_batch_id
  FOREIGN KEY (batch_id) REFERENCES public.document_batches(id)
  ON DELETE SET NULL;

-- Atomic increment functions for batch coordination
CREATE OR REPLACE FUNCTION increment_batch_completed(p_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total integer;
  v_completed integer;
  v_failed integer;
BEGIN
  UPDATE document_batches
  SET completed_count = completed_count + 1
  WHERE id = p_batch_id
  RETURNING total_count, completed_count, failed_count
  INTO v_total, v_completed, v_failed;

  IF v_completed + v_failed >= v_total THEN
    IF v_failed = 0 THEN
      UPDATE document_batches
      SET status = 'completed', completed_at = now()
      WHERE id = p_batch_id;
    ELSE
      UPDATE document_batches
      SET status = 'partial', completed_at = now()
      WHERE id = p_batch_id;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION increment_batch_failed(p_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total integer;
  v_completed integer;
  v_failed integer;
BEGIN
  UPDATE document_batches
  SET failed_count = failed_count + 1
  WHERE id = p_batch_id
  RETURNING total_count, completed_count, failed_count
  INTO v_total, v_completed, v_failed;

  IF v_completed + v_failed >= v_total THEN
    IF v_completed = 0 THEN
      UPDATE document_batches
      SET status = 'failed', completed_at = now()
      WHERE id = p_batch_id;
    ELSE
      UPDATE document_batches
      SET status = 'partial', completed_at = now()
      WHERE id = p_batch_id;
    END IF;
  END IF;
END;
$$;

-- Index on document_batches for user queries
CREATE INDEX IF NOT EXISTS idx_document_batches_user_id
  ON document_batches(user_id);
