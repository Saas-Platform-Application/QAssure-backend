-- Phase 25: Module API Keys Enhancement
-- Adds module_id to api_keys table for module-specific API keys

-- Add module_id column to api_keys table
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS module_id UUID NULL;

-- Add index for module_id
CREATE INDEX IF NOT EXISTS idx_api_keys_module_id ON api_keys(module_id);

-- Add foreign key constraint (optional - only if you want strict referential integrity)
-- ALTER TABLE api_keys 
-- ADD CONSTRAINT fk_api_keys_module_id 
-- FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL;

-- Add key_prefix column if it doesn't exist
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS key_prefix VARCHAR(20) NULL;