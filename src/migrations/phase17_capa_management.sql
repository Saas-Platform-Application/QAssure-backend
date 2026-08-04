-- ============================================================================
-- PHASE 17: CAPA Management (AiCE - AI Corrective Action Engine)
-- Corrective and Preventive Action management with 8D methodology
-- ============================================================================

-- ============================================================================
-- 1. CAPA RECORDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS capas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Identity
  capa_number VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Classification
  capa_type VARCHAR(50) NOT NULL,  -- corrective, preventive, both
  source VARCHAR(100),  -- customer_complaint, audit, deviation, internal, supplier
  priority VARCHAR(50) DEFAULT 'medium',  -- critical, high, medium, low
  risk_level VARCHAR(50),  -- high, medium, low
  
  -- Problem Details
  problem_statement TEXT,
  immediate_action TEXT,
  containment_action TEXT,
  
  -- Investigation
  root_cause TEXT,
  root_cause_method VARCHAR(100),  -- 5_why, fishbone, fmea, fault_tree
  contributing_factors TEXT[],
  
  -- Corrective/Preventive Actions
  corrective_action TEXT,
  preventive_action TEXT,
  
  -- Verification
  verification_method TEXT,
  verification_results TEXT,
  effectiveness_criteria TEXT,
  effectiveness_verified BOOLEAN,
  effectiveness_date DATE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft',  -- draft, open, investigation, action, verification, closed, cancelled
  
  -- Ownership
  owner_id UUID REFERENCES users(id),
  department VARCHAR(255),
  
  -- Dates
  identified_date DATE,
  target_date DATE,
  closed_date DATE,
  
  -- Related Records
  source_record_type VARCHAR(100),  -- deviation, complaint, audit_finding
  source_record_id UUID,
  
  -- Workflow
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  
  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, capa_number)
);

CREATE INDEX IF NOT EXISTS idx_capas_tenant ON capas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_capas_status ON capas(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_capas_owner ON capas(owner_id);
CREATE INDEX IF NOT EXISTS idx_capas_type ON capas(capa_type);
CREATE INDEX IF NOT EXISTS idx_capas_priority ON capas(priority);
CREATE INDEX IF NOT EXISTS idx_capas_target ON capas(target_date) WHERE status NOT IN ('closed', 'cancelled');

-- ============================================================================
-- 2. CAPA ACTIONS (Individual action items)
-- ============================================================================

CREATE TABLE IF NOT EXISTS capa_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_id UUID NOT NULL REFERENCES capas(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Action Details
  action_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  action_type VARCHAR(50) NOT NULL,  -- immediate, containment, corrective, preventive, verification
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  department VARCHAR(255),
  
  -- Dates
  due_date DATE,
  completed_date DATE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',  -- pending, in_progress, completed, cancelled
  
  -- Evidence
  evidence TEXT,
  attachments JSONB DEFAULT '[]',
  
  -- Verification
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(capa_id, action_number)
);

CREATE INDEX IF NOT EXISTS idx_capa_actions_capa ON capa_actions(capa_id);
CREATE INDEX IF NOT EXISTS idx_capa_actions_assigned ON capa_actions(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_capa_actions_due ON capa_actions(due_date) WHERE status = 'pending';

-- ============================================================================
-- 3. CAPA RELATED RECORDS (Links to other QMS records)
-- ============================================================================

CREATE TABLE IF NOT EXISTS capa_related_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_id UUID NOT NULL REFERENCES capas(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  related_type VARCHAR(100) NOT NULL,  -- deviation, complaint, audit, ncr, training, document
  related_id UUID NOT NULL,
  related_number VARCHAR(100),
  relationship VARCHAR(100),  -- source, related, caused_by, resulted_in
  
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(capa_id, related_type, related_id)
);

CREATE INDEX IF NOT EXISTS idx_capa_related_capa ON capa_related_records(capa_id);
CREATE INDEX IF NOT EXISTS idx_capa_related_record ON capa_related_records(related_type, related_id);

-- ============================================================================
-- 4. CAPA 8D REPORT (8D Methodology Structure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS capa_8d_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_id UUID NOT NULL REFERENCES capas(id) ON DELETE CASCADE UNIQUE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- D1: Team
  d1_team JSONB,  -- [{user_id, role, name}]
  d1_completed_at TIMESTAMPTZ,
  
  -- D2: Problem Description
  d2_problem_description TEXT,
  d2_who TEXT,
  d2_what TEXT,
  d2_when TEXT,
  d2_where TEXT,
  d2_why TEXT,
  d2_how TEXT,
  d2_how_many TEXT,
  d2_completed_at TIMESTAMPTZ,
  
  -- D3: Interim Containment
  d3_containment_actions TEXT,
  d3_verification TEXT,
  d3_completed_at TIMESTAMPTZ,
  
  -- D4: Root Cause Analysis
  d4_root_causes TEXT,
  d4_escape_point TEXT,
  d4_analysis_method VARCHAR(100),
  d4_completed_at TIMESTAMPTZ,
  
  -- D5: Permanent Corrective Actions
  d5_corrective_actions TEXT,
  d5_verification_plan TEXT,
  d5_completed_at TIMESTAMPTZ,
  
  -- D6: Implementation & Validation
  d6_implementation_plan TEXT,
  d6_validation_results TEXT,
  d6_completed_at TIMESTAMPTZ,
  
  -- D7: Preventive Actions
  d7_preventive_actions TEXT,
  d7_systemic_changes TEXT,
  d7_completed_at TIMESTAMPTZ,
  
  -- D8: Closure
  d8_lessons_learned TEXT,
  d8_recognition TEXT,
  d8_closed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capa_8d_capa ON capa_8d_reports(capa_id);

-- ============================================================================
-- 5. CAPA METRICS (For trending and analysis)
-- ============================================================================

CREATE TABLE IF NOT EXISTS capa_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Counts
  total_opened INTEGER DEFAULT 0,
  total_closed INTEGER DEFAULT 0,
  total_overdue INTEGER DEFAULT 0,
  
  -- By Type
  corrective_count INTEGER DEFAULT 0,
  preventive_count INTEGER DEFAULT 0,
  
  -- By Source
  by_source JSONB DEFAULT '{}',
  
  -- By Department
  by_department JSONB DEFAULT '{}',
  
  -- Timing
  avg_days_to_close DECIMAL(10,2),
  
  -- Effectiveness
  effectiveness_rate DECIMAL(5,2),
  
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, period_start, period_end)
);



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
  AND table_name IN ('capas', 'capa_actions', 'capa_related_records', 'capa_8d_reports', 'capa_metrics');
  
  RAISE NOTICE '✅ Phase 17: Created % CAPA management tables', table_count;
END $$;
