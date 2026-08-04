/**
 * Execute SQL seed for Module SSO Launch Testing
 * Usage: node src/scripts/seed-sql.js
 * 
 * This file contains the seed SQL embedded directly.
 * Original SQL file: src/seeds/seed_module_sso_test.sql (commented out)
 */
const database = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Generate password hash (password: Admin@123)
async function getPasswordHash() {
  return await bcrypt.hash('Admin@123', 12);
}

// Hash API key using SHA256 (same as ApiKeyService)
function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Seed SQL for Module SSO Launch Testing
// Note: password_hash and api_key_hash will be injected via template literal
function getSeedSQL(passwordHash, apiKeyHash) {
  return `
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
) ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    scope = EXCLUDED.scope,
    is_system = EXCLUDED.is_system,
    updated_at = NOW();

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
) ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    scope = EXCLUDED.scope,
    is_system = EXCLUDED.is_system,
    updated_at = NOW();

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
) ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    scope = EXCLUDED.scope,
    is_system = EXCLUDED.is_system,
    updated_at = NOW();

-- 4. Create LTTS Super Admin User (password: Admin@123)
INSERT INTO users (id, email, password_hash, first_name, last_name, status, auth_provider, created_at, updated_at)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'superadmin@ltts.com',
    '${passwordHash}',
    'LTTS',
    'Super Admin',
    'active',
    'local',
    NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

-- 5. Create Tenant 1: Pharma Corp
INSERT INTO tenants (id, name, slug, status, subscription_tier, max_users, max_modules, domain, logo_file_path, favicon_file_path, primary_color, secondary_color, accent_color, created_at, updated_at)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'Pharma Corp',
    'pharma-corp',
    'active',
    'enterprise',
    100,
    10,
    'qasure.tech4bizsolutions.com',
    '/uploads/logo.png',
    '/uploads/favicon.ico',
    '#1976d2',
    '#dc004e',
    '#ff9800',
    NOW(), NOW()
) ON CONFLICT (slug) DO UPDATE SET 
    domain = EXCLUDED.domain,
    logo_file_path = EXCLUDED.logo_file_path,
    favicon_file_path = EXCLUDED.favicon_file_path,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    accent_color = EXCLUDED.accent_color,
    updated_at = NOW();

-- 6. Create Tenant 2: BioTech Inc
INSERT INTO tenants (id, name, slug, status, subscription_tier, max_users, max_modules, created_at, updated_at)
VALUES (
    'c0000000-0000-0000-0000-000000000002',
    'BioTech Inc',
    'biotech-inc',
    'active',
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
    '${passwordHash}',
    'Pharma',
    'Admin',
    'active',
    'local',
    NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

-- 8. Create Regular User: Sarah (Quality Analyst at Pharma Corp)
INSERT INTO users (id, email, password_hash, first_name, last_name, status, auth_provider, created_at, updated_at)
VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'sarah@pharmacorp.com',
    '${passwordHash}',
    'Sarah',
    'Johnson',
    'active',
    'local',
    NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

-- 9. Create Regular User: Bob (No module access)
INSERT INTO users (id, email, password_hash, first_name, last_name, status, auth_provider, created_at, updated_at)
VALUES (
    'b0000000-0000-0000-0000-000000000004',
    'bob@pharmacorp.com',
    '${passwordHash}',
    'Bob',
    'Smith',
    'active',
    'local',
    NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

-- 10. Assign Super Admin role to superadmin@ltts.com
INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_by, assigned_at, created_at, updated_at)
SELECT 
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    (SELECT id FROM roles WHERE code = 'super_admin' LIMIT 1),
    NULL,
    'b0000000-0000-0000-0000-000000000001',
    NOW(), NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM roles WHERE code = 'super_admin')
ON CONFLICT DO NOTHING;

-- 11. Link Tenant Admin to Pharma Corp tenant
INSERT INTO user_tenants (id, user_id, tenant_id, status, is_primary, joined_at, created_at, updated_at)
VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'active',
    true,
    NOW(), NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- 12. Assign Tenant Admin role
INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_by, assigned_at, created_at, updated_at)
SELECT 
    'd0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    (SELECT id FROM roles WHERE code = 'tenant_admin' LIMIT 1),
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    NOW(), NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM roles WHERE code = 'tenant_admin')
ON CONFLICT DO NOTHING;

-- 13. Link Sarah to Pharma Corp tenant
INSERT INTO user_tenants (id, user_id, tenant_id, status, is_primary, joined_at, created_at, updated_at)
VALUES (
    'e0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000001',
    'active',
    true,
    NOW(), NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- 14. Assign Quality Analyst role to Sarah
INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_by, assigned_at, created_at, updated_at)
SELECT 
    'd0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    (SELECT id FROM roles WHERE code = 'quality_analyst' LIMIT 1),
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    NOW(), NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM roles WHERE code = 'quality_analyst')
ON CONFLICT DO NOTHING;

-- 15. Link Bob to Pharma Corp tenant
INSERT INTO user_tenants (id, user_id, tenant_id, status, is_primary, joined_at, created_at, updated_at)
VALUES (
    'e0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000001',
    'active',
    true,
    NOW(), NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- 16. Assign Quality Analyst role to Bob (but NO module access)
INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_by, assigned_at, created_at, updated_at)
SELECT 
    'd0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000004',
    (SELECT id FROM roles WHERE code = 'quality_analyst' LIMIT 1),
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    NOW(), NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM roles WHERE code = 'quality_analyst')
ON CONFLICT DO NOTHING;

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

-- 19. Create API Key for COC Module
INSERT INTO api_keys (id, key_hash, key_prefix, name, description, tenant_id, created_by, status, module_id, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000000010',
    '${apiKeyHash}',
    'qas_testkey1',
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
    'a0000000-0000-0000-0000-000000000011',
    'c0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    true,
    'b0000000-0000-0000-0000-000000000001',
    NOW(), NOW(), NOW()
) ON CONFLICT (tenant_id, module_id) DO NOTHING;

-- 21. Enable AiCE Module for Pharma Corp
INSERT INTO tenant_module_access (id, tenant_id, module_id, enabled, enabled_by, enabled_at, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000000012',
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
`;
}

// Cleanup SQL to drop seed data (in reverse order to respect foreign keys)
function getCleanupSQL() {
  return `
-- ============================================================================
-- Cleanup Seed Data for Module SSO Launch Testing
-- ============================================================================

-- Delete in reverse order to respect foreign key constraints

-- 1. Delete user roles (module assignments)
DELETE FROM user_roles WHERE id IN (
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000005'
);

-- 2. Delete user tenants
DELETE FROM user_tenants WHERE id IN (
    'e0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000003'
);

-- 3. Delete tenant module access
DELETE FROM tenant_module_access WHERE id IN (
    'a0000000-0000-0000-0000-000000000011',
    'a0000000-0000-0000-0000-000000000012'
);

-- 4. Delete API keys
DELETE FROM api_keys WHERE id = 'a0000000-0000-0000-0000-000000000010';

-- 5. Delete modules
DELETE FROM modules WHERE module_id IN ('coc', 'aice');

-- 6. Delete users
DELETE FROM users WHERE email IN (
    'superadmin@ltts.com',
    'admin@pharmacorp.com',
    'sarah@pharmacorp.com',
    'bob@pharmacorp.com'
);

-- 7. Delete tenants
DELETE FROM tenants WHERE slug IN ('pharma-corp', 'biotech-inc');

-- 8. Delete roles (only if they're not used elsewhere)
-- Note: We use ON CONFLICT DO NOTHING in seed, so these might be system roles
-- Only delete if they were created by this seed
DELETE FROM roles WHERE code IN ('super_admin', 'tenant_admin', 'quality_analyst')
    AND id IN (
        'a0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000003'
    )
    AND NOT EXISTS (
        SELECT 1 FROM user_roles ur WHERE ur.role_id = roles.id
    );

-- ============================================================================
-- Cleanup Summary
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Seed data cleanup completed!';
END $$;
`;
}

async function cleanupSeedData() {
  console.log('🧹 Cleaning up existing seed data...\n');

  try {
    const cleanupSQL = getCleanupSQL();
    await database.query(cleanupSQL);
    console.log('✅ Seed data cleanup completed successfully\n');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error(error);
    throw error;
  }
}

async function seedModuleSSO(shouldCleanup = false) {
  console.log('🌱 Starting Module SSO Launch seed data...\n');

  try {
    // Test connection
    await database.testConnection();

    // Cleanup existing seed data if requested
    if (shouldCleanup) {
      await cleanupSeedData();
    }

    // Generate password hash
    const passwordHash = await getPasswordHash();
    console.log('✅ Password hash generated');

    // Generate API key hash
    const apiKey = 'qas_testkey1234567890abcdef1234567890abcdef1234567890abcdef12345678';
    const apiKeyHash = hashApiKey(apiKey);
    console.log('✅ API key hash generated');
    console.log(`   API Key: ${apiKey}`);
    console.log(`   Key Hash: ${apiKeyHash}`);

    // Get SQL with password hash and API key hash injected
    const seedSQL = getSeedSQL(passwordHash, apiKeyHash);

    // Execute SQL seed
    await database.query(seedSQL);
    console.log('✅ SQL statements executed successfully');
    console.log('✅ Seed data created successfully!\n');
    console.log('📋 Summary:');
    console.log('   Users: superadmin@ltts.com, admin@pharmacorp.com, sarah@pharmacorp.com, bob@pharmacorp.com');
    console.log('   Tenants: Pharma Corp, BioTech Inc');
    console.log('   Modules: COC, AiCE (enabled for Pharma Corp)\n');
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await database.close();
    process.exit(0);
  }
}

// Check command line arguments
const shouldCleanup = process.argv.includes('--cleanup') || process.argv.includes('--drop');

// Run the seed
seedModuleSSO(shouldCleanup);
