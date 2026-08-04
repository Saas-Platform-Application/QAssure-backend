'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tenant_ai_configs 
      ADD COLUMN IF NOT EXISTS cancel_url VARCHAR(500) DEFAULT NULL;
    `);
    console.log('Migration 101: Added cancel_url column to tenant_ai_configs table');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tenant_ai_configs 
      DROP COLUMN IF EXISTS cancel_url;
    `);
    console.log('Migration 101: Dropped cancel_url column from tenant_ai_configs table');
  }
};
