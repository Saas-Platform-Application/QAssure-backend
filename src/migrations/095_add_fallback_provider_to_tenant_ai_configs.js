'use strict';

/**
 * Migration 095 - Add fallback_provider to tenant_ai_configs table
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tenant_ai_configs 
      ADD COLUMN IF NOT EXISTS fallback_provider VARCHAR(50);
    `);
    console.log('Migration 095: fallback_provider column added to tenant_ai_configs');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tenant_ai_configs 
      DROP COLUMN IF EXISTS fallback_provider;
    `);
    console.log('Migration 095: rolled back');
  }
};
