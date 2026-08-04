-- ============================================================================
-- Phase 26: Module SSO Launch System
-- ============================================================================
-- This migration has been converted to JavaScript migration file:
-- src/migrations/050_phase26_module_sso_launch_complete.js
-- 
-- This SQL file is kept for reference only and is no longer executed.
-- ============================================================================

/*
-- ============================================================================
-- TABLE 1: tenant_module_access
-- Controls which modules are available to which tenants (Super Admin manages)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_module_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    enabled_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    enabled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    disabled_at TIMESTAMP NULL,
    disabled_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    settings JSONB NULL, -- Tenant-specific module configuration
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one entry per tenant-module pair
    CONSTRAINT uq_tenant_module_access UNIQUE (tenant_id, module_id)
);

-- Indexes for tenant_module_access
CREATE INDEX IF NOT EXISTS idx_tenant_module_access_tenant_id 
    ON tenant_module_access(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_module_access_module_id 
    ON tenant_module_access(module_id);

CREATE INDEX IF NOT EXISTS idx_tenant_module_access_enabled 
    ON tenant_module_access(enabled);

CREATE INDEX IF NOT EXISTS idx_tenant_module_access_tenant_enabled 
    ON tenant_module_access(tenant_id, enabled);

COMMENT ON TABLE tenant_module_access IS 'Controls which modules are enabled for which tenants';
COMMENT ON COLUMN tenant_module_access.settings IS 'Tenant-specific module configuration (JSON)';


-- ============================================================================
-- TABLE 2: module_launch_tokens
-- One-time tokens for secure module SSO launch
-- ============================================================================

CREATE TABLE IF NOT EXISTS module_launch_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256 hash of the launch token
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL, -- Snapshot at launch time
    user_first_name VARCHAR(255) NULL,
    user_last_name VARCHAR(255) NULL,
    is_super_admin BOOLEAN NOT NULL DEFAULT false,
    is_tenant_admin BOOLEAN NOT NULL DEFAULT false,
    ip_address VARCHAR(45) NULL, -- IPv4 or IPv6
    user_agent TEXT NULL,
    expires_at TIMESTAMP NOT NULL, -- Typically 60 seconds from creation
    used_at TIMESTAMP NULL, -- NULL if not yet used
    used_by_ip VARCHAR(45) NULL,
    verification_module_api_key_id UUID NULL, -- API Key used to verify
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for module_launch_tokens
CREATE INDEX IF NOT EXISTS idx_module_launch_tokens_hash 
    ON module_launch_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_module_launch_tokens_user_id 
    ON module_launch_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_module_launch_tokens_module_id 
    ON module_launch_tokens(module_id);

CREATE INDEX IF NOT EXISTS idx_module_launch_tokens_tenant_id 
    ON module_launch_tokens(tenant_id);

CREATE INDEX IF NOT EXISTS idx_module_launch_tokens_expires_at 
    ON module_launch_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_module_launch_tokens_used_at 
    ON module_launch_tokens(used_at);

-- Composite index for verification query
CREATE INDEX IF NOT EXISTS idx_module_launch_tokens_verify 
    ON module_launch_tokens(token_hash, module_id, used_at);

COMMENT ON TABLE module_launch_tokens IS 'One-time tokens for secure module SSO launch';
COMMENT ON COLUMN module_launch_tokens.token_hash IS 'SHA256 hash of the plain launch token';
COMMENT ON COLUMN module_launch_tokens.expires_at IS 'Token expires 60 seconds from creation';
COMMENT ON COLUMN module_launch_tokens.used_at IS 'NULL until token is verified/used';


-- ============================================================================
-- Ensure api_keys has module_id column (from phase25)
-- ============================================================================

ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS module_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_module_id 
    ON api_keys(module_id);

ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS key_prefix VARCHAR(20) NULL;


-- ============================================================================
-- Create default module_user role if not exists
-- ============================================================================

INSERT INTO roles (id, name, code, description, scope, is_system, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Module User',
    'module_user',
    'Default role for module access - grants basic access to assigned modules',
    'TENANT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (code) DO NOTHING;


-- ============================================================================
-- Verify setup
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Phase 26: Module SSO Launch System migration completed';
    RAISE NOTICE '   - tenant_module_access table created';
    RAISE NOTICE '   - module_launch_tokens table created';
    RAISE NOTICE '   - api_keys.module_id column ensured';
    RAISE NOTICE '   - module_user role created';
END $$;
*/