-- =====================================================
-- Phase 24: License & Billing Service
-- QAssure Platform - Based on Architecture Document Section 7
-- =====================================================

-- =====================================================
-- PART 1: REFERENCE TABLES
-- =====================================================

-- 1. License Types Reference Table
CREATE TABLE IF NOT EXISTS license_types (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO license_types (code, name, description) VALUES
('subscription', 'Subscription', 'Time-based access (monthly/annual) with automatic renewal'),
('perpetual', 'Perpetual', 'One-time purchase with optional maintenance'),
('trial', 'Trial', 'Time-limited full-feature access for evaluation'),
('freemium', 'Freemium', 'Limited features with upgrade path'),
('enterprise', 'Enterprise', 'Custom terms with dedicated support')
ON CONFLICT (code) DO NOTHING;

-- 2. License Tiers Reference Table
CREATE TABLE IF NOT EXISTS license_tiers (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    max_users INTEGER,
    max_projects INTEGER,
    max_ai_tokens INTEGER,
    max_storage_gb INTEGER,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO license_tiers (code, name, description, max_users, max_projects, max_ai_tokens, max_storage_gb, features, sort_order) VALUES
('starter', 'Starter', 'Core features only - Small teams', 5, 1, 1000, 10, '["core"]', 1),
('professional', 'Professional', 'Core + Advanced features - Growing companies', 25, 10, 10000, 100, '["core", "advanced"]', 2),
('enterprise', 'Enterprise', 'All features + Premium support - Large enterprises', -1, -1, 100000, 500, '["core", "advanced", "premium", "ai_unlimited"]', 3),
('custom', 'Custom', 'Tailored feature set - Strategic accounts', -1, -1, -1, -1, '["core", "advanced", "premium", "ai_unlimited", "custom"]', 4)
ON CONFLICT (code) DO NOTHING;

-- 3. Application Types (modules that can be licensed)
CREATE TABLE IF NOT EXISTS licensable_applications (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    requires_platform BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO licensable_applications (code, name, description, requires_platform, sort_order) VALUES
('platform', 'QAssure Platform', 'Base platform - required for all modules', false, 0),
('aice', 'AiCE', 'AI-assisted Clinical Evaluation - CER generation', true, 1),
('aich', 'AiCH', 'AI-assisted Complaints Handling', true, 2),
('dhf', 'DHF', 'Design History File management', true, 3),
('sqm', 'SQM', 'Supplier Quality Management', true, 4),
('pms', 'PMS', 'Post-Market Surveillance', true, 5)
ON CONFLICT (code) DO NOTHING;


-- =====================================================
-- PART 2: MAIN LICENSES TABLE
-- =====================================================

-- 4. Main Licenses Table
CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- License identification
    license_key VARCHAR(100) UNIQUE NOT NULL,
    license_type VARCHAR(50) NOT NULL REFERENCES license_types(code),
    tier VARCHAR(50) NOT NULL REFERENCES license_tiers(code),
    
    -- Application/Module licensing
    application VARCHAR(50) NOT NULL REFERENCES licensable_applications(code),
    
    -- Status and lifecycle
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- pending, active, warning, grace, suspended, revoked, expired
    
    activation_state VARCHAR(30) DEFAULT 'not_activated',
    -- not_activated, pending_activation, activated, deactivated
    
    -- Validity period
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    grace_period_days INTEGER DEFAULT 30,
    grace_ends_at TIMESTAMPTZ,
    
    -- Limits (from tier or custom override)
    limits JSONB DEFAULT '{}',
    -- {max_users, max_projects, max_ai_tokens, max_storage_gb, max_api_calls}
    
    -- Features enabled
    features JSONB DEFAULT '[]',
    
    -- Renewal settings
    auto_renew BOOLEAN DEFAULT false,
    renewal_period_months INTEGER DEFAULT 12,
    next_renewal_date TIMESTAMPTZ,
    
    -- Pricing (for record keeping)
    base_price DECIMAL(12, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle VARCHAR(20) DEFAULT 'annual',
    
    -- Notes
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    revoked_by UUID REFERENCES users(id),
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_license_status CHECK (status IN ('pending', 'active', 'warning', 'grace', 'suspended', 'revoked', 'expired')),
    CONSTRAINT valid_activation_state CHECK (activation_state IN ('not_activated', 'pending_activation', 'activated', 'deactivated'))
);

CREATE INDEX IF NOT EXISTS idx_licenses_tenant ON licenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_application ON licenses(application);
CREATE INDEX IF NOT EXISTS idx_licenses_expires ON licenses(expires_at);
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);


-- =====================================================
-- PART 3: LICENSE ACTIVATIONS & USAGE TRACKING
-- =====================================================

-- 5. License Activations History
CREATE TABLE IF NOT EXISTS license_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Activation details
    activation_method VARCHAR(50) NOT NULL,
    -- online, offline, auto, manual
    
    activation_status VARCHAR(30) NOT NULL,
    -- success, failed, pending
    
    -- Device/Instance info
    instance_id VARCHAR(255),
    device_fingerprint VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    deactivated_at TIMESTAMPTZ,
    
    -- Error tracking
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Audit
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_activations_license ON license_activations(license_id);
CREATE INDEX IF NOT EXISTS idx_license_activations_tenant ON license_activations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_license_activations_status ON license_activations(activation_status);

-- 6. License Usage Tracking (Monthly Snapshots)
CREATE TABLE IF NOT EXISTS license_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Usage period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Usage metrics
    users_count INTEGER DEFAULT 0,
    projects_count INTEGER DEFAULT 0,
    ai_tokens_used INTEGER DEFAULT 0,
    storage_used_gb DECIMAL(10, 2) DEFAULT 0,
    api_calls_count INTEGER DEFAULT 0,
    documents_count INTEGER DEFAULT 0,
    
    -- Limit tracking
    users_limit_percent DECIMAL(5, 2) DEFAULT 0,
    ai_tokens_limit_percent DECIMAL(5, 2) DEFAULT 0,
    storage_limit_percent DECIMAL(5, 2) DEFAULT 0,
    
    -- Alerts triggered
    soft_limit_reached BOOLEAN DEFAULT false,
    hard_limit_reached BOOLEAN DEFAULT false,
    
    -- Timestamps
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(license_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_license_usage_license ON license_usage(license_id);
CREATE INDEX IF NOT EXISTS idx_license_usage_tenant ON license_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_license_usage_period ON license_usage(period_start, period_end);

-- 7. Real-time Usage Counters (Updated frequently)
CREATE TABLE IF NOT EXISTS license_usage_current (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE UNIQUE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Current counts
    current_users INTEGER DEFAULT 0,
    current_projects INTEGER DEFAULT 0,
    current_ai_tokens_used INTEGER DEFAULT 0,
    current_storage_gb DECIMAL(10, 2) DEFAULT 0,
    current_api_calls INTEGER DEFAULT 0,
    
    -- Period info
    period_start TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', NOW()),
    period_resets_at TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
    
    -- Last updated
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_usage_current_license ON license_usage_current(license_id);
CREATE INDEX IF NOT EXISTS idx_license_usage_current_tenant ON license_usage_current(tenant_id);


-- =====================================================
-- PART 4: LICENSE AUDIT LOG (IMMUTABLE)
-- =====================================================

-- 8. License Audit Log
CREATE TABLE IF NOT EXISTS license_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL,
    -- created, activated, deactivated, renewed, upgraded, downgraded, 
    -- suspended, revoked, expired, reactivated, limits_updated, extended
    
    event_description TEXT,
    
    -- State changes
    previous_state JSONB,
    new_state JSONB,
    
    -- Audit chain (for tamper detection)
    previous_hash VARCHAR(64),
    event_hash VARCHAR(64),
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Actor
    performed_by UUID,
    performed_by_email VARCHAR(255),
    performed_by_role VARCHAR(100),
    
    -- Timestamp (immutable)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_license_audit_license ON license_audit_log(license_id);
CREATE INDEX IF NOT EXISTS idx_license_audit_tenant ON license_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_license_audit_event ON license_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_license_audit_created ON license_audit_log(created_at);

-- =====================================================
-- PART 5: BILLING TABLES (MANUAL/INVOICE BASED)
-- =====================================================

-- 9. Pricing Plans
CREATE TABLE IF NOT EXISTS pricing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Plan identification
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Linked to license tier and application
    license_tier VARCHAR(50) REFERENCES license_tiers(code),
    application VARCHAR(50) NOT NULL REFERENCES licensable_applications(code),
    
    -- Pricing
    base_price DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle VARCHAR(20) DEFAULT 'annual',
    -- monthly, annual
    
    -- What's included
    features JSONB DEFAULT '[]',
    limits JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_plans_application ON pricing_plans(application);
CREATE INDEX IF NOT EXISTS idx_pricing_plans_tier ON pricing_plans(license_tier);
CREATE INDEX IF NOT EXISTS idx_pricing_plans_active ON pricing_plans(is_active);

-- Insert default pricing plans
INSERT INTO pricing_plans (code, name, application, license_tier, base_price, billing_cycle, features, limits) VALUES
-- Platform plans
('platform-starter-monthly', 'Platform Starter Monthly', 'platform', 'starter', 99.00, 'monthly', '["core"]', '{"max_users": 5, "max_projects": 1}'),
('platform-starter-annual', 'Platform Starter Annual', 'platform', 'starter', 990.00, 'annual', '["core"]', '{"max_users": 5, "max_projects": 1}'),
('platform-professional-monthly', 'Platform Professional Monthly', 'platform', 'professional', 299.00, 'monthly', '["core", "advanced"]', '{"max_users": 25, "max_projects": 10}'),
('platform-professional-annual', 'Platform Professional Annual', 'platform', 'professional', 2990.00, 'annual', '["core", "advanced"]', '{"max_users": 25, "max_projects": 10}'),
('platform-enterprise-annual', 'Platform Enterprise Annual', 'platform', 'enterprise', 9990.00, 'annual', '["core", "advanced", "premium"]', '{"max_users": -1, "max_projects": -1}'),
-- AiCE plans
('aice-starter-monthly', 'AiCE Starter Monthly', 'aice', 'starter', 199.00, 'monthly', '["cer_generation", "literature_search"]', '{"max_ai_tokens": 1000}'),
('aice-starter-annual', 'AiCE Starter Annual', 'aice', 'starter', 1990.00, 'annual', '["cer_generation", "literature_search"]', '{"max_ai_tokens": 1000}'),
('aice-professional-monthly', 'AiCE Professional Monthly', 'aice', 'professional', 499.00, 'monthly', '["cer_generation", "literature_search", "meta_analysis"]', '{"max_ai_tokens": 10000}'),
('aice-professional-annual', 'AiCE Professional Annual', 'aice', 'professional', 4990.00, 'annual', '["cer_generation", "literature_search", "meta_analysis"]', '{"max_ai_tokens": 10000}'),
('aice-enterprise-annual', 'AiCE Enterprise Annual', 'aice', 'enterprise', 14990.00, 'annual', '["cer_generation", "literature_search", "meta_analysis", "regulatory_submission"]', '{"max_ai_tokens": 100000}')
ON CONFLICT (code) DO NOTHING;


-- =====================================================
-- PART 6: INVOICES & PAYMENTS
-- =====================================================

-- 10. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    license_id UUID REFERENCES licenses(id),
    
    -- Invoice identification
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    -- draft, sent, paid, void, overdue
    
    -- Dates
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    
    -- Billing period
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    -- Amounts
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    discount_reason VARCHAR(255),
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(12, 2) DEFAULT 0,
    amount_due DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Customer info snapshot
    billing_name VARCHAR(255),
    billing_email VARCHAR(255),
    billing_address JSONB,
    
    -- Notes
    notes TEXT,
    terms TEXT,
    
    -- PDF storage
    pdf_url TEXT,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_invoice_status CHECK (status IN ('draft', 'sent', 'paid', 'void', 'overdue'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_license ON invoices(license_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);

-- 11. Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Item details
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    
    -- Period (for subscription items)
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    -- References
    pricing_plan_id UUID REFERENCES pricing_plans(id),
    license_id UUID REFERENCES licenses(id),
    
    -- Type
    item_type VARCHAR(30) DEFAULT 'license',
    -- license, usage_overage, setup_fee, discount, credit
    
    -- Order
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_line_items(invoice_id);

-- 12. Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id),
    
    -- Payment identification
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Amount
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- pending, completed, failed, refunded, cancelled
    
    -- Payment method
    payment_method VARCHAR(50) NOT NULL,
    -- bank_transfer, check, wire, credit_card, other
    
    -- Payment details
    reference_number VARCHAR(255),
    bank_name VARCHAR(255),
    transaction_date TIMESTAMPTZ,
    
    -- Notes
    notes TEXT,
    
    -- Refund info
    refunded_amount DECIMAL(12, 2) DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,
    
    -- Receipt
    receipt_number VARCHAR(100),
    receipt_url TEXT,
    
    -- Audit
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);


-- =====================================================
-- PART 7: RENEWAL MANAGEMENT
-- =====================================================

-- 13. Renewal Notifications
CREATE TABLE IF NOT EXISTS renewal_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Notification details
    notification_type VARCHAR(50) NOT NULL,
    -- reminder_60d, reminder_30d, reminder_14d, reminder_7d, 
    -- expiry_notice, grace_warning, suspension_notice
    
    days_before_expiry INTEGER,
    
    -- Delivery
    channel VARCHAR(30) NOT NULL DEFAULT 'email',
    -- email, in_app, both
    
    sent_at TIMESTAMPTZ,
    delivered BOOLEAN DEFAULT false,
    
    -- Content
    subject VARCHAR(255),
    
    -- Recipient
    recipient_email VARCHAR(255),
    recipient_user_id UUID REFERENCES users(id),
    
    -- Timestamps
    scheduled_for TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renewal_notifications_license ON renewal_notifications(license_id);
CREATE INDEX IF NOT EXISTS idx_renewal_notifications_scheduled ON renewal_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_renewal_notifications_sent ON renewal_notifications(sent_at);

-- 14. Renewal History
CREATE TABLE IF NOT EXISTS renewal_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Renewal details
    renewal_type VARCHAR(30) NOT NULL,
    -- manual, auto, upgrade, downgrade, extension
    
    status VARCHAR(30) NOT NULL,
    -- initiated, pending_payment, completed, failed, cancelled
    
    -- Dates
    previous_expires_at TIMESTAMPTZ NOT NULL,
    new_expires_at TIMESTAMPTZ,
    
    -- Tier changes
    previous_tier VARCHAR(50),
    new_tier VARCHAR(50),
    
    -- Payment reference
    invoice_id UUID REFERENCES invoices(id),
    payment_id UUID REFERENCES payments(id),
    amount DECIMAL(12, 2),
    
    -- Timestamps
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Actor
    initiated_by UUID REFERENCES users(id),
    
    -- Notes
    notes TEXT,
    
    CONSTRAINT valid_renewal_status CHECK (status IN ('initiated', 'pending_payment', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_renewal_history_license ON renewal_history(license_id);
CREATE INDEX IF NOT EXISTS idx_renewal_history_tenant ON renewal_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_renewal_history_status ON renewal_history(status);

-- =====================================================
-- PART 8: PERMISSIONS
-- =====================================================

-- Add permissions for License & Billing (Super Admin only for management)
INSERT INTO permissions (role_id, resource, action) 
SELECT r.id, p.resource, p.action
FROM roles r
CROSS JOIN (
    VALUES 
    -- Super Admin - full license & billing management
    ('Super Admin', 'licenses', 'read'),
    ('Super Admin', 'licenses', 'write'),
    ('Super Admin', 'licenses', 'delete'),
    ('Super Admin', 'licenses', 'activate'),
    ('Super Admin', 'licenses', 'revoke'),
    ('Super Admin', 'billing', 'read'),
    ('Super Admin', 'billing', 'write'),
    ('Super Admin', 'invoices', 'read'),
    ('Super Admin', 'invoices', 'write'),
    ('Super Admin', 'invoices', 'delete'),
    ('Super Admin', 'payments', 'read'),
    ('Super Admin', 'payments', 'write'),
    ('Super Admin', 'pricing_plans', 'read'),
    ('Super Admin', 'pricing_plans', 'write'),
    ('Super Admin', 'usage', 'read'),
    
    -- Tenant Admin - view own tenant's license & billing
    ('Tenant Admin', 'licenses', 'read'),
    ('Tenant Admin', 'licenses', 'activate'),
    ('Tenant Admin', 'billing', 'read'),
    ('Tenant Admin', 'invoices', 'read'),
    ('Tenant Admin', 'payments', 'read'),
    ('Tenant Admin', 'usage', 'read'),
    
    -- Quality Manager - view only
    ('Quality Manager', 'licenses', 'read'),
    ('Quality Manager', 'usage', 'read')
) AS p(role_name, resource, action)
WHERE r.name = p.role_name
ON CONFLICT DO NOTHING;


-- =====================================================
-- PART 9: HELPER FUNCTIONS & SEQUENCES
-- =====================================================

-- Sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

-- Sequence for payment numbers
CREATE SEQUENCE IF NOT EXISTS payment_number_seq START 1000;

-- Function to generate license key
CREATE OR REPLACE FUNCTION generate_license_key(
    p_application VARCHAR,
    p_tier VARCHAR,
    p_tenant_id UUID
) RETURNS VARCHAR AS $$
DECLARE
    v_tenant_hash VARCHAR;
    v_timestamp VARCHAR;
    v_random VARCHAR;
    v_checksum VARCHAR;
BEGIN
    -- Create tenant hash (first 8 chars of MD5)
    v_tenant_hash := UPPER(SUBSTRING(MD5(p_tenant_id::TEXT) FROM 1 FOR 8));
    
    -- Timestamp (YYYYMMDD)
    v_timestamp := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Random component
    v_random := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- Build key: QASSURE-{APP}-{TIER}-{HASH}-{TIMESTAMP}-{RANDOM}
    RETURN 'QASSURE-' || UPPER(p_application) || '-' || UPPER(SUBSTRING(p_tier FROM 1 FOR 3)) || '-' || 
           v_tenant_hash || '-' || v_timestamp || '-' || v_random;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number() RETURNS VARCHAR AS $$
BEGIN
    RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('invoice_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate payment number
CREATE OR REPLACE FUNCTION generate_payment_number() RETURNS VARCHAR AS $$
BEGIN
    RETURN 'PAY-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('payment_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to check if license is valid
CREATE OR REPLACE FUNCTION is_license_valid(p_license_id UUID) RETURNS BOOLEAN AS $$
DECLARE
    v_license RECORD;
BEGIN
    SELECT status, expires_at, grace_ends_at INTO v_license
    FROM licenses WHERE id = p_license_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check status
    IF v_license.status IN ('revoked', 'expired') THEN
        RETURN FALSE;
    END IF;
    
    -- Check if within valid period or grace period
    IF v_license.status = 'active' AND (v_license.expires_at IS NULL OR v_license.expires_at > NOW()) THEN
        RETURN TRUE;
    END IF;
    
    IF v_license.status = 'grace' AND v_license.grace_ends_at > NOW() THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to get license enforcement level
CREATE OR REPLACE FUNCTION get_license_enforcement_level(p_license_id UUID) 
RETURNS VARCHAR AS $$
DECLARE
    v_license RECORD;
    v_days_to_expiry INTEGER;
BEGIN
    SELECT status, expires_at, grace_ends_at INTO v_license
    FROM licenses WHERE id = p_license_id;
    
    IF NOT FOUND THEN
        RETURN 'revoked';
    END IF;
    
    -- Direct status mapping
    IF v_license.status = 'revoked' THEN RETURN 'revoked'; END IF;
    IF v_license.status = 'expired' THEN RETURN 'revoked'; END IF;
    IF v_license.status = 'suspended' THEN RETURN 'suspended'; END IF;
    IF v_license.status = 'grace' THEN RETURN 'grace'; END IF;
    
    -- Check warning period (30 days before expiry)
    IF v_license.expires_at IS NOT NULL THEN
        v_days_to_expiry := EXTRACT(DAY FROM (v_license.expires_at - NOW()));
        IF v_days_to_expiry <= 30 AND v_days_to_expiry > 0 THEN
            RETURN 'warning';
        END IF;
    END IF;
    
    IF v_license.status = 'active' THEN RETURN 'active'; END IF;
    
    RETURN 'pending';
END;
$$ LANGUAGE plpgsql;

-- Trigger to update license status based on dates
CREATE OR REPLACE FUNCTION update_license_status() RETURNS TRIGGER AS $$
BEGIN
    -- Update status based on dates
    IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() THEN
        IF NEW.grace_ends_at IS NOT NULL AND NEW.grace_ends_at > NOW() THEN
            NEW.status := 'grace';
        ELSIF NEW.grace_ends_at IS NOT NULL AND NEW.grace_ends_at < NOW() THEN
            NEW.status := 'suspended';
        ELSE
            NEW.status := 'expired';
        END IF;
    END IF;
    
    -- Set grace_ends_at if not set
    IF NEW.expires_at IS NOT NULL AND NEW.grace_ends_at IS NULL THEN
        NEW.grace_ends_at := NEW.expires_at + (NEW.grace_period_days || ' days')::INTERVAL;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_license_status_update
    BEFORE UPDATE ON licenses
    FOR EACH ROW
    EXECUTE FUNCTION update_license_status();

