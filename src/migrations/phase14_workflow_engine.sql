-- ============================================================================
-- PHASE 14: Advanced Workflow Engine
-- Core platform service for automated approval routing
-- ============================================================================

-- ============================================================================
-- 1. WORKFLOW DEFINITIONS (Templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code VARCHAR(100) NOT NULL,  -- e.g., 'capa_approval', 'doc_review'
  version INTEGER DEFAULT 1,
  
  -- What this workflow applies to
  entity_type VARCHAR(100) NOT NULL,  -- 'capa', 'document', 'change_request', etc.
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft',  -- draft, active, deprecated, archived
  is_default BOOLEAN DEFAULT FALSE,    -- Default workflow for this entity type
  
  -- Configuration
  config JSONB DEFAULT '{}',  -- Additional settings
  
  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, code, version)
);

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_tenant ON workflow_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_entity ON workflow_definitions(tenant_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_status ON workflow_definitions(status);

-- ============================================================================
-- 2. WORKFLOW STEPS (Steps within a workflow definition)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Step Identity
  step_code VARCHAR(100) NOT NULL,  -- e.g., 'draft', 'review', 'approve'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Step Order
  sequence INTEGER NOT NULL,  -- Order in the workflow
  
  -- Step Type
  step_type VARCHAR(50) DEFAULT 'task',  -- initial, task, approval, parallel, terminal
  
  -- Assignment Rules
  assignee_type VARCHAR(50),  -- 'user', 'role', 'department', 'originator', 'manager'
  assignee_id UUID,           -- Specific user if assignee_type = 'user'
  assignee_role VARCHAR(100), -- Role name if assignee_type = 'role'
  
  -- SLA Configuration
  sla_hours INTEGER,                    -- Hours to complete this step
  sla_warning_hours INTEGER,            -- Hours before due to send warning
  sla_escalation_hours INTEGER,         -- Hours after due to escalate
  escalation_to VARCHAR(50),            -- 'manager', 'role', 'user'
  escalation_role VARCHAR(100),
  escalation_user_id UUID,
  
  -- Requirements
  requires_signature BOOLEAN DEFAULT FALSE,
  requires_comment BOOLEAN DEFAULT FALSE,
  requires_attachment BOOLEAN DEFAULT FALSE,
  
  -- Actions available at this step
  available_actions JSONB DEFAULT '["approve", "reject"]',
  
  -- Form/Fields to show at this step
  form_config JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workflow_definition_id, step_code)
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_definition ON workflow_steps(workflow_definition_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_sequence ON workflow_steps(workflow_definition_id, sequence);

-- ============================================================================
-- 3. WORKFLOW TRANSITIONS (Rules for moving between steps)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- From/To Steps
  from_step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  to_step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  
  -- Transition Details
  action VARCHAR(100) NOT NULL,  -- 'approve', 'reject', 'submit', 'complete', etc.
  name VARCHAR(255),             -- Display name: "Approve and Continue"
  
  -- Conditions (optional)
  condition_expression TEXT,     -- e.g., "record.risk_level == 'high'"
  condition_config JSONB,        -- Structured conditions
  
  -- Requirements
  requires_signature BOOLEAN DEFAULT FALSE,
  requires_comment BOOLEAN DEFAULT FALSE,
  signature_meaning VARCHAR(255),  -- FDA Part 11: meaning of signature
  
  -- Priority (for multiple transitions with same action)
  priority INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_transitions_definition ON workflow_transitions(workflow_definition_id);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_from ON workflow_transitions(from_step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_action ON workflow_transitions(from_step_id, action);

-- ============================================================================
-- 4. WORKFLOW INSTANCES (Running workflows)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(id),
  
  -- What entity this workflow is for
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  entity_name VARCHAR(500),  -- For display: "CAPA-2025-001"
  
  -- Current State
  current_step_id UUID REFERENCES workflow_steps(id),
  status VARCHAR(50) DEFAULT 'active',  -- active, completed, cancelled, suspended
  
  -- Tracking
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT,
  
  -- Context data passed through workflow
  context JSONB DEFAULT '{}',
  
  -- Originator
  started_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_tenant ON workflow_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON workflow_instances(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_current ON workflow_instances(current_step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_definition ON workflow_instances(workflow_definition_id);

-- ============================================================================
-- 5. WORKFLOW TASKS (Assigned work items)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  workflow_step_id UUID NOT NULL REFERENCES workflow_steps(id),
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_role VARCHAR(100),  -- If assigned to a role (any user with role can complete)
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',  -- pending, in_progress, completed, skipped, delegated
  
  -- SLA Tracking
  due_at TIMESTAMPTZ,
  warning_sent_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  escalated_to UUID REFERENCES users(id),
  
  -- Completion
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  action_taken VARCHAR(100),  -- 'approve', 'reject', etc.
  comments TEXT,
  
  -- Delegation
  delegated_from UUID REFERENCES users(id),
  delegation_reason TEXT,
  
  -- Electronic Signature (links to Phase 13)
  signature_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_tenant ON workflow_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_instance ON workflow_tasks(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assignee ON workflow_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_role ON workflow_tasks(assigned_role, status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_due ON workflow_tasks(due_at) WHERE status = 'pending';

-- ============================================================================
-- 6. WORKFLOW HISTORY (Complete audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  
  -- What happened
  event_type VARCHAR(100) NOT NULL,  -- 'started', 'step_completed', 'task_assigned', 'escalated', etc.
  
  -- Step info
  from_step_id UUID REFERENCES workflow_steps(id),
  to_step_id UUID REFERENCES workflow_steps(id),
  from_step_name VARCHAR(255),
  to_step_name VARCHAR(255),
  
  -- Action details
  action VARCHAR(100),
  comments TEXT,
  
  -- Who/When
  performed_by UUID REFERENCES users(id),
  performed_by_name VARCHAR(255),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional data
  metadata JSONB DEFAULT '{}',
  
  -- Signature reference
  signature_id UUID
);

CREATE INDEX IF NOT EXISTS idx_workflow_history_instance ON workflow_history(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_tenant ON workflow_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_date ON workflow_history(performed_at);

-- ============================================================================
-- 7. WORKFLOW DELEGATES (Out of Office / Delegation Rules)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_delegates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Who is delegating
  delegator_id UUID NOT NULL REFERENCES users(id),
  
  -- Who receives the delegation
  delegate_id UUID NOT NULL REFERENCES users(id),
  
  -- Scope
  workflow_definition_id UUID REFERENCES workflow_definitions(id),  -- NULL = all workflows
  entity_type VARCHAR(100),  -- NULL = all entity types
  
  -- Time period
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,  -- NULL = indefinite
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  reason TEXT,  -- 'Vacation', 'Medical Leave', etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_delegates_delegator ON workflow_delegates(delegator_id, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_delegates_delegate ON workflow_delegates(delegate_id, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_delegates_active ON workflow_delegates(is_active, starts_at, ends_at);


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
    'workflow_definitions', 'workflow_steps', 'workflow_transitions',
    'workflow_instances', 'workflow_tasks', 'workflow_history', 'workflow_delegates'
  );
  
  RAISE NOTICE '✅ Phase 14: Created % workflow tables', table_count;
END $$;
