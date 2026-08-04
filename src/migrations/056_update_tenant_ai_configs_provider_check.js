'use strict';

/**
 * Migration 056 - Update tenant_ai_configs provider constraint
 * Adds 'open-source' as a valid provider type
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tenant_ai_configs DROP CONSTRAINT IF EXISTS chk_provider;
    `);
    console.log('Migration 056: Dropped chk_provider constraint in tenant_ai_configs to allow dynamic model names');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tenant_ai_configs DROP CONSTRAINT IF EXISTS chk_provider;
      ALTER TABLE tenant_ai_configs ADD CONSTRAINT chk_provider CHECK (provider IN ('openai', 'anthropic', 'open-source'));
    `);
  }
};
