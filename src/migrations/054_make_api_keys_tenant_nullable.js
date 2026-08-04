'use strict';

/**
 * Migration 054 - Make api_keys.tenant_id Nullable
 *
 * Module API keys are tenant-agnostic — one key serves all tenants
 * that have the module assigned. Previously tenant_id was NOT NULL
 * which incorrectly locked a module key to a single tenant.
 *
 * This migration makes tenant_id nullable so module-scoped API keys
 * can be created without a tenant. Tenant context is resolved at
 * request time via X-Tenant-ID header + tenant_module_access validation.
 *
 * Tenant-scoped keys (created by tenant admins) still have tenant_id set.
 * Module-scoped keys (auto-generated on module registration) have tenant_id = NULL.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Make tenant_id nullable
    await queryInterface.sequelize.query(`
      ALTER TABLE api_keys ALTER COLUMN tenant_id DROP NOT NULL;
    `);

    console.log('Migration 054: api_keys.tenant_id is now nullable for module-scoped keys');
  },

  async down(queryInterface, Sequelize) {
    // Before reverting, set any NULL tenant_id to a safe default
    // This is a destructive rollback — use with caution
    await queryInterface.sequelize.query(`
      UPDATE api_keys SET tenant_id = (
        SELECT id FROM tenants ORDER BY created_at LIMIT 1
      ) WHERE tenant_id IS NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE api_keys ALTER COLUMN tenant_id SET NOT NULL;
    `);
  }
};