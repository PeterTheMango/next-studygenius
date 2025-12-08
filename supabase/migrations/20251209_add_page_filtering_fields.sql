-- Add page filtering fields to documents table
-- This migration adds support for tracking page-level filtering metadata

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS page_metadata JSONB,
ADD COLUMN IF NOT EXISTS filtered_page_count INTEGER,
ADD COLUMN IF NOT EXISTS original_page_count INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN documents.page_metadata IS 'Array of PageMetadata objects containing classification info for each page';
COMMENT ON COLUMN documents.filtered_page_count IS 'Number of pages remaining after filtering';
COMMENT ON COLUMN documents.original_page_count IS 'Total number of pages in the original PDF';

-- Create index on page_metadata for faster queries (optional)
CREATE INDEX IF NOT EXISTS idx_documents_page_metadata ON documents USING GIN (page_metadata);
