'use strict';

/**
 * Migration 094 - Create ai_fallbacks table
 * Stores history of LLM provider gateway fallback occurrences for monitoring and review.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS ai_fallbacks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        failed_provider VARCHAR(50) NOT NULL,
        failed_model VARCHAR(255),
        fallback_provider VARCHAR(50) NOT NULL,
        fallback_model VARCHAR(255),
        error_message TEXT,
        config_details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_fallbacks_tenant ON ai_fallbacks(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_ai_fallbacks_created ON ai_fallbacks(created_at DESC);
    `);

    console.log('Migration 094: ai_fallbacks table created');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS ai_fallbacks CASCADE;
    `);
    console.log('Migration 094: rolled back');
  }
};
