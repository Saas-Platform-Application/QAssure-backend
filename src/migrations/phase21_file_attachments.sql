-- ============================================================================
-- PHASE 21: File Attachments & Storage
-- Centralized file management with cloud-ready architecture
-- ============================================================================

-- ============================================================================
-- 1. FILE ATTACHMENTS (Central file registry)
-- ============================================================================

CREATE TABLE IF NOT EXISTS file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- File Identity
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  
  -- File Properties
  mime_type VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  checksum VARCHAR(64),  -- SHA-256 hash
  
  -- Storage Info
  storage_provider VARCHAR(50) DEFAULT 'local',  -- local, s3, azure, gcs
  storage_bucket VARCHAR(255),
  storage_region VARCHAR(50),
  
  -- Entity Relationship
  entity_type VARCHAR(100) NOT NULL,  -- capa, document, training, supplier, audit
  entity_id UUID NOT NULL,
  
  -- Categorization
  category VARCHAR(100),  -- evidence, report, certificate, image, other
  description TEXT,
  tags TEXT[],
  
  -- Versioning
  version INTEGER DEFAULT 1,
  is_current_version BOOLEAN DEFAULT TRUE,
  previous_version_id UUID REFERENCES file_attachments(id),
  
  -- Access Control
  is_public BOOLEAN DEFAULT FALSE,
  access_level VARCHAR(50) DEFAULT 'private',  -- private, internal, public
  download_count INTEGER DEFAULT 0,
  
  -- Thumbnail (for images)
  has_thumbnail BOOLEAN DEFAULT FALSE,
  thumbnail_path VARCHAR(1000),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Virus Scan
  scan_status VARCHAR(50) DEFAULT 'pending',  -- pending, clean, infected, error
  scanned_at TIMESTAMPTZ,
  
  -- Audit
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

CREATE INDEX IF NOT EXISTS idx_file_attachments_tenant ON file_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_entity ON file_attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploader ON file_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_attachments_created ON file_attachments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_attachments_type ON file_attachments(mime_type);
CREATE INDEX IF NOT EXISTS idx_file_attachments_active ON file_attachments(tenant_id, entity_type, entity_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. FILE ACCESS LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS file_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES file_attachments(id) ON DELETE CASCADE,
  
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,  -- view, download, preview, share
  
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_access_logs_file ON file_access_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_user ON file_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_date ON file_access_logs(created_at DESC);

-- ============================================================================
-- 3. FILE SHARES (Temporary/permanent sharing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES file_attachments(id) ON DELETE CASCADE,
  
  -- Share Settings
  share_token VARCHAR(100) UNIQUE NOT NULL,
  share_type VARCHAR(50) DEFAULT 'link',  -- link, email, user
  
  -- Recipient (optional)
  shared_with_user_id UUID REFERENCES users(id),
  shared_with_email VARCHAR(255),
  
  -- Access Control
  permissions VARCHAR(50) DEFAULT 'view',  -- view, download
  password_hash VARCHAR(255),
  
  -- Expiry
  expires_at TIMESTAMPTZ,
  max_downloads INTEGER,
  current_downloads INTEGER DEFAULT 0,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_file_shares_token ON file_shares(share_token) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_file_shares_file ON file_shares(file_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_expiry ON file_shares(expires_at) WHERE is_active = TRUE;

-- ============================================================================
-- 4. STORAGE QUOTAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS storage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  
  -- Quota Settings
  max_storage_bytes BIGINT DEFAULT 10737418240,  -- 10 GB default
  max_file_size_bytes BIGINT DEFAULT 104857600,  -- 100 MB default
  
  -- Usage
  used_storage_bytes BIGINT DEFAULT 0,
  file_count INTEGER DEFAULT 0,
  
  -- Per-type limits
  allowed_mime_types TEXT[],
  blocked_extensions TEXT[] DEFAULT ARRAY['.exe', '.bat', '.cmd', '.sh', '.ps1'],
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storage_quotas_tenant ON storage_quotas(tenant_id);



-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to update storage usage
CREATE OR REPLACE FUNCTION update_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE storage_quotas 
    SET used_storage_bytes = used_storage_bytes + NEW.file_size,
        file_count = file_count + 1,
        updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.deleted_at IS NULL THEN
    UPDATE storage_quotas 
    SET used_storage_bytes = used_storage_bytes - OLD.file_size,
        file_count = file_count - 1,
        updated_at = NOW()
    WHERE tenant_id = OLD.tenant_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for storage usage tracking
DROP TRIGGER IF EXISTS trg_update_storage_usage ON file_attachments;
CREATE TRIGGER trg_update_storage_usage
  AFTER INSERT OR DELETE ON file_attachments
  FOR EACH ROW EXECUTE FUNCTION update_storage_usage();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count FROM information_schema.tables
  WHERE table_schema = 'public' 
  AND table_name IN ('file_attachments', 'file_access_logs', 'file_shares', 'storage_quotas');
  
  RAISE NOTICE '✅ Phase 21: Created % file attachment tables', table_count;
END $$;
