/**
 * AI Service - QAssure Platform
 * Business logic for AI completions with usage tracking
 */
const crypto = require("crypto");
const database = require("../config/database");
const { getAIGateway } = require("../infrastructure/ai/gateway.service");
const { getAuditService } = require("./audit.service");

class AIService {
  constructor() {
    this.gateway = getAIGateway();
    this.auditService = getAuditService();
  }

  /**
   * Initialize the AI service
   */
  async initialize() {
    return this.gateway.initialize();
  }

  /**
   * Create a completion and track usage
   */
  async createCompletion(data, context = {}) {
    const { userId, tenantId, correlationId } = context;
    const moduleId = this._resolveModuleId(context);
    const completionId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Create completion via gateway
      const result = await this.gateway.createCompletion(
        {
          messages: data.messages,
          model: data.model,
          provider: data.provider,
          temperature: data.temperature,
          max_tokens: data.max_tokens,
          top_p: data.top_p,
          stop: data.stop,
        },
        context,
      );

      const duration = Date.now() - startTime;

      // Store completion record
      await this._storeCompletion(
        {
          id: completionId,
          tenantId,
          moduleId,
          userId,
          provider: result.provider,
          model: result.model,
          response: result.content,
          temperature: data.temperature,
          maxTokens: data.max_tokens,
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
          cost: result.cost,
          latencyMs: result.latency_ms,
          status: "completed",
          correlationId,
          fallbackProvider: result.fallbackUsed ? result.provider : null,
          metadata: {
            top_p: data.top_p,
            stop: data.stop,
            fallbackUsed: result.fallbackUsed,
          },
        },
        data.messages,
      );

      // Update usage stats
      await this._updateUsageStats(tenantId, result);

      // Audit log
      await this.auditService.log({
        tenant_id: tenantId,
        user_id: userId,
        action: "ai.completion",
        resource_type: "ai_completion",
        resource_id: completionId,
        metadata: {
          provider: result.provider,
          model: result.model,
          tokens: result.usage.total_tokens,
          cost: result.cost,
        },
        correlation_id: correlationId,
      });

      return {
        id: completionId,
        provider: result.provider,
        model: result.model,
        content: result.content,
        usage: result.usage,
        cost: result.cost,
        latency_ms: result.latency_ms,
        fallbackUsed: result.fallbackUsed || false,
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      // Store failed completion
      await this._storeCompletion(
        {
          id: completionId,
          tenantId,
          moduleId,
          userId,
          provider: data.provider || "unknown",
          model: data.model || "unknown",
          status: "failed",
          errorMessage: error.message,
          metadata: { correlationId },
        },
        data.messages,
      );

      throw error;
    }
  }

  /**
   * Get completion by ID
   */
  async getCompletion(completionId, tenantId) {
    const query = `
      SELECT
        c.*,
        m.name AS module_name,
        COALESCE(
          NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
          u.email
        ) AS user_display_name
      FROM ai_completions c
      LEFT JOIN modules m ON m.id = c.module_id
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.id = $1 AND c.tenant_id = $2
    `;
    const result = await database.query(query, [completionId, tenantId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this._formatCompletion(result.rows[0]);
  }

  /**
   * List completions with filters
   */
  async listCompletions(tenantId, options = {}) {
    const {
      page = 1,
      limit = 20,
      provider,
      model,
      userId,
      moduleId,
      startDate,
      endDate,
      status,
    } = options;

    const offset = (page - 1) * limit;
    const params = [tenantId];
    let paramIndex = 1;

    let whereClause = `WHERE c.tenant_id = $${paramIndex}`;

    if (provider) {
      paramIndex++;
      whereClause += ` AND c.provider = $${paramIndex}`;
      params.push(provider);
    }

    if (model) {
      paramIndex++;
      whereClause += ` AND c.model = $${paramIndex}`;
      params.push(model);
    }

    if (userId) {
      paramIndex++;
      whereClause += ` AND c.user_id = $${paramIndex}`;
      params.push(userId);
    }

    if (moduleId) {
      paramIndex++;
      whereClause += ` AND c.module_id = $${paramIndex}`;
      params.push(moduleId);
    }

    if (status) {
      paramIndex++;
      whereClause += ` AND c.status = $${paramIndex}`;
      params.push(status);
    }

    if (startDate) {
      paramIndex++;
      whereClause += ` AND c.created_at >= $${paramIndex}`;
      params.push(startDate);
    }

    if (endDate) {
      paramIndex++;
      whereClause += ` AND c.created_at <= $${paramIndex}`;
      params.push(endDate);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*)::int AS count FROM ai_completions c ${whereClause}`;
    const countResult = await database.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    paramIndex++;
    params.push(limit);
    paramIndex++;
    params.push(offset);

    const dataQuery = `
      SELECT
        c.*,
        m.name AS module_name,
        COALESCE(
          NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
          u.email
        ) AS user_display_name
      FROM ai_completions c
      LEFT JOIN modules m ON m.id = c.module_id
      LEFT JOIN users u ON u.id = c.user_id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex - 1} OFFSET $${paramIndex}
    `;
    const dataResult = await database.query(dataQuery, params);

    return {
      data: dataResult.rows.map((row) =>
        this._formatCompletion(row, { omitPrompt: true }),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get available providers
   */
  async getProviders(tenantId) {
    await this.gateway.initialize();
    if (tenantId) {
      const { providers } = await this.gateway._resolveProviders(tenantId);
      const result = [];
      for (const [name, provider] of providers) {
        result.push({ name, ...provider.getInfo() });
      }
      return result;
    }
    return this.gateway.getProviders();
  }

  /**
   * Get all available models
   */
  async getModels(tenantId) {
    await this.gateway.initialize();
    if (tenantId) {
      const { providers } = await this.gateway._resolveProviders(tenantId);
      const models = [];
      for (const [providerName, provider] of providers) {
        for (const model of provider.models) {
          models.push({
            id: model,
            provider: providerName,
            isDefault: model === provider.defaultModel,
            pricing: provider.usesTenantApiKey
              ? { input: 0, output: 0 }
              : provider.getPricing(model),
          });
        }
      }
      return models;
    }
    return this.gateway.getAllModels();
  }

  /**
   * Get provider health status
   */
  async getProviderHealth(providerName = null, tenantId = null) {
    await this.gateway.initialize();

    let providers = this.gateway.providers;
    if (tenantId) {
      const resolved = await this.gateway._resolveProviders(tenantId);
      providers = resolved.providers;
    }

    if (providerName) {
      const provider = providers.get(providerName);
      if (!provider) {
        return { error: "Provider not found" };
      }
      return provider.healthCheck();
    }

    const results = {};
    for (const [name, provider] of providers) {
      results[name] = await provider.healthCheck();
    }
    const healthyCount = Object.values(results).filter((r) => r.healthy).length;
    return {
      healthy: healthyCount > 0,
      providers: results,
      healthyCount,
      totalCount: providers.size,
    };
  }

  /**
   * Get cost summary
   */
  async getCostSummary(tenantId, options = {}) {
    const { startDate, endDate, groupBy = "day" } = options;

    let dateFilter = "";
    const params = [tenantId];

    if (startDate) {
      params.push(startDate);
      dateFilter += ` AND created_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      dateFilter += ` AND created_at <= $${params.length}`;
    }

    // Overall summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_completions,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(cost_usd) as total_cost,
        AVG(latency_ms) as avg_latency_ms
      FROM ai_completions
      WHERE tenant_id = $1 AND status = 'completed' ${dateFilter}
    `;
    const summaryResult = await database.query(summaryQuery, params);

    // By provider
    const byProviderQuery = `
      SELECT 
        provider,
        COUNT(*) as completions,
        SUM(total_tokens) as tokens,
        SUM(cost_usd) as cost
      FROM ai_completions
      WHERE tenant_id = $1 AND status = 'completed' ${dateFilter}
      GROUP BY provider
      ORDER BY cost DESC
    `;
    const byProviderResult = await database.query(byProviderQuery, params);

    // By model
    const byModelQuery = `
      SELECT 
        model,
        provider,
        COUNT(*) as completions,
        SUM(total_tokens) as tokens,
        SUM(cost_usd) as cost
      FROM ai_completions
      WHERE tenant_id = $1 AND status = 'completed' ${dateFilter}
      GROUP BY model, provider
      ORDER BY cost DESC
      LIMIT 10
    `;
    const byModelResult = await database.query(byModelQuery, params);

    return {
      summary: {
        total_completions:
          parseInt(summaryResult.rows[0].total_completions) || 0,
        total_tokens: parseInt(summaryResult.rows[0].total_tokens) || 0,
        total_cost: parseFloat(summaryResult.rows[0].total_cost) || 0,
        avg_latency_ms: parseFloat(summaryResult.rows[0].avg_latency_ms) || 0,
      },
      by_provider: byProviderResult.rows.map((row) => ({
        provider: row.provider,
        completions: parseInt(row.completions),
        tokens: parseInt(row.tokens),
        cost: parseFloat(row.cost),
      })),
      by_model: byModelResult.rows.map((row) => ({
        model: row.model,
        provider: row.provider,
        completions: parseInt(row.completions),
        tokens: parseInt(row.tokens),
        cost: parseFloat(row.cost),
      })),
    };
  }

  /**
   * Store completion record
   */
  async _storeCompletion(data, messages = []) {
    const query = `
      INSERT INTO ai_completions (
        id, tenant_id, module_id, user_id, provider, model,
        use_case, prompt, response, temperature, max_tokens,
        prompt_tokens, completion_tokens, total_tokens,
        cost_usd, latency_ms, status, error_message, error_code,
        correlation_id, fallback_provider, metadata,
        cached, streaming, completed_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW(), NOW())
    `;

    const prompt =
      messages.map((m) => `${m.role}: ${m.content}`).join("\n") || "";

    await database.query(query, [
      data.id,
      data.tenantId,
      data.moduleId || null,
      data.userId,
      data.provider,
      data.model,
      data.useCase || "api_completion",
      prompt,
      data.response || null,
      data.temperature || null,
      data.maxTokens || null,
      data.promptTokens || 0,
      data.completionTokens || 0,
      data.totalTokens || 0,
      data.cost || 0,
      data.latencyMs || 0,
      data.status,
      data.errorMessage || null,
      data.errorCode || null,
      data.correlationId || null,
      data.fallbackProvider || null,
      JSON.stringify(data.metadata || {}),
      false,
      false,
      data.status === "completed" ? new Date() : null,
    ]);
  }
  /**
   * Update usage stats
   */
  async _updateUsageStats(tenantId, result) {
    const now = new Date();
    const periodStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const query = `
      INSERT INTO ai_usage (
        id, tenant_id, provider, model,
        period_start, period_end, period_type,
        request_count, success_count, failure_count, cached_count,
        total_prompt_tokens, total_completion_tokens, total_tokens,
        total_cost_usd, avg_latency_ms,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, 'daily',
        1, 1, 0, 0,
        $7, $8, $9,
        $10, $11,
        NOW(), NOW()
      )
      ON CONFLICT (tenant_id, provider, model, period_start)
      DO UPDATE SET
        request_count = ai_usage.request_count + 1,
        success_count = ai_usage.success_count + 1,
        total_prompt_tokens = ai_usage.total_prompt_tokens + $7,
        total_completion_tokens = ai_usage.total_completion_tokens + $8,
        total_tokens = ai_usage.total_tokens + $9,
        total_cost_usd = ai_usage.total_cost_usd + $10,
        avg_latency_ms = (ai_usage.avg_latency_ms * ai_usage.request_count + $11) / (ai_usage.request_count + 1),
        updated_at = NOW()
    `;

    await database.query(query, [
      crypto.randomUUID(),
      tenantId,
      result.provider,
      result.model,
      periodStart,
      periodEnd,
      result.usage.prompt_tokens || 0,
      result.usage.completion_tokens || 0,
      result.usage.total_tokens || 0,
      result.cost || 0,
      result.latency_ms || 0,
    ]);
  }

  /**
   * Format completion from database
   */
  _formatCompletion(row, options = {}) {
    const { omitPrompt = false } = options;

    let metadata = row.metadata;
    if (metadata != null && typeof metadata === "string") {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        // keep string
      }
    }

    const toNum = (v) => (v === null || v === undefined ? null : Number(v));

    const out = {
      id: row.id,
      tenant_id: row.tenant_id,
      module_id: row.module_id,
      module_name: row.module_name || null,
      user_id: row.user_id,
      user_name: row.user_display_name || null,
      use_case: row.use_case,
      provider: row.provider,
      model: row.model,
      prompt_template_id: row.prompt_template_id,
      prompt: row.prompt,
      system_message: row.system_message,
      temperature: toNum(row.temperature),
      max_tokens: row.max_tokens,
      top_p: toNum(row.top_p),
      frequency_penalty: toNum(row.frequency_penalty),
      presence_penalty: toNum(row.presence_penalty),
      stop_sequences: row.stop_sequences,
      response: row.response,
      cached: row.cached,
      cache_key: row.cache_key,
      streaming: row.streaming,
      prompt_tokens: row.prompt_tokens,
      completion_tokens: row.completion_tokens,
      total_tokens: row.total_tokens,
      usage: {
        prompt_tokens: row.prompt_tokens || 0,
        completion_tokens: row.completion_tokens || 0,
        total_tokens: row.total_tokens || 0,
      },
      cost: parseFloat(row.cost_usd) || 0,
      latency_ms: row.latency_ms,
      status: row.status,
      error_message: row.error_message,
      error_code: row.error_code,
      correlation_id: row.correlation_id,
      fallback_provider: row.fallback_provider,
      metadata,
      completed_at: row.completed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    if (omitPrompt) {
      delete out.prompt;
      delete out.system_message;
    }

    return out;
  }

  /**
   * Resolve module context for calls coming from JWT+API-key or API-key flows.
   * This keeps module capture centralized in service layer so callers don't need
   * to manually map module id every time.
   */
  _resolveModuleId(context = {}) {
    return (
      context.moduleId ||
      context.module_id ||
      context.req?.module?.id ||
      context.req?.user?.moduleId ||
      context.request?.module?.id ||
      context.request?.user?.moduleId ||
      context.user?.moduleId ||
      null
    );
  }

  /**
   * List all AI Gateway fallback events with pagination
   */
  async listFallbacks(tenantId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // Ensure table exists (self-healing)
    await database
      .query(
        `
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
    `,
      )
      .catch(() => {});

    const params = [];
    let whereClause = "";

    // Super Admins can see all fallbacks, but we can also filter by tenant if specified
    if (tenantId) {
      params.push(tenantId);
      whereClause = "WHERE f.tenant_id = $1";
    }

    const countParams = [...params];
    const countQuery = `SELECT COUNT(*)::int AS count FROM ai_fallbacks f ${whereClause}`;
    const countResult = await database.query(countQuery, countParams);
    const total = countResult.rows[0].count;

    const queryParams = [...params, limit, offset];
    const dataQuery = `
      SELECT f.*, t.name AS tenant_name
      FROM ai_fallbacks f
      LEFT JOIN tenants t ON t.id = f.tenant_id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const dataResult = await database.query(dataQuery, queryParams);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get the custom fallback order configured for a tenant or globally
   */
  async getFallbackOrderSetting(tenantId) {
    const { getSystemConfigService } = require("./system-config.service");
    const systemConfig = getSystemConfigService();
    const setting = await systemConfig.getSetting(
      tenantId,
      "ai",
      "fallback_order",
    );
    if (setting) {
      return Array.isArray(setting)
        ? setting
        : typeof setting === "string"
          ? setting
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
    }
    // Default fallback order
    return ["openai", "anthropic", "gemini", "open-source"];
  }

  /**
   * Update the custom fallback order configured for a tenant or globally
   */
  async updateFallbackOrderSetting(tenantId, fallbackOrder, userId) {
    const { getSystemConfigService } = require("./system-config.service");
    const systemConfig = getSystemConfigService();
    const value = JSON.stringify(fallbackOrder);

    // Update or insert system setting
    await systemConfig.updateSetting(
      tenantId,
      "ai",
      "fallback_order",
      value,
      userId,
    );

    // Clear gateway cache immediately to apply changes
    const { getAIGateway } = require("../infrastructure/ai/gateway.service");
    getAIGateway().clearTenantCache(tenantId);

    return fallbackOrder;
  }

  /**
   * Get the per-provider fallback mapping configured globally
   * Returns an object like: { openai: 'anthropic', anthropic: 'openai', gemini: 'open-source' }
   */
  async getFallbackMappingSetting() {
    const { getSystemConfigService } = require("./system-config.service");
    const systemConfig = getSystemConfigService();
    const setting = await systemConfig.getSetting(
      null,
      "ai",
      "fallback_mapping",
    );
    if (setting && typeof setting === "object" && !Array.isArray(setting)) {
      return setting;
    }
    if (typeof setting === "string") {
      try {
        return JSON.parse(setting);
      } catch {
        /* ignore */
      }
    }
    // Default built-in per-provider mappings
    return {
      openai: "anthropic",
      anthropic: "openai",
      gemini: "open-source",
      "open-source": "openai",
    };
  }

  /**
   * Update the per-provider fallback mapping globally
   * mapping: { openai: 'anthropic', anthropic: 'openai', ... }
   */
  async updateFallbackMappingSetting(mapping, userId) {
    const { getSystemConfigService } = require("./system-config.service");
    const systemConfig = getSystemConfigService();
    const value = JSON.stringify(mapping);
    await systemConfig.updateSetting(
      null,
      "ai",
      "fallback_mapping",
      value,
      userId,
    );

    // Clear entire gateway cache immediately to apply changes
    const { getAIGateway } = require("../infrastructure/ai/gateway.service");
    getAIGateway().clearTenantCache(null);

    return mapping;
  }
}

// Singleton
let instance = null;
const getAIService = () => {
  if (!instance) {
    instance = new AIService();
  }
  return instance;
};

module.exports = { AIService, getAIService };
