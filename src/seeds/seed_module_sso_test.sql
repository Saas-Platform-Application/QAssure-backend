/* ============================================================================
 * Seed Data for Module SSO Launch Testing
 * ============================================================================
 * 
 * NOTE: This file has been commented out. The SQL content has been moved to:
 * src/scripts/seed-sql.js
 * 
 * To run the seed, use: node src/scripts/seed-sql.js
 * ============================================================================
 */

/*
-- ============================================================================
-- Seed Data for Module SSO Launch Testing
-- ============================================================================

-- 1. Create Super Admin Role
INSERT INTO roles (id, name, code, description, scope, is_system, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Super Admin',
    'super_admin',
    'Platform-level administrator with full access',
    'PLATFORM',
    true,
    NOW(), NOW()
) ON CONFLICT (code) DO NOTHING;

-- 2. Create Tenant Admin Role
INSERT INTO roles (id, name, code, description, scope, is_system, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'Tenant Admin',
    'tenant_admin',
    'Tenant-level administrator',
    'TENANT',
    true,
    NOW(), NOW()
) ON CONFLICT (code) DO NOTHING;

-- 3. Create Quality Analyst Role (Custom Role)
INSERT INTO roles (id, name, code, description, scope, is_system, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000000003',
    'Quality Analyst',
    'quality_analyst',
    'Quality analyst with limited access',
    'TENANT',
    false,
    NOW(), NOW()
) ON CONFLICT (code) DO NOTHING;

-- 4. Create LTTS Super Admin User (password: Admin@123)
INSERT INTO users (id, email, password_hash, first_name, last_name, status, auth_provider, created_at, updated_at)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'superadmin@ltts.com',
    '$2b$10$rQZ5z5z5z5z5z5z5z5z5zOKHqVqVqVqVqVqVqVqVqVqVqVqVqVqVq',
    'LTTS',
    'Super Admin',
    'ACTIVE',
    'LOCAL',
    NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

-- 5. Create Tenant 1: Pharma Corp
INSERT INTO tenants (id, name, slug, status, subscription_tier, max_users, max_modules, created_at, updated_at)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'Pharma Corp',
    'pharma-corp',
    'ACTIVE',
    'enterprise',
    100,
    10,
    NOW(), NOW()
) ON CONFLICT (slug) DO NOTHING;

-- 6. Create Tenant 2: BioTech Inc
INSERT INTO tenants (id, name, slug, status, subscription_tier, max_users, max_modules, created_at, updated_at)
VALUES (
    'c0000000-0000-0000-0000-000000000002',
    'BioTech Inc',
    'biotech-inc',
    'ACTIVE',
    'professional',
    50,
    5,
    NOW(), NOW()
) ON CONFLICT (slug) DO NOTHING;

-- 7. Create Tenant Admin for Pharma Corp (password: Admin@123)
INSERT INTO users (id, email, password_hash, first_name, last_name, status, auth_provider, created_at, updated_at)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'admin@pharmacorp.com',
    '$2b$10$rQZ5z5z5z5z5z5z5z5z5zOKHqVqVqVqVqVqVqVqVqVqVqVqVqVqVq',
    'Pharma',
    'Admin',
    'ACTIVE',
    'LOCAL',
    NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

-- 8. Create Regular User: Sarah (Quality Analyst at Pharma Corp)
INSERT INTO users (id, email, password_hash, first_name, last_name, status, auth_provider, created_at, updated_at)
VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'sarah@pharmacorp.com',
    '$2b$10$rQZ5z5z5z5z5z5z5z5z5zOKHqVqVqVqVqVqVqVqVqVqVqVqVqVqVq',
    'Sarah',
    'Johnson',
    'ACTIVE',
    'LOCAL',
    NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

-- 9. Create Regular User: Bob (No module access)
INSERT INTO users (id, email, password_hash, first_name, last_name, status, auth_provider, created_at, updated_at)
VALUES (
    'b0000000-0000-0000-0000-000000000004',
    'bob@pharmacorp.com',
    '$2b$10$rQZ5z5z5z5z5z5z5z5z5zOKHqVqVqVqVqVqVqVqVqVqVqVqVqVqVq',
    'Bob',
    'Smith',
    'ACTIVE',
    'LOCAL',
    NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

-- 10. Assign Super Admin role to superadmin@ltts.com
INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_by, assigned_at, created_at, updated_at)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    NULL,
    'b0000000-0000-0000-0000-000000000001',
    NOW(), NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- 11. Link Tenant Admin to Pharma Corp tenant
INSERT INTO user_tenants (id, user_id, tenant_id, status, is_primary, joined_at, created_at, updated_at)
VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'ACTIVE',
    true,
    NOW(), NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- 12. Assign Tenant Admin role
INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_by, assigned_at, created_at, updated_at)
VALUES (
    'd0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    NOW(), NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- 13. Link Sarah to Pharma Corp tenant
INSERT INTO user_tenants (id, user_id, tenant_id, status, is_primary, joined_at, created_at, updated_at)
VALUES (
    'e0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000001',
    'ACTIVE',
    true,
    NOW(), NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- 14. Assign Quality Analyst role to Sarah
INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_by, assigned_at, created_at, updated_at)
VALUES (
    'd0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    NOW(), NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- 15. Link Bob to Pharma Corp tenant
INSERT INTO user_tenants (id, user_id, tenant_id, status, is_primary, joined_at, created_at, updated_at)
VALUES (
    'e0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000001',
    'ACTIVE',
    true,
    NOW(), NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- 16. Assign Quality Analyst role to Bob (but NO module access)
INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_by, assigned_at, created_at, updated_at)
VALUES (
    'd0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    NOW(), NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- 17. Register COC Module
INSERT INTO modules (id, module_id, name, description, version, status, runtime_language, framework, base_url, health_endpoint, registered_by, tenant_id, created_at, updated_at)
VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'coc',
    'COC Module',
    'Certificate of Conformity Management',
    '2.1.0',
    'running',
    'nodejs',
    'express',
    'https://coc.ltts.com',
    '/health',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    NOW(), NOW()
) ON CONFLICT (module_id) DO NOTHING;

-- 18. Register AiCE Module
INSERT INTO modules (id, module_id, name, description, version, status, runtime_language, framework, base_url, health_endpoint, registered_by, tenant_id, created_at, updated_at)
VALUES (
    'f0000000-0000-0000-0000-000000000002',
    'aice',
    'AiCE Module',
    'AI Compliance Engine',
    '1.5.0',
    'running',
    'python',
    'fastapi',
    'https://aice.ltts.com',
    '/health',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    NOW(), NOW()
) ON CONFLICT (module_id) DO NOTHING;

-- 19. Create API Key for COC Module (hash of 'test')
INSERT INTO api_keys (id, key_hash, key_prefix, name, description, tenant_id, created_by, status, module_id, created_at, updated_at)
VALUES (
    'g0000000-0000-0000-0000-000000000001',
    '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    'qas_coc_test_',
    'COC Module API Key',
    'API Key for COC module to verify launch tokens',
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'active',
    'f0000000-0000-0000-0000-000000000001',
    NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- 20. Enable COC Module for Pharma Corp
INSERT INTO tenant_module_access (id, tenant_id, module_id, enabled, enabled_by, enabled_at, created_at, updated_at)
VALUES (
    'h0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    true,
    'b0000000-0000-0000-0000-000000000001',
    NOW(), NOW(), NOW()
) ON CONFLICT (tenant_id, module_id) DO NOTHING;

-- 21. Enable AiCE Module for Pharma Corp
INSERT INTO tenant_module_access (id, tenant_id, module_id, enabled, enabled_by, enabled_at, created_at, updated_at)
VALUES (
    'h0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000002',
    true,
    'b0000000-0000-0000-0000-000000000001',
    NOW(), NOW(), NOW()
) ON CONFLICT (tenant_id, module_id) DO NOTHING;

-- 22. Assign Sarah to COC Module ONLY (not AiCE)
INSERT INTO user_roles (id, user_id, role_id, tenant_id, module_id, assigned_by, assigned_at, created_at, updated_at)
SELECT 
    'd0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000003',
    (SELECT id FROM roles WHERE code = 'module_user' LIMIT 1),
    'c0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    NOW(), NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM roles WHERE code = 'module_user')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Summary
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Seed data created successfully!';
    RAISE NOTICE '   Users: superadmin@ltts.com, admin@phaacorp.com, sarah@pharmacorp.com, bob@pharmacorp.com';
    RAISE NOTICE '   Tenants: Pharma Corp, BioTech Inc';
    RAISE NOTICE '   Modules: COC, AiCE (enabled for Pharma Corp)';
END $$;
*/