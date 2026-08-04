-- ============================================================================
-- PHASE 15: Document Management (AiDV - AI Document Vault)
-- Controlled document lifecycle with versioning and approval workflows
-- ============================================================================

-- ============================================================================
-- 1. DOCUMENT CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES document_categories(id),
  
  -- Settings
  requires_training BOOLEAN DEFAULT FALSE,
  retention_years INTEGER DEFAULT 7,
  review_frequency_months INTEGER DEFAULT 12,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_doc_categories_tenant ON document_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_categories_parent ON document_categories(parent_id);

-- ============================================================================
-- 2. DOCUMENTS (Master record)
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Document Identity
  document_number VARCHAR(100) NOT NULL,  -- e.g., SOP-001, WI-042
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Classification
  category_id UUID REFERENCES document_categories(id),
  document_type VARCHAR(100) NOT NULL,  -- SOP, WI, Form, Policy, Specification
  
  -- Current State
  status VARCHAR(50) DEFAULT 'draft',  -- draft, in_review, approved, effective, obsolete, archived
  current_version_id UUID,  -- Points to latest approved version
  
  -- Ownership
  owner_id UUID REFERENCES users(id),
  department VARCHAR(255),
  
  -- Effective Dates
  effective_date DATE,
  next_review_date DATE,
  obsolete_date DATE,
  
  -- Workflow
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  
  -- Metadata
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  
  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, document_number)
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(tenant_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_review ON documents(next_review_date) WHERE status = 'effective';
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);

-- ============================================================================
-- 3. DOCUMENT VERSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Version Info
  version_number VARCHAR(20) NOT NULL,  -- e.g., 1.0, 1.1, 2.0
  major_version INTEGER NOT NULL DEFAULT 1,
  minor_version INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft',  -- draft, in_review, approved, superseded
  
  -- Content
  file_name VARCHAR(500),
  file_path VARCHAR(1000),
  file_size BIGINT,
  mime_type VARCHAR(255),
  file_hash VARCHAR(128),  -- SHA-256 for integrity
  
  -- Content for text-based docs
  content TEXT,
  content_html TEXT,
  
  -- Change Info
  change_summary TEXT,
  change_reason VARCHAR(100),  -- minor_edit, correction, major_revision, regulatory_update
  
  -- Approval
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  signature_id UUID,  -- Links to electronic_signatures
  
  -- Workflow
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_status ON document_versions(status);
CREATE INDEX IF NOT EXISTS idx_doc_versions_tenant ON document_versions(tenant_id);

-- ============================================================================
-- 4. DOCUMENT ACCESS LOG (Who viewed what)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id UUID REFERENCES document_versions(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL,  -- view, download, print, edit, checkout, checkin
  
  ip_address INET,
  user_agent TEXT,
  
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_access_document ON document_access_log(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_user ON document_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_date ON document_access_log(accessed_at);

-- ============================================================================
-- 5. DOCUMENT CHECKOUT (Prevent concurrent editing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  checked_out_by UUID NOT NULL REFERENCES users(id),
  checked_out_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- Auto-release after timeout
  
  reason TEXT,
  
  UNIQUE(document_id)  -- Only one checkout per document
);

CREATE INDEX IF NOT EXISTS idx_doc_checkout_user ON document_checkouts(checked_out_by);

-- ============================================================================
-- 6. DOCUMENT TRAINING REQUIREMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Who needs training
  required_for VARCHAR(50) NOT NULL,  -- all, role, department, user
  role_name VARCHAR(100),
  department_name VARCHAR(255),
  user_id UUID REFERENCES users(id),
  
  -- Training settings
  due_within_days INTEGER DEFAULT 30,
  requires_acknowledgment BOOLEAN DEFAULT TRUE,
  requires_quiz BOOLEAN DEFAULT FALSE,
  quiz_pass_score INTEGER DEFAULT 80,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_training_document ON document_training(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_training_version ON document_training(version_id);

-- ============================================================================
-- 7. DOCUMENT LINKS (Related documents)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  link_type VARCHAR(50) NOT NULL,  -- references, supersedes, related_to, parent_of, child_of
  description TEXT,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source_document_id, target_document_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_doc_links_source ON document_links(source_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_links_target ON document_links(target_document_id);

-- ============================================================================
-- 8. DOCUMENT TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  document_type VARCHAR(100) NOT NULL,
  category_id UUID REFERENCES document_categories(id),
  
  -- Template content
  template_content TEXT,
  template_html TEXT,
  file_path VARCHAR(1000),
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_templates_tenant ON document_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_templates_type ON document_templates(document_type);


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'documents', 'document_versions', 'document_categories', 
    'document_access_log', 'document_checkouts', 'document_training',
    'document_links', 'document_templates'
  );
  
  RAISE NOTICE '✅ Phase 15: Created % document management tables', table_count;
END $$;
