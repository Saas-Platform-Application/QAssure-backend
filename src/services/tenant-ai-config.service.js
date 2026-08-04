/**
 * Tenant AI Config Service - QAssure Platform
 * Manages per-tenant AI provider configurations with encrypted key storage.
 * Includes in-memory cache with TTL to avoid DB + decryption on every request.
 */
const crypto = require('crypto');
const database = require('../config/database');
const { encrypt, decrypt, maskApiKey } = require('../utils/encryption');
// const { OPEN_SOURCE_MODELS } = require('../validation/tenant-ai-config.schema');

// Cache: tenantId -> { configs: Map<provider, config>, expiresAt: number }
const configCache = new Map();
// TTL is configurable via env var. Must match the gateway's TENANT_CACHE_TTL_MS setting.
// NOTE: This is a per-instance in-memory cache. In multi-instance deployments only the
// instance that handles the upsert() call will invalidate its cache.
// TODO: Replace with Redis pub/sub invalidation when scaling beyond a single Node.js instance.
const CACHE_TTL_MS = parseInt(process.env.AI_CONFIG_CACHE_TTL_MS) || (5 * 60 * 1000);

class TenantAIConfigService {
  /**
   * Create or update a provider config for a tenant
   */
  async upsert(tenantId, data, context = {}) {
    const {
      provider,
      config_type,
      display_name,
      api_key,
      endpoint,
      deployment,
      api_version,
      custom_models,
      custom_pricing,
      default_model,
      custom_embedding_models,
      default_embedding_model,
      fallback_provider,
      cancel_url,
      is_active
    } = data;

    // Validate azure config has required fields
    if (config_type === 'azure') {
      if (!endpoint) throw new Error('endpoint is required for Azure config');
      if (!deployment) throw new Error('deployment is required for Azure config');
    }

    // Encrypt the API key
    const encryptedApiKey = encrypt(api_key);

    const query = `
      INSERT INTO tenant_ai_configs (
        id, tenant_id, provider, config_type, display_name,
        encrypted_api_key, endpoint, deployment, api_version,
        custom_models, custom_pricing, default_model,
        custom_embedding_models, default_embedding_model,
        fallback_provider, cancel_url, is_active, created_by, updated_by,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14,
        $15, $16, $17, $18, $18,
        NOW(), NOW()
      )
      ON CONFLICT (tenant_id, provider) DO UPDATE SET
        config_type = EXCLUDED.config_type,
        display_name = EXCLUDED.display_name,
        encrypted_api_key = EXCLUDED.encrypted_api_key,
        endpoint = EXCLUDED.endpoint,
        deployment = EXCLUDED.deployment,
        api_version = EXCLUDED.api_version,
        custom_models = EXCLUDED.custom_models,
        custom_pricing = EXCLUDED.custom_pricing,
        default_model = EXCLUDED.default_model,
        custom_embedding_models = EXCLUDED.custom_embedding_models,
        default_embedding_model = EXCLUDED.default_embedding_model,
        fallback_provider = EXCLUDED.fallback_provider,
        cancel_url = EXCLUDED.cancel_url,
        is_active = EXCLUDED.is_active,
        updated_by = EXCLUDED.updated_by,
        last_error = NULL,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await database.query(query, [
      crypto.randomUUID(),
      tenantId,
      provider,
      config_type || 'direct',
      display_name || `${provider} (${config_type || 'direct'})`,
      encryptedApiKey,
      endpoint || null,
      deployment || null,
      api_version || null,
      JSON.stringify(custom_models || []),
      JSON.stringify(custom_pricing || {}),
      default_model || null,
      JSON.stringify(custom_embedding_models || []),
      default_embedding_model || null,
      fallback_provider || null,
      cancel_url || null,
      is_active !== false,
      context.userId || null
    ]);

   // Invalidate both caches
   configCache.delete(tenantId);
   try {
     const { getAIGateway } = require('../infrastructure/ai/gateway.service');
     getAIGateway().clearTenantCache(tenantId);
   } catch (e) { /* gateway not ready */ }

   return this._formatForResponse(result.rows[0]);
  }

  /**
   * Get all configs for a tenant (masked keys)
   */
  async listByTenant(tenantId) {
    const query = `
      SELECT * FROM tenant_ai_configs
      WHERE tenant_id = $1
      ORDER BY provider
    `;
    const result = await database.query(query, [tenantId]);
    return result.rows.map(row => this._formatForResponse(row));
  }

  /**
   * Get a specific provider config for a tenant (masked key)
   */
  async getByProvider(tenantId, provider) {
    const query = `
      SELECT * FROM tenant_ai_configs
      WHERE tenant_id = $1 AND provider = $2
    `;
    const result = await database.query(query, [tenantId, provider]);
    if (result.rows.length === 0) return null;
    return this._formatForResponse(result.rows[0]);
  }

  /**
   * Get ACTIVE configs for a tenant with DECRYPTED keys (internal use only)
   * Uses cache with TTL to minimize DB + decryption overhead.
   */
  async getActiveConfigs(tenantId) {
    // Check cache
    const cached = configCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.configs;
    }

    const query = `
      SELECT * FROM tenant_ai_configs
      WHERE tenant_id = $1 AND is_active = true
    `;
    const result = await database.query(query, [tenantId]);

    const configs = new Map();
    for (const row of result.rows) {
      try {
        const decryptedKey = decrypt(row.encrypted_api_key);
        configs.set(row.provider, {
          provider: row.provider,
          configType: row.config_type,
          apiKey: decryptedKey,
          endpoint: row.endpoint,
          deployment: row.deployment,
          apiVersion: row.api_version,
          customModels: row.custom_models || [],
          customPricing: row.custom_pricing || {},
          defaultModel: row.default_model,
          customEmbeddingModels: row.custom_embedding_models || [],
          defaultEmbeddingModel: row.default_embedding_model,
          fallbackProvider: row.fallback_provider,
          cancelUrl: row.cancel_url
        });
      } catch (err) {
        console.error(`[TenantAIConfig] Failed to decrypt ${row.provider} config for tenant ${tenantId}:`, err.message);
        // Update last_error in DB (fire-and-forget)
        database.query(
          'UPDATE tenant_ai_configs SET last_error = $1, updated_at = NOW() WHERE id = $2',
          [`Decryption failed: ${err.message}`, row.id]
        ).catch(() => {});
      }
    }

    // Cache it
    configCache.set(tenantId, { configs, expiresAt: Date.now() + CACHE_TTL_MS });
    return configs;
  }

  /**
   * Delete a provider config
   */
  async remove(tenantId, provider) {
    const query = `
      DELETE FROM tenant_ai_configs
      WHERE tenant_id = $1 AND provider = $2
      RETURNING id
    `;
    const result = await database.query(query, [tenantId, provider]);
    configCache.delete(tenantId);
    try {
      const { getAIGateway } = require('../infrastructure/ai/gateway.service');
      getAIGateway().clearTenantCache(tenantId);
    } catch (e) { /* gateway not ready */ }
    return result.rowCount > 0;
  }

  /**
   * Test connectivity for a provider config (decrypts key, attempts connection)
   */
  async testConnection(tenantId, provider, options = {}) {
    const query = `
      SELECT * FROM tenant_ai_configs
      WHERE tenant_id = $1 AND provider = $2
    `;
    const result = await database.query(query, [tenantId, provider]);
    if (result.rows.length === 0) {
      throw new Error(`No ${provider} config found for this tenant`);
    }

    const row = result.rows[0];
    const decryptedKey = decrypt(row.encrypted_api_key);
    
    console.log(`[TenantAIConfigService] testConnection - Testing Provider: "${provider}", DB Row Provider: "${row.provider}", Model: "${options.model || 'default'}"`);

    // Build provider config
    const providerConfig = {
      apiKey: decryptedKey,
      azureEndpoint: row.config_type === 'azure' ? row.endpoint : undefined,
      azureApiKey: row.config_type === 'azure' ? decryptedKey : undefined,
      azureDeployment: row.deployment,
      azureApiVersion: row.api_version,
      // For OpenSource models
      endpoint: row.config_type === 'direct' ? row.endpoint : undefined,
      defaultModel: options.model || row.default_model || undefined,
      defaultEmbeddingModel: row.default_embedding_model || undefined
    };

    // Initialize a temporary provider and health check
    let testProvider;
    if (provider === 'openai') {
      const { OpenAIProvider } = require('../infrastructure/ai/openai.provider');
      testProvider = new OpenAIProvider(providerConfig);
    } else if (provider === 'anthropic') {
      const { AnthropicProvider } = require('../infrastructure/ai/anthropic.provider');
      testProvider = new AnthropicProvider(providerConfig);
    } else if (provider === "gemini" || provider.startsWith("gemini")) {
      const { GeminiProvider } = require('../infrastructure/ai/gemini.provider');
      testProvider = new GeminiProvider({
        apiKey: decryptedKey,
        endpoint: row.endpoint || undefined,
        apiVersion: row.api_version || 'v1beta',
        defaultModel: options.model || row.default_model || undefined,
        defaultEmbeddingModel: row.default_embedding_model || undefined
      });
      testProvider.defaultModel = options.model || row.default_model || testProvider.defaultModel;
    } else if (provider === 'open-source' || !['openai', 'anthropic'].includes(provider)) {
      const { OpenSourceProvider } = require('../infrastructure/ai/opensource.provider');
      testProvider = new OpenSourceProvider(providerConfig);
      
      // If specific model name was used as provider, restrict the test provider to it
      if (provider !== 'open-source') {
        testProvider.name = provider;
        testProvider.displayName = provider;
        testProvider.models = [provider];
        testProvider.defaultModel = options.model || row.default_model || provider;
      } else {
        testProvider.defaultModel = options.model || row.default_model || testProvider.defaultModel;
      }
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    await testProvider.initialize();
    
    // Override default model if provided
    const modelToTest = options.model || row.default_model || testProvider.defaultModel;
    testProvider.defaultModel = modelToTest;
    const health = await testProvider.healthCheck();

    // Update verification timestamp
    const errorMsg = health.healthy ? null : health.error;
    await database.query(
      'UPDATE tenant_ai_configs SET last_verified_at = NOW(), last_error = $1, updated_at = NOW() WHERE id = $2',
      [errorMsg, row.id]
    );

    // Invalidate cache
    configCache.delete(tenantId);

    return {
      ...health,
      model: modelToTest,
      fallbackUsed: false
    };
  }

  /**
   * Clear cache for a tenant (called on config changes)
   */
  clearCache(tenantId) {
    if (tenantId) {
      configCache.delete(tenantId);
    } else {
      configCache.clear();
    }
  }

  /**
   * Format DB row for API response (mask sensitive fields)
   */
  _formatForResponse(row) {
    let maskedKey = '****';
    try {
      const decrypted = decrypt(row.encrypted_api_key);
      maskedKey = maskApiKey(decrypted);
    } catch {
      maskedKey = '[decryption failed]';
    }

    return {
      id: row.id,
      tenant_id: row.tenant_id,
      provider: row.provider,
      config_type: row.config_type,
      display_name: row.display_name,
      api_key_masked: maskedKey,
      endpoint: row.endpoint,
      deployment: row.deployment,
      api_version: row.api_version,
      custom_models: row.custom_models,
      custom_pricing: row.custom_pricing,
      default_model: row.default_model,
      custom_embedding_models: row.custom_embedding_models,
      default_embedding_model: row.default_embedding_model,
      fallback_provider: row.fallback_provider,
      cancel_url: row.cancel_url,
      is_active: row.is_active,
      last_verified_at: row.last_verified_at,
      last_error: row.last_error,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

// Singleton
let instance = null;
const getTenantAIConfigService = () => {
  if (!instance) instance = new TenantAIConfigService();
  return instance;
};

module.exports = { TenantAIConfigService, getTenantAIConfigService };
