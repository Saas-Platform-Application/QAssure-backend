-- ============================================================================
-- PHASE 13: Security & FDA 21 CFR Part 11 Compliance
-- ============================================================================
-- Tables:
--   1. electronic_signatures - FDA Part 11 compliant e-signatures
--   2. password_policies - Per-tenant password rules
--   3. password_history - Track password changes (prevent reuse)
--   4. access_reviews - Periodic access certification
--   5. access_review_items - Individual user certifications
--   6. security_settings - Tenant-level security configuration
-- ============================================================================

-- 1. Electronic Signatures Table
-- FDA 21 CFR Part 11 §11.50, §11.70, §11.100
CREATE TABLE IF NOT EXISTS electronic_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who signed
    user_id UUID NOT NULL REFERENCES users(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- What was signed
    resource_type VARCHAR(100) NOT NULL,  -- 'capa', 'change_request', 'document', 'batch_record', 'submission'
    resource_id VARCHAR(255) NOT NULL,     -- ID of the resource being signed
    resource_name VARCHAR(500),            -- Human-readable name
    
    -- Signature details (FDA §11.50 - Signature manifestations)
    action VARCHAR(50) NOT NULL,           -- 'APPROVE', 'REJECT', 'REVIEW', 'AUTHOR', 'VERIFY', 'RELEASE'
    meaning TEXT NOT NULL,                 -- "I have reviewed and approve this document"
    
    -- Authentication method used
    auth_method VARCHAR(50) NOT NULL DEFAULT 'password_pin',  -- 'password_pin', 'password_only', 'biometric', 'sso'
    
    -- Signature hash (non-repudiation)
    signature_hash VARCHAR(512) NOT NULL,  -- SHA-256 hash of: user_id + resource_id + timestamp + meaning
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,                     -- {browser, os, device_type}
    location JSONB,                        -- {country, region, city} if available
    
    -- Timestamps
    signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- For multi-signature workflows
    signature_order INTEGER,               -- 1st, 2nd, 3rd signature in sequence
    required_signatures INTEGER,           -- Total signatures required
    workflow_id UUID,                      -- Groups related signatures
    
    -- Verification
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    invalidated_at TIMESTAMP WITH TIME ZONE,
    invalidated_by UUID REFERENCES users(id),
    invalidation_reason TEXT,
    
    -- Indexes
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for electronic_signatures
CREATE INDEX idx_esig_user ON electronic_signatures(user_id);
CREATE INDEX idx_esig_tenant ON electronic_signatures(tenant_id);
CREATE INDEX idx_esig_resource ON electronic_signatures(resource_type, resource_id);
CREATE INDEX idx_esig_signed_at ON electronic_signatures(signed_at);
CREATE INDEX idx_esig_workflow ON electronic_signatures(workflow_id) WHERE workflow_id IS NOT NULL;
CREATE INDEX idx_esig_action ON electronic_signatures(action);

-- 2. Password Policies Table
-- FDA 21 CFR Part 11 §11.300
CREATE TABLE IF NOT EXISTS password_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Password Complexity
    min_length INTEGER NOT NULL DEFAULT 12,
    max_length INTEGER NOT NULL DEFAULT 128,
    require_uppercase BOOLEAN NOT NULL DEFAULT TRUE,
    require_lowercase BOOLEAN NOT NULL DEFAULT TRUE,
    require_numbers BOOLEAN NOT NULL DEFAULT TRUE,
    require_special_chars BOOLEAN NOT NULL DEFAULT TRUE,
    special_chars_allowed VARCHAR(100) DEFAULT '!@#$%^&*()_+-=[]{}|;:,.<>?',
    
    -- Password History (prevent reuse)
    password_history_count INTEGER NOT NULL DEFAULT 12,  -- Cannot reuse last N passwords
    
    -- Password Expiry
    password_expiry_days INTEGER NOT NULL DEFAULT 90,    -- Force change every N days
    password_expiry_warning_days INTEGER NOT NULL DEFAULT 14,  -- Warn N days before expiry
    
    -- Lockout Policy
    max_failed_attempts INTEGER NOT NULL DEFAULT 5,
    lockout_duration_minutes INTEGER NOT NULL DEFAULT 30,
    
    -- Session Policy
    session_timeout_minutes INTEGER NOT NULL DEFAULT 480,  -- 8 hours
    concurrent_sessions_allowed INTEGER NOT NULL DEFAULT 3,
    
    -- MFA Policy
    mfa_required BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_required_for_roles TEXT[],  -- ['super_admin', 'tenant_admin']
    
    -- Additional restrictions
    prevent_username_in_password BOOLEAN NOT NULL DEFAULT TRUE,
    prevent_common_passwords BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    CONSTRAINT unique_tenant_policy UNIQUE (tenant_id)
);

-- 3. Password History Table
-- Tracks password hashes to prevent reuse
CREATE TABLE IF NOT EXISTS password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    password_hash VARCHAR(255) NOT NULL,
    
    -- When this password was set
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- When it was changed (password was active from created_at to changed_at)
    changed_at TIMESTAMP WITH TIME ZONE,
    
    -- Why it was changed
    change_reason VARCHAR(50),  -- 'user_initiated', 'expired', 'admin_reset', 'security_incident'
    
    -- IP from which password was changed
    changed_from_ip INET
);

-- Index for efficient lookup
CREATE INDEX idx_pwd_history_user ON password_history(user_id, created_at DESC);
CREATE INDEX idx_pwd_history_tenant ON password_history(tenant_id);

-- 4. Access Reviews Table
-- Periodic certification that users still need their access
CREATE TABLE IF NOT EXISTS access_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Review details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    review_type VARCHAR(50) NOT NULL DEFAULT 'periodic',  -- 'periodic', 'triggered', 'certification'
    
    -- Scope
    scope_type VARCHAR(50) NOT NULL DEFAULT 'all_users',  -- 'all_users', 'role', 'department', 'specific_users'
    scope_criteria JSONB,  -- {"roles": ["quality_manager"], "departments": ["QA"]}
    
    -- Schedule
    frequency VARCHAR(50),  -- 'quarterly', 'semi_annual', 'annual'
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- Reviewer
    reviewer_id UUID REFERENCES users(id),  -- Manager who performs review
    reviewer_role VARCHAR(100),  -- Or role-based assignment
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'overdue', 'cancelled'
    
    -- Completion
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),
    
    -- Summary
    total_users INTEGER NOT NULL DEFAULT 0,
    certified_count INTEGER NOT NULL DEFAULT 0,
    revoked_count INTEGER NOT NULL DEFAULT 0,
    pending_count INTEGER NOT NULL DEFAULT 0,
    
    -- Auto-revoke settings
    auto_revoke_on_overdue BOOLEAN NOT NULL DEFAULT FALSE,
    auto_revoke_after_days INTEGER,  -- Days after due_date to auto-revoke
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes for access_reviews
CREATE INDEX idx_access_review_tenant ON access_reviews(tenant_id);
CREATE INDEX idx_access_review_status ON access_reviews(status);
CREATE INDEX idx_access_review_due ON access_reviews(due_date);
CREATE INDEX idx_access_review_reviewer ON access_reviews(reviewer_id);

-- 5. Access Review Items Table
-- Individual user certifications within a review
CREATE TABLE IF NOT EXISTS access_review_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES access_reviews(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- User being reviewed
    user_id UUID NOT NULL REFERENCES users(id),
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    
    -- Current access (snapshot at review creation)
    current_roles TEXT[],
    current_permissions TEXT[],
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Decision
    decision VARCHAR(50),  -- 'CERTIFY', 'REVOKE', 'MODIFY', 'PENDING'
    decision_reason TEXT,
    new_roles TEXT[],      -- If MODIFY, what roles should user have
    
    -- Who made decision
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMP WITH TIME ZONE,
    
    -- Execution
    executed BOOLEAN NOT NULL DEFAULT FALSE,
    executed_at TIMESTAMP WITH TIME ZONE,
    execution_error TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_review_user UNIQUE (review_id, user_id)
);

-- Indexes for access_review_items
CREATE INDEX idx_review_item_review ON access_review_items(review_id);
CREATE INDEX idx_review_item_user ON access_review_items(user_id);
CREATE INDEX idx_review_item_decision ON access_review_items(decision);
CREATE INDEX idx_review_item_pending ON access_review_items(review_id) WHERE decision IS NULL;

-- 6. Security Settings Table
-- Tenant-level security configuration
CREATE TABLE IF NOT EXISTS security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Session Security
    session_timeout_minutes INTEGER NOT NULL DEFAULT 480,
    idle_timeout_minutes INTEGER NOT NULL DEFAULT 30,
    force_single_session BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- IP Restrictions
    ip_whitelist_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ip_whitelist INET[],
    ip_blacklist INET[],
    
    -- Geo Restrictions
    geo_restriction_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_countries VARCHAR(2)[],  -- ISO 3166-1 alpha-2
    
    -- Audit Settings
    audit_retention_years INTEGER NOT NULL DEFAULT 7,  -- FDA requires 7 years
    audit_all_reads BOOLEAN NOT NULL DEFAULT FALSE,    -- Log read operations too
    audit_sensitive_fields TEXT[],  -- Fields that trigger audit on access
    
    -- Electronic Signature Settings
    esig_require_pin BOOLEAN NOT NULL DEFAULT TRUE,
    esig_pin_length INTEGER NOT NULL DEFAULT 4,
    esig_require_reason BOOLEAN NOT NULL DEFAULT TRUE,
    esig_session_timeout_minutes INTEGER NOT NULL DEFAULT 5,  -- Re-auth after N minutes
    
    -- API Security
    api_rate_limit_per_minute INTEGER NOT NULL DEFAULT 100,
    api_key_expiry_days INTEGER,  -- NULL = never expires
    
    -- Notification Settings
    notify_on_failed_login BOOLEAN NOT NULL DEFAULT TRUE,
    notify_on_password_change BOOLEAN NOT NULL DEFAULT TRUE,
    notify_on_new_device BOOLEAN NOT NULL DEFAULT TRUE,
    notify_on_permission_change BOOLEAN NOT NULL DEFAULT TRUE,
    security_contact_email VARCHAR(255),
    
    -- Compliance Mode
    compliance_mode VARCHAR(50) NOT NULL DEFAULT 'fda_part11',  -- 'fda_part11', 'eu_annex11', 'hipaa', 'custom'
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    
    CONSTRAINT unique_tenant_security UNIQUE (tenant_id)
);

-- Add PIN column to users table for electronic signatures
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_pin_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_pin_set_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_check TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default password policy for existing tenants
INSERT INTO password_policies (tenant_id, created_at)
SELECT id, NOW() FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- Insert default security settings for existing tenants
INSERT INTO security_settings (tenant_id, created_at)
SELECT id, NOW() FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE electronic_signatures IS 'FDA 21 CFR Part 11 compliant electronic signatures';
COMMENT ON TABLE password_policies IS 'Per-tenant password complexity and expiry rules (FDA §11.300)';
COMMENT ON TABLE password_history IS 'Password history to prevent reuse';
COMMENT ON TABLE access_reviews IS 'Periodic access certification campaigns';
COMMENT ON TABLE access_review_items IS 'Individual user certifications within access review';
COMMENT ON TABLE security_settings IS 'Tenant-level security configuration';

COMMENT ON COLUMN electronic_signatures.meaning IS 'FDA §11.50 requires signature to indicate meaning (approve, reject, etc.)';
COMMENT ON COLUMN electronic_signatures.signature_hash IS 'Non-repudiation: hash of user+resource+time+meaning';
COMMENT ON COLUMN password_policies.password_history_count IS 'FDA §11.300: Ensure unique identification codes';
