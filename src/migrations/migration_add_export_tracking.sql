-- Migration: Add export tracking columns to report_history
-- Required for tenant-isolated export file tracking
-- Run this BEFORE deploying the updated export.service.js

-- Add output_format column (pdf/xlsx)
ALTER TABLE report_history ADD COLUMN IF NOT EXISTS output_format VARCHAR(10);

-- Add file_size_bytes column
ALTER TABLE report_history ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

-- Index for finding exports by tenant + status
CREATE INDEX IF NOT EXISTS idx_report_history_tenant_output 
  ON report_history(tenant_id, status) 
  WHERE output_path IS NOT NULL;

-- Index for cleanup queries (find old records)
CREATE INDEX IF NOT EXISTS idx_report_history_executed_at 
  ON report_history(executed_at);

-- Verify
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'report_history' 
ORDER BY ordinal_position;
