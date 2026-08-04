'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE roles 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
      CREATE INDEX IF NOT EXISTS idx_roles_tenant_active ON roles(tenant_id, is_active);
    `);
    console.log('Migration 102: Added is_active column and index to roles table');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_roles_tenant_active;
      ALTER TABLE roles 
      DROP COLUMN IF EXISTS is_active;
    `);
    console.log('Migration 102: Dropped is_active column and index from roles table');
  }
};
