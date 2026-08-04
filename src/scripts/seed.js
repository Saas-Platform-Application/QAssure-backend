/**
 * Database Seed Script - QAssure Platform
 * Usage: node src/scripts/seed.js
 */
const database = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Test connection
    await database.testConnection();

    // 1. Create tenant
    const tenantId = '00000000-0000-0000-0000-000000000001';
    await database.query(`
      INSERT INTO tenants (id, name, slug, status, subscription_tier, settings, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
    `, [tenantId, 'QAssure Demo', 'qassure-demo', 'active', 'enterprise', JSON.stringify({ qms_integration: true, ai_gateway: true })]);
    console.log('✅ Tenant created');

    // 2. Create roles
    const roles = [
      { id: uuidv4(), name: 'Super Admin', code: 'super_admin', scope: 'platform', is_system: true },
      { id: uuidv4(), name: 'Tenant Admin', code: 'tenant_admin', scope: 'tenant', is_system: true },
      { id: uuidv4(), name: 'Quality Manager', code: 'quality_manager', scope: 'tenant', is_system: false },
      { id: uuidv4(), name: 'Viewer', code: 'viewer', scope: 'tenant', is_system: false }
    ];

    for (const role of roles) {
      await database.query(`
        INSERT INTO roles (id, name, code, scope, is_system, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [role.id, role.name, role.code, role.scope, role.is_system]);
    }
    console.log('✅ Roles created:', roles.length);

    // Get role IDs
    const roleResult = await database.query(`SELECT id, code FROM roles WHERE code IN ('super_admin', 'tenant_admin', 'quality_manager', 'viewer')`);
    const roleMap = {};
    roleResult.rows.forEach(r => roleMap[r.code] = r.id);

    // 3. Create permissions for each role
    const permissions = [
      // Super Admin - all access
      { role: 'super_admin', resource: '*', action: '*' },
      // Tenant Admin
      { role: 'tenant_admin', resource: 'users', action: '*' },
      { role: 'tenant_admin', resource: 'roles', action: '*' },
      { role: 'tenant_admin', resource: 'tenants', action: 'read' },
      { role: 'tenant_admin', resource: 'tenants', action: 'update' },
      { role: 'tenant_admin', resource: 'api_keys', action: '*' },
      { role: 'tenant_admin', resource: 'qms_connections', action: '*' },
      { role: 'tenant_admin', resource: 'ai_completions', action: '*' },
      { role: 'tenant_admin', resource: 'audit_logs', action: 'read' },
      { role: 'tenant_admin', resource: 'files', action: '*' },
      { role: 'tenant_admin', resource: 'workflow', action: '*' },
      { role: 'tenant_admin', resource: 'document', action: '*' },
      { role: 'tenant_admin', resource: 'reports', action: '*' },
      { role: 'tenant_admin', resource: 'departments', action: '*' },
      { role: 'tenant_admin', resource: 'designations', action: '*' },
      { role: 'tenant_admin', resource: 'user_categories', action: '*' },
      { role: 'tenant_admin', resource: 'supplier', action: '*' },
      { role: 'tenant_admin', resource: 'ai', action: '*' },
      { role: 'tenant_admin', resource: 'notifications', action: '*' },
      { role: 'tenant_admin', resource: 'settings', action: '*' },
      { role: 'tenant_admin', resource: 'security', action: '*' },
      { role: 'tenant_admin', resource: 'training', action: '*' },
      { role: 'tenant_admin', resource: 'projects', action: '*' },
      { role: 'tenant_admin', resource: 'qms', action: '*' }, 
      
      // Quality Manager
      { role: 'quality_manager', resource: 'users', action: 'read' },
      { role: 'quality_manager', resource: 'qms_connections', action: '*' },
      { role: 'quality_manager', resource: 'ai_completions', action: '*' },
      // Viewer
      { role: 'viewer', resource: 'users', action: 'read' },
      { role: 'viewer', resource: 'roles', action: 'read' },
      { role: 'viewer', resource: 'qms_connections', action: 'read' }
    ];

    for (const perm of permissions) {
      await database.query(`
        INSERT INTO permissions (id, role_id, resource, action, scope, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [uuidv4(), roleMap[perm.role], perm.resource, perm.action, 'tenant']);
    }
    console.log('✅ Permissions created:', permissions.length);

    // 4. Create users
    const passwordHash = await bcrypt.hash('Password123!', 12);
    const users = [
      // { email: 'superadmin@qassure.ai', first: 'Super', last: 'Admin', role: 'super_admin' },
      { email: 'polumuri.suresh@ltts.com', first: 'Super', last: 'Admin', role: 'super_admin' },
      { email: 'admin@qassure.ai', first: 'Tenant', last: 'Admin', role: 'tenant_admin' },
      { email: 'manager@qassure.ai', first: 'Quality', last: 'Manager', role: 'quality_manager' },
      { email: 'viewer@qassure.ai', first: 'Read', last: 'Only', role: 'viewer' }
    ];

    for (const user of users) {
      const userId = uuidv4();

      // Create user
      await database.query(`
        INSERT INTO users (id, email, password_hash, first_name, last_name, status, auth_provider, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'active', 'local', NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `, [userId, user.email, passwordHash, user.first, user.last]);

      // Get user ID (in case it existed)
      const userIdResult = await database.query(`SELECT id FROM users WHERE email = $1`, [user.email]);
      const finalUserId = userIdResult.rows[0].id;

      // Create user_tenant
      await database.query(`
        INSERT INTO user_tenants (id, user_id, tenant_id, status, is_primary, joined_at, created_at, updated_at)
        VALUES ($1, $2, $3, 'active', true, NOW(), NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [uuidv4(), finalUserId, tenantId]);

      // Create user_role
      await database.query(`
        INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [uuidv4(), finalUserId, roleMap[user.role], tenantId]);
    }
    console.log('✅ Users created:', users.length);

    console.log('\n🎉 Seed completed!\n');
    console.log('='.repeat(50));
    console.log('TEST CREDENTIALS:');
    console.log('='.repeat(50));
    // console.log('Super Admin:  superadmin@qassure.ai / Password123!');
    console.log('Super Admin:  polumuri.suresh@ltts.com / Password123!');
    console.log('Tenant Admin: admin@qassure.ai / Password123!');
    console.log('QM Manager:   manager@qassure.ai / Password123!');
    console.log('Viewer:       viewer@qassure.ai / Password123!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await database.close();
    process.exit(0);
  }
}

seed();
