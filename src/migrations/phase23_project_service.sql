-- ============================================================================
-- PHASE 23: PROJECT SERVICE
-- Platform service for organizing regulatory work across modules
-- ============================================================================

-- ============================================================================
-- 1. PROJECTS TABLE (Main container for regulatory work)
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Project Type (what kind of regulatory work)
  project_type VARCHAR(100) NOT NULL, -- 'cer_submission', 'dhf', 'complaint_investigation', 'supplier_qualification', 'pms_report', 'custom'
  
  -- Status & Lifecycle
  status VARCHAR(50) DEFAULT 'planning', -- 'planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived'
  priority VARCHAR(20) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  
  -- Dates
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  
  -- Product/Device Context (links to what this project is about)
  product_name VARCHAR(255),
  product_code VARCHAR(100),
  device_class VARCHAR(50), -- 'Class I', 'Class II', 'Class III', 'IVD', etc.
  regulatory_pathway VARCHAR(100), -- '510k', 'PMA', 'De Novo', 'MDR', 'IVDR', etc.
  
  -- Regulatory Context
  submission_type VARCHAR(100), -- 'initial', 'amendment', 'renewal', 'response'
  regulatory_body VARCHAR(100), -- 'FDA', 'EU', 'Health Canada', 'TGA', 'PMDA', etc.
  submission_number VARCHAR(100),
  
  -- Configuration
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Ownership
  owner_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint per tenant
  CONSTRAINT unique_project_code_per_tenant UNIQUE (tenant_id, code)
);

-- Indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(tenant_id, project_type);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(tenant_id, start_date, target_end_date);

-- ============================================================================
-- 2. PROJECT MEMBERS TABLE (Who can access the project)
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Role in project
  role VARCHAR(100) NOT NULL, -- 'project_manager', 'lead', 'contributor', 'reviewer', 'approver', 'viewer'
  
  -- Permissions (fine-grained access within project)
  permissions JSONB DEFAULT '["read"]', -- ['read', 'write', 'delete', 'approve', 'manage_members']
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'pending_invitation'
  
  -- Dates
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  
  -- Invitation tracking
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One membership per user per project
  CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

-- Indexes for project_members
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_tenant ON project_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(project_id, role);

-- ============================================================================
-- 3. PROJECT MILESTONES TABLE (Key dates and deliverables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Milestone Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  milestone_type VARCHAR(100), -- 'phase_gate', 'deliverable', 'review', 'submission', 'approval', 'custom'
  
  -- Dates
  planned_date DATE NOT NULL,
  actual_date DATE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'missed', 'cancelled'
  
  -- Sequence
  sequence INTEGER DEFAULT 0,
  
  -- Dependencies
  depends_on UUID REFERENCES project_milestones(id),
  
  -- Ownership
  owner_id UUID REFERENCES users(id),
  completed_by UUID REFERENCES users(id),
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for project_milestones
CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_tenant ON project_milestones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON project_milestones(project_id, status);
CREATE INDEX IF NOT EXISTS idx_project_milestones_date ON project_milestones(project_id, planned_date);

-- ============================================================================
-- 4. PROJECT MODULES TABLE (Which modules are enabled for this project)
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Module Reference
  module_code VARCHAR(100) NOT NULL, -- 'aice', 'aich', 'dhf', 'sqm', 'pms'
  
  -- Status
  is_enabled BOOLEAN DEFAULT TRUE,
  
  -- Module-specific configuration
  config JSONB DEFAULT '{}',
  
  -- Timestamps
  enabled_at TIMESTAMPTZ DEFAULT NOW(),
  disabled_at TIMESTAMPTZ,
  enabled_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One module per project
  CONSTRAINT unique_project_module UNIQUE (project_id, module_code)
);

-- Indexes for project_modules
CREATE INDEX IF NOT EXISTS idx_project_modules_project ON project_modules(project_id);
CREATE INDEX IF NOT EXISTS idx_project_modules_tenant ON project_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_modules_code ON project_modules(module_code);

-- ============================================================================
-- 5. PROJECT ACTIVITY LOG TABLE (Track all project activities)
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Activity Info
  activity_type VARCHAR(100) NOT NULL, -- 'created', 'updated', 'member_added', 'member_removed', 'milestone_completed', 'status_changed', 'module_enabled', etc.
  description TEXT,
  
  -- What changed
  entity_type VARCHAR(100), -- 'project', 'member', 'milestone', 'module', 'document', 'workflow'
  entity_id UUID,
  
  -- Change details
  old_value JSONB,
  new_value JSONB,
  
  -- Who & When
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional context
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for project_activity_log
CREATE INDEX IF NOT EXISTS idx_project_activity_project ON project_activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_tenant ON project_activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_type ON project_activity_log(project_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_project_activity_date ON project_activity_log(project_id, performed_at DESC);

-- ============================================================================
-- 6. ADD PROJECT REFERENCE TO EXISTING TABLES
-- ============================================================================

-- Add project_id to workflow_instances (workflows belong to projects)
ALTER TABLE workflow_instances 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_project ON workflow_instances(project_id);

-- Add project_id to documents (documents belong to projects)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);

-- Add project_id to capas (CAPAs can belong to projects)
ALTER TABLE capas 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

CREATE INDEX IF NOT EXISTS idx_capas_project ON capas(project_id);

-- Add project_id to training_assignments (training can be project-specific)
ALTER TABLE training_assignments 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

CREATE INDEX IF NOT EXISTS idx_training_assignments_project ON training_assignments(project_id);

-- Add project_id to suppliers (supplier qualification can be project-specific)
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

CREATE INDEX IF NOT EXISTS idx_suppliers_project ON suppliers(project_id);

-- ============================================================================
-- 7. INSERT DEFAULT PROJECT TYPES
-- ============================================================================

-- We'll store project types in system_settings for configurability
INSERT INTO system_settings (tenant_id, category, setting_key, setting_value, value_type, description)
VALUES (
  NULL, -- Global setting
  'general',
  'project_types',
  '[
    {"code": "cer_submission", "name": "Clinical Evaluation Report", "description": "CER/PER submission project", "modules": ["aice"]},
    {"code": "dhf", "name": "Design History File", "description": "DHF management project", "modules": ["dhf"]},
    {"code": "complaint_investigation", "name": "Complaint Investigation", "description": "Complaint handling project", "modules": ["aich"]},
    {"code": "supplier_qualification", "name": "Supplier Qualification", "description": "Supplier qualification project", "modules": ["sqm"]},
    {"code": "pms_report", "name": "Post-Market Surveillance", "description": "PMS/PSUR report project", "modules": ["pms"]},
    {"code": "regulatory_submission", "name": "Regulatory Submission", "description": "General regulatory submission", "modules": ["aice", "dhf"]},
    {"code": "audit_preparation", "name": "Audit Preparation", "description": "Regulatory audit preparation", "modules": ["dhf", "sqm"]},
    {"code": "custom", "name": "Custom Project", "description": "Custom project type", "modules": []}
  ]'::jsonb,
  'json',
  'Available project types with associated modules'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'projects', 'project_members', 'project_milestones', 
    'project_modules', 'project_activity_log'
  );
  
  RAISE NOTICE '✅ Phase 23: Created % project tables', table_count;
END $$;

