'use strict';

/**
 * Migration 055 - Create tenant_ai_configs table
 * 
 * Stores per-tenant AI provider configurations.
 * Each tenant can configure their own OpenAI/Anthropic keys,
 * either via Azure Foundry or direct API keys.
 * API keys are stored AES-256-GCM encrypted at rest.
 * 
 * If no tenant config exists, the system falls back to
 * platform-level keys from environment variables.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS tenant_ai_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        config_type VARCHAR(20) NOT NULL DEFAULT 'direct',
        display_name VARCHAR(255),
        encrypted_api_key TEXT NOT NULL,
        endpoint TEXT,
        deployment VARCHAR(255),
        api_version VARCHAR(50),
        custom_models JSONB DEFAULT '[]'::jsonb,
        custom_pricing JSONB DEFAULT '{}'::jsonb,
        default_model VARCHAR(255),
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_verified_at TIMESTAMPTZ,
        last_error TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_provider CHECK (provider IN ('openai', 'anthropic')),
        CONSTRAINT chk_config_type CHECK (config_type IN ('azure', 'direct')),
        CONSTRAINT uq_tenant_provider UNIQUE (tenant_id, provider)
      );

      CREATE INDEX idx_tenant_ai_configs_tenant ON tenant_ai_configs(tenant_id);
      CREATE INDEX idx_tenant_ai_configs_active ON tenant_ai_configs(tenant_id, is_active) WHERE is_active = true;

      COMMENT ON TABLE tenant_ai_configs IS 'Per-tenant AI provider configurations with encrypted API keys';
      COMMENT ON COLUMN tenant_ai_configs.config_type IS 'azure = Azure Foundry/OpenAI Service, direct = vendor API key';
      COMMENT ON COLUMN tenant_ai_configs.encrypted_api_key IS 'AES-256-GCM encrypted. Format: iv:authTag:ciphertext (base64)';
      COMMENT ON COLUMN tenant_ai_configs.endpoint IS 'Required for azure config_type. Base URL of Azure resource.';
      COMMENT ON COLUMN tenant_ai_configs.deployment IS 'Azure deployment name or model alias';
      COMMENT ON COLUMN tenant_ai_configs.custom_models IS 'Array of model IDs available via this config';
      COMMENT ON COLUMN tenant_ai_configs.custom_pricing IS 'Per-model pricing overrides: {"model": {"input": 0.002, "output": 0.008}}';
    `);

    console.log('Migration 055: tenant_ai_configs table created');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS tenant_ai_configs CASCADE;
    `);
  }
};