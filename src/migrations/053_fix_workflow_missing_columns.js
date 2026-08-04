'use strict';

/**
 * Migration 053 - Fix Workflow Missing Columns
 *
 * Phase14 SQL defined workflow_delegates table and signature_id column
 * on workflow_history, but migration 028 was already marked as applied
 * before these were properly created. This migration ensures they exist
 * idempotently on any environment.
 *
 * Fixes:
 *   1. workflow_delegates table (missing entirely)
 *   2. workflow_history.signature_id column (missing column)
 */

module.exports = {
  async up(queryInterface, Sequelize) {

    // 1. Create workflow_delegates table if it does not exist
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS workflow_delegates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        delegator_id UUID NOT NULL REFERENCES users(id),
        delegate_id UUID NOT NULL REFERENCES users(id),
        workflow_definition_id UUID REFERENCES workflow_definitions(id),
        entity_type VARCHAR(100),
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID REFERENCES users(id)
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_delegates_delegator
        ON workflow_delegates(delegator_id, is_active);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_delegates_delegate
        ON workflow_delegates(delegate_id, is_active);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_delegates_active
        ON workflow_delegates(is_active, starts_at, ends_at);
    `);

    // 2. Add signature_id column to workflow_history if it does not exist
    await queryInterface.sequelize.query(`
      ALTER TABLE workflow_history
        ADD COLUMN IF NOT EXISTS signature_id UUID;
    `);

    console.log('Migration 053: workflow_delegates table and signature_id column ensured');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE workflow_history DROP COLUMN IF EXISTS signature_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_workflow_delegates_active;
      DROP INDEX IF EXISTS idx_workflow_delegates_delegate;
      DROP INDEX IF EXISTS idx_workflow_delegates_delegator;
    `);

    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS workflow_delegates;
    `);
  }
};
