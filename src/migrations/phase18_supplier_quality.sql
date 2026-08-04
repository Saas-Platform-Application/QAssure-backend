-- ============================================================================
-- PHASE 18: Supplier Quality Management
-- Supplier qualification, audits, scorecards, and approved supplier list
-- ============================================================================

-- ============================================================================
-- 1. SUPPLIERS (Master record)
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Identity
  supplier_code VARCHAR(100) NOT NULL,
  name VARCHAR(500) NOT NULL,
  legal_name VARCHAR(500),
  
  -- Classification
  supplier_type VARCHAR(100),  -- manufacturer, distributor, service_provider, raw_material
  category VARCHAR(100),  -- critical, major, minor
  risk_level VARCHAR(50),  -- high, medium, low
  
  -- Contact Info
  primary_contact_name VARCHAR(255),
  primary_contact_email VARCHAR(255),
  primary_contact_phone VARCHAR(50),
  website VARCHAR(500),
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  
  -- Business Info
  tax_id VARCHAR(100),
  duns_number VARCHAR(20),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',  -- pending, qualified, approved, conditional, suspended, disqualified
  approved_date DATE,
  expiry_date DATE,
  
  -- Quality Info
  quality_agreement_signed BOOLEAN DEFAULT FALSE,
  quality_agreement_date DATE,
  last_audit_date DATE,
  next_audit_date DATE,
  
  -- Certifications
  certifications JSONB DEFAULT '[]',  -- [{name, number, issued_by, expiry_date}]
  
  -- Scoring
  current_score DECIMAL(5,2),
  score_grade VARCHAR(10),  -- A, B, C, D, F
  
  -- Products/Services
  products_services TEXT[],
  
  -- Workflow
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  
  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, supplier_code)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);
CREATE INDEX IF NOT EXISTS idx_suppliers_expiry ON suppliers(expiry_date) WHERE status = 'approved';

-- ============================================================================
-- 2. SUPPLIER CONTACTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  
  contact_type VARCHAR(100),  -- primary, quality, sales, technical, emergency
  is_primary BOOLEAN DEFAULT FALSE,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);

-- ============================================================================
-- 3. SUPPLIER AUDITS
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Audit Info
  audit_number VARCHAR(100) NOT NULL,
  audit_type VARCHAR(100) NOT NULL,  -- initial, periodic, for_cause, follow_up
  audit_scope TEXT,
  
  -- Dates
  scheduled_date DATE,
  actual_date DATE,
  
  -- Team
  lead_auditor_id UUID REFERENCES users(id),
  audit_team JSONB,  -- [{user_id, name, role}]
  
  -- Status
  status VARCHAR(50) DEFAULT 'planned',  -- planned, in_progress, completed, cancelled
  
  -- Results
  findings_count INTEGER DEFAULT 0,
  major_findings INTEGER DEFAULT 0,
  minor_findings INTEGER DEFAULT 0,
  observations INTEGER DEFAULT 0,
  
  overall_rating VARCHAR(50),  -- acceptable, conditional, unacceptable
  score DECIMAL(5,2),
  
  -- Summary
  executive_summary TEXT,
  strengths TEXT,
  weaknesses TEXT,
  recommendations TEXT,
  
  -- Follow-up
  capa_required BOOLEAN DEFAULT FALSE,
  capa_id UUID REFERENCES capas(id),
  next_audit_date DATE,
  
  -- Workflow
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, audit_number)
);

CREATE INDEX IF NOT EXISTS idx_supplier_audits_supplier ON supplier_audits(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_audits_status ON supplier_audits(status);
CREATE INDEX IF NOT EXISTS idx_supplier_audits_date ON supplier_audits(scheduled_date);

-- ============================================================================
-- 4. AUDIT FINDINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES supplier_audits(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  finding_number INTEGER NOT NULL,
  finding_type VARCHAR(50) NOT NULL,  -- major, minor, observation, opportunity
  
  category VARCHAR(100),  -- documentation, process, facility, personnel, equipment
  clause_reference VARCHAR(100),  -- ISO/regulatory clause
  
  description TEXT NOT NULL,
  evidence TEXT,
  
  -- Response
  supplier_response TEXT,
  response_date DATE,
  
  -- Verification
  verification_method TEXT,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  
  status VARCHAR(50) DEFAULT 'open',  -- open, responded, verified, closed
  
  -- Link to CAPA
  capa_id UUID REFERENCES capas(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(audit_id, finding_number)
);

CREATE INDEX IF NOT EXISTS idx_audit_findings_audit ON audit_findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_status ON audit_findings(status);

-- ============================================================================
-- 5. SUPPLIER SCORECARDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Quality Metrics
  quality_score DECIMAL(5,2),
  defect_rate DECIMAL(5,4),
  lot_acceptance_rate DECIMAL(5,2),
  complaints_count INTEGER DEFAULT 0,
  
  -- Delivery Metrics
  delivery_score DECIMAL(5,2),
  on_time_delivery_rate DECIMAL(5,2),
  lead_time_adherence DECIMAL(5,2),
  
  -- Service Metrics
  service_score DECIMAL(5,2),
  responsiveness_score DECIMAL(5,2),
  documentation_score DECIMAL(5,2),
  
  -- Cost Metrics
  cost_score DECIMAL(5,2),
  price_competitiveness DECIMAL(5,2),
  
  -- Overall
  overall_score DECIMAL(5,2),
  grade VARCHAR(10),
  trend VARCHAR(20),  -- improving, stable, declining
  
  -- Notes
  notes TEXT,
  
  calculated_by UUID REFERENCES users(id),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_scorecards_supplier ON supplier_scorecards(supplier_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_period ON supplier_scorecards(period_end);

-- ============================================================================
-- 6. SUPPLIER DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  document_type VARCHAR(100) NOT NULL,  -- certificate, agreement, spec, coa, msds
  document_name VARCHAR(500) NOT NULL,
  
  file_path VARCHAR(1000),
  file_size BIGINT,
  mime_type VARCHAR(255),
  
  -- Validity
  issue_date DATE,
  expiry_date DATE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',  -- active, expired, superseded
  
  -- Verification
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  
  notes TEXT,
  
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_docs_supplier ON supplier_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_docs_expiry ON supplier_documents(expiry_date) WHERE status = 'active';

-- ============================================================================
-- 7. SUPPLIER PERFORMANCE ISSUES
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  issue_number VARCHAR(100) NOT NULL,
  issue_type VARCHAR(100) NOT NULL,  -- quality, delivery, documentation, service
  severity VARCHAR(50),  -- critical, major, minor
  
  description TEXT NOT NULL,
  lot_numbers TEXT[],
  quantity_affected INTEGER,
  
  -- Dates
  identified_date DATE NOT NULL,
  resolved_date DATE,
  
  -- Resolution
  status VARCHAR(50) DEFAULT 'open',  -- open, investigating, resolved, closed
  resolution TEXT,
  
  -- Links
  capa_id UUID REFERENCES capas(id),
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, issue_number)
);

CREATE INDEX IF NOT EXISTS idx_supplier_issues_supplier ON supplier_issues(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_issues_status ON supplier_issues(status);

-- ============================================================================
-- 8. APPROVED SUPPLIER LIST (ASL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS approved_supplier_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- What they're approved for
  material_category VARCHAR(255) NOT NULL,
  material_codes TEXT[],
  
  -- Approval Details
  approval_scope TEXT,
  restrictions TEXT,
  
  -- Dates
  approved_date DATE NOT NULL,
  expiry_date DATE,
  review_date DATE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',  -- active, expired, suspended, removed
  
  -- Approvals
  approved_by UUID REFERENCES users(id),
  signature_id UUID,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, material_category)
);

CREATE INDEX IF NOT EXISTS idx_asl_supplier ON approved_supplier_list(supplier_id);
CREATE INDEX IF NOT EXISTS idx_asl_status ON approved_supplier_list(status);
CREATE INDEX IF NOT EXISTS idx_asl_material ON approved_supplier_list(material_category);


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
    'suppliers', 'supplier_contacts', 'supplier_audits', 'audit_findings',
    'supplier_scorecards', 'supplier_documents', 'supplier_issues', 'approved_supplier_list'
  );
  
  RAISE NOTICE '✅ Phase 18: Created % supplier quality tables', table_count;
END $$;
