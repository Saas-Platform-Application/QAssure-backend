/**
 * AI Gateway Service - QAssure Platform
 * Orchestrates multiple AI providers with routing, fallback, and cost tracking.
 * Supports per-tenant provider configs with fallback to system-level providers.
 */
const { OpenAIProvider, AIProviderError } = require("./openai.provider");
const { AnthropicProvider } = require("./anthropic.provider");
const { GeminiProvider } = require("./gemini.provider");
const { OpenSourceProvider } = require("./opensource.provider");
// const {
//   OPEN_SOURCE_MODELS,
// } = require("../../validation/tenant-ai-config.schema");
const { getEventService } = require("../kafka");

// ── Named constants — do NOT inline these as raw strings ─────────────────────

/**
 * The QAssure super-admin (owner) organization tenant UUID.
 * This is the system-level AI config row managed exclusively by the QAssure team.
 * It acts as a global base-layer config for all tenants.
 * If this row is deleted from the tenants table, getActiveConfigs() will fall back
 * to ENV-only providers and log a warning.
 */
const GLOBAL_TENANT_ID = "00000000-0000-0000-0000-000000000001";

/**
 * system_settings table keys for AI fallback configuration.
 * Defined as constants to prevent silent typo-based failures in SQL queries.
 */
const AI_SETTING_FALLBACK_MAPPING = "fallback_mapping";
const AI_SETTING_FALLBACK_ORDER = "fallback_order";

// ── Cache: tenantId -> { providers: Map<name, provider>, expiresAt: number } ─
const tenantProviderCache = new Map();
// TTL and max size are configurable via env vars to support high-tenant-count deployments.
// NOTE: This is a per-instance in-memory cache. In multi-instance deployments only the
// instance that receives an upsert() call will clear its cache. Other instances keep
// serving stale provider configs for up to CACHE_TTL_MS.
// TODO: Replace with Redis-based shared cache when scaling beyond a single Node.js instance.
const TENANT_CACHE_TTL_MS =
  parseInt(process.env.AI_CONFIG_CACHE_TTL_MS) || 5 * 60 * 1000;
const TENANT_CACHE_MAX_SIZE =
  parseInt(process.env.AI_PROVIDER_CACHE_MAX_SIZE) || 200;

class AIGatewayService {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = null;
    this.fallbackOrder = [];
    this.initialized = false;
    this.eventService = null;
    this.tenantConfigService = null;
  }

  /**
   * Initialize system-level providers (from .env)
   */
  async initialize() {
    if (this.initialized) return true;

    console.log("[AIGateway] Initializing providers...");

    const systemConfig = {
      timeout: parseInt(process.env.AI_PROVIDER_TIMEOUT) || 120000,
      maxRetries: parseInt(process.env.AI_PROVIDER_MAX_RETRIES) || 2,
    };

    const openai = new OpenAIProvider(systemConfig);
    if (await openai.initialize()) {
      this.providers.set("openai", openai);
    }

    const anthropic = new AnthropicProvider(systemConfig);
    if (await anthropic.initialize()) {
      this.providers.set("anthropic", anthropic);
    }

    const gemini = new GeminiProvider(systemConfig);
    if (await gemini.initialize()) {
      this.providers.set("gemini", gemini);
    }

    if (this.providers.has("openai")) {
      this.defaultProvider = "openai";
      this.fallbackOrder = ["openai", "anthropic", "gemini"].filter((p) =>
        this.providers.has(p),
      );
    } else if (this.providers.has("anthropic")) {
      this.defaultProvider = "anthropic";
      this.fallbackOrder = ["anthropic", "gemini"].filter((p) =>
        this.providers.has(p),
      );
    } else if (this.providers.has("gemini")) {
      this.defaultProvider = "gemini";
      this.fallbackOrder = ["gemini"];
    }

    try {
      this.eventService = getEventService();
    } catch (err) {
      console.warn("[AIGateway] Event service not available");
    }

    this.initialized = true;
    console.log(
      `[AIGateway] ✅ Initialized with ${this.providers.size} provider(s)`,
    );
    console.log(
      `[AIGateway] Default: ${this.defaultProvider}, Fallback: ${this.fallbackOrder.join(" → ")}`,
    );

    return this.providers.size > 0;
  }

  /**
   * Resolve providers for a tenant.
   * Returns tenant-specific providers if configured, otherwise system providers.
   */
  async _resolveProviders(tenantId) {
    if (!this.tenantConfigService) {
      try {
        const {
          getTenantAIConfigService,
        } = require("../../services/tenant-ai-config.service");
        this.tenantConfigService = getTenantAIConfigService();
      } catch (err) {
        console.warn(
          "[AIGateway] Tenant AI config service not available:",
          err.message,
        );
      }
    }

    console.log(`[AIGateway] Resolving providers for Tenant: ${tenantId}`);
    if (!tenantId || !this.tenantConfigService) {
      console.log(
        `[AIGateway] No tenant config path taken - TenantId: ${!!tenantId}, Service: ${!!this.tenantConfigService}`,
      );
      const customFallbackOrder = await this._applyCustomFallbackOrder(
        this.fallbackOrder,
        tenantId,
      );
      return {
        providers: this.providers,
        fallbackOrder: customFallbackOrder,
        source: "system",
      };
    }

    // Check tenant provider cache
    const cached = tenantProviderCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        providers: cached.providers,
        fallbackOrder: cached.fallbackOrder,
        source: "tenant",
      };
    }

    // Load global configs (system fallback models configured by Super Admin)
    let globalConfigs = new Map();
    if (this.tenantConfigService) {
      try {
        globalConfigs =
          await this.tenantConfigService.getActiveConfigs(GLOBAL_TENANT_ID);
      } catch (err) {
        console.warn(
          "[AIGateway] Failed to load global configurations:",
          err.message,
        );
      }
    }

    // Load tenant configs from DB
    let tenantConfigs = new Map();
    if (tenantId !== GLOBAL_TENANT_ID) {
      try {
        tenantConfigs =
          await this.tenantConfigService.getActiveConfigs(tenantId);
      } catch (err) {
        console.warn(
          `[AIGateway] Failed to load tenant ${tenantId} configs:`,
          err.message,
        );
      }
    }

    // Build merged system-level providers (static system + dynamic global fallbacks)
    const baseProviders = new Map(this.providers);
    const globalFallbackOrder = [...this.fallbackOrder];

    if (globalConfigs && globalConfigs.size > 0) {
      for (const [providerName, config] of globalConfigs) {
        try {
          const provider = await this._createProviderFromConfig(
            providerName,
            config,
          );
          if (provider) {
            baseProviders.set(providerName, provider);
            if (!globalFallbackOrder.includes(providerName)) {
              globalFallbackOrder.push(providerName);
            }
          }
        } catch (err) {
          console.warn(
            `[AIGateway] Failed to init global provider ${providerName}:`,
            err.message,
          );
        }
      }
    }

    if (
      (!tenantConfigs || tenantConfigs.size === 0) &&
      tenantId !== GLOBAL_TENANT_ID
    ) {
      const customFallbackOrder = await this._applyCustomFallbackOrder(
        globalFallbackOrder,
        tenantId,
      );
      return {
        providers: baseProviders,
        fallbackOrder: customFallbackOrder,
        source: "system",
      };
    }

    // Build tenant-specific providers
    const tenantProviders = new Map();
    const tenantFallbackOrder = [];

    for (const [providerName, config] of tenantConfigs) {
      try {
        const provider = await this._createProviderFromConfig(
          providerName,
          config,
        );
        if (provider) {
          tenantProviders.set(providerName, provider);
          tenantFallbackOrder.push(providerName);
        }
      } catch (err) {
        console.warn(
          `[AIGateway] Failed to init tenant ${providerName}:`,
          err.message,
        );
      }
    }

    // Merge: tenant providers take priority, system fills gaps
    const merged = new Map(baseProviders);
    for (const [name, provider] of tenantProviders) {
      merged.set(name, provider);
    }
    // Fallback: tenant providers first, then remaining system providers
    const mergedFallback = [...tenantFallbackOrder];
    for (const name of globalFallbackOrder) {
      if (!mergedFallback.includes(name)) {
        mergedFallback.push(name);
      }
    }
    const customFallbackOrder = await this._applyCustomFallbackOrder(
      mergedFallback,
      tenantId,
    );

    // Evict oldest entries if cache exceeds max size
    if (tenantProviderCache.size >= TENANT_CACHE_MAX_SIZE) {
      const oldest = tenantProviderCache.keys().next().value;
      tenantProviderCache.delete(oldest);
    }

    // Cache merged providers
    tenantProviderCache.set(tenantId, {
      providers: merged,
      fallbackOrder: customFallbackOrder,
      expiresAt: Date.now() + TENANT_CACHE_TTL_MS,
    });

    console.log(
      `[AIGateway] Tenant ${tenantId}: ${tenantProviders.size} custom + ${merged.size - tenantProviders.size} system provider(s)`,
    );
    return {
      providers: merged,
      fallbackOrder: customFallbackOrder,
      source: "tenant",
    };
  }

  /**
   * Create a provider instance from tenant config
   */
  async _createProviderFromConfig(providerName, config) {
    let provider;

    if (providerName === "openai") {
      const providerConfig =
        config.configType === "azure"
          ? {
              azureEndpoint: config.endpoint,
              azureApiKey: config.apiKey,
              azureDeployment: config.deployment,
              azureApiVersion: config.apiVersion || "2024-12-01-preview",
            }
          : { apiKey: config.apiKey };
      provider = new OpenAIProvider(providerConfig);
    } else if (providerName === "anthropic") {
      const providerConfig =
        config.configType === "azure"
          ? {
              azureEndpoint: config.endpoint,
              azureApiKey: config.apiKey,
              azureDeployment: config.deployment,
            }
          : { apiKey: config.apiKey };
      provider = new AnthropicProvider(providerConfig);
    } else if (providerName === "gemini" || providerName.startsWith("gemini")) {
      provider = new GeminiProvider({
        apiKey: config.apiKey,
        endpoint: config.endpoint,
        apiVersion: config.apiVersion || "v1beta",
      });
    } else if (
      providerName === "open-source" ||
      !["openai", "anthropic"].includes(providerName)
    ) {
      const providerConfig = {
        apiKey: config.apiKey,
        endpoint: config.endpoint,
        cancelUrl: config.cancelUrl,
        // Pass global timeout so real prompts don't time out the way health checks won't
        timeout: parseInt(process.env.AI_PROVIDER_TIMEOUT) || 120000,
      };
      provider = new OpenSourceProvider(providerConfig);

      // If they registered a specific model as the provider, restrict this provider to just that model
      if (providerName !== "open-source") {
        provider.name = providerName;
        provider.displayName = providerName;
        provider.models = [providerName];
        provider.defaultModel = providerName;
      }
    } else {
      return null;
    }

    const success = await provider.initialize();
    if (!success) return null;

    // Override models and pricing if tenant configured them
    if (config.customModels && config.customModels.length > 0) {
      provider.models = config.customModels;
      provider.defaultModel = config.defaultModel || config.customModels[0];
    } else if (config.defaultModel) {
      provider.models = [config.defaultModel];
      provider.defaultModel = config.defaultModel;
    }
    if (config.customPricing && Object.keys(config.customPricing).length > 0) {
      provider.pricing = { ...provider.pricing, ...config.customPricing };
    }

    // Override embedding models if tenant configured them
    if (
      config.customEmbeddingModels &&
      config.customEmbeddingModels.length > 0
    ) {
      provider.embeddingModels = config.customEmbeddingModels;
      provider.defaultEmbeddingModel =
        config.defaultEmbeddingModel || config.customEmbeddingModels[0];
    } else if (config.defaultEmbeddingModel) {
      provider.embeddingModels = [config.defaultEmbeddingModel];
      provider.defaultEmbeddingModel = config.defaultEmbeddingModel;
    }

    provider.usesTenantApiKey = true;
    provider.fallbackProvider = config.fallbackProvider || null;
    return provider;
  }

  // ==================== Public API ====================

  getProviders() {
    const providers = [];
    for (const [name, provider] of this.providers) {
      providers.push({ name, ...provider.getInfo() });
    }
    return providers;
  }

  getProvider(name) {
    return this.providers.get(name);
  }

  getAllModels() {
    const models = [];
    for (const [providerName, provider] of this.providers) {
      for (const model of provider.models) {
        models.push({
          id: model,
          provider: providerName,
          isDefault: model === provider.defaultModel,
          pricing: provider.getPricing(model),
        });
      }
    }
    return models;
  }

  async healthCheck() {
    const results = {};
    for (const [name, provider] of this.providers) {
      results[name] = await provider.healthCheck();
    }
    const healthyCount = Object.values(results).filter((r) => r.healthy).length;
    return {
      healthy: healthyCount > 0,
      providers: results,
      healthyCount,
      totalCount: this.providers.size,
    };
  }

  /**
   * Create a completion — tenant-aware with fallback
   */
  async createCompletion(options, context = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Resolve providers: tenant-specific or system
    const { providers, fallbackOrder, source } = await this._resolveProviders(
      context.tenantId,
    );

    if (providers.size === 0) {
      throw new AIProviderError(
        "NO_PROVIDERS",
        "No AI providers available",
        "gateway",
      );
    }

    // Determine provider order
    let providerOrder = [...fallbackOrder];

    if (options.provider && providers.has(options.provider)) {
      providerOrder = [
        options.provider,
        ...providerOrder.filter((p) => p !== options.provider),
      ];
    }

    // Apply custom fallback provider configuration if defined for the primary provider
    const primaryProvider = providerOrder[0];
    const primaryProviderObj = providers.get(primaryProvider);

    // 1. Per-tenant/per-provider config takes highest priority
    if (
      primaryProviderObj &&
      primaryProviderObj.fallbackProvider &&
      providers.has(primaryProviderObj.fallbackProvider)
    ) {
      const customFallback = primaryProviderObj.fallbackProvider;
      providerOrder = [
        primaryProvider,
        customFallback,
        ...providerOrder.filter(
          (p) => p !== primaryProvider && p !== customFallback,
        ),
      ];
    } else {
      // 2. Fall back to globally configured per-provider mapping from system_settings
      try {
        const database = require("../../config/database");
        const mapRes = await database.query(
          `SELECT setting_value, value_type FROM system_settings
           WHERE category = 'ai' AND setting_key = $1
           AND tenant_id IS NULL LIMIT 1`,
          [AI_SETTING_FALLBACK_MAPPING],
        );
        if (mapRes.rows.length > 0) {
          const raw = mapRes.rows[0].setting_value;
          let mapping = {};
          try {
            mapping = JSON.parse(raw);
          } catch {
            /* ignore */
          }
          const globalFallback = mapping[primaryProvider];
          if (globalFallback && providers.has(globalFallback)) {
            providerOrder = [
              primaryProvider,
              globalFallback,
              ...providerOrder.filter(
                (p) => p !== primaryProvider && p !== globalFallback,
              ),
            ];
          }
        }
      } catch (err) {
        console.warn(
          "[AIGateway] Failed to load global fallback mapping:",
          err.message,
        );
      }
    }

    if (options.model) {
      for (const [name, provider] of providers) {
        if (provider.models.includes(options.model)) {
          providerOrder = [name, ...providerOrder.filter((p) => p !== name)];
          break;
        }
      }
    }

    const errors = [];

    const firstProviderTried = providerOrder[0];

    for (const providerName of providerOrder) {
      const provider = providers.get(providerName);
      if (!provider || !provider.isEnabled) continue;

      try {
        console.log(`[AIGateway] Trying provider: ${providerName} (${source})`);

        const model =
          options.model &&
          Array.isArray(provider.models) &&
          provider.models.includes(options.model)
            ? options.model
            : provider.defaultModel;

        const result = await provider.createCompletion({
          ...options,
          model,
        });

        this._recordCompletion(result, context);

        const fallbackUsed = providerName !== firstProviderTried;
        if (fallbackUsed) {
          this._handleFallbackLogAndNotify({
            tenantId: context.tenantId,
            failedProvider: firstProviderTried,
            failedModel:
              options.model ||
              providers.get(firstProviderTried)?.defaultModel ||
              "unknown",
            fallbackProvider: providerName,
            fallbackModel: result.model,
            errorMessage:
              errors.length > 0
                ? errors[errors.length - 1].error
                : "Unknown provider error",
            failedProviderObj: providers.get(firstProviderTried),
          }).catch((err) =>
            console.error(
              "[AIGateway] Fallback logging/notification failed:",
              err.message,
            ),
          );
        }

        // Attach full attempt trail so callers can surface fallback details
        return {
          ...result,
          fallbackUsed,
          failedAttempts: fallbackUsed ? errors : [],
        };
      } catch (error) {
        console.warn(
          `[AIGateway] Provider ${providerName} failed:`,
          error.message,
        );
        errors.push({ provider: providerName, error: error.message });

        if (error.code === "VALIDATION_ERROR") throw error;
      }
    }

    const err = new AIProviderError(
      "ALL_PROVIDERS_FAILED",
      `All providers failed: ${errors.map((e) => `${e.provider}: ${e.error}`).join("; ")}`,
      "gateway",
    );
    err.failedAttempts = errors;
    throw err;
  }

  async createStreamingCompletion(options, onChunk, context = {}) {
    if (!this.initialized) await this.initialize();

    const { providers } = await this._resolveProviders(context.tenantId);
    const providerName = options.provider || this.defaultProvider;
    const provider = providers.get(providerName);

    if (!provider || !provider.isEnabled) {
      throw new AIProviderError(
        "PROVIDER_UNAVAILABLE",
        `Provider ${providerName} is not available`,
        "gateway",
      );
    }

    const model =
      options.model &&
      Array.isArray(provider.models) &&
      provider.models.includes(options.model)
        ? options.model
        : provider.defaultModel;

    return provider.createStreamingCompletion(
      {
        ...options,
        model,
      },
      onChunk,
    );
  }

  async createEmbedding(input, options = {}) {
    if (!this.initialized) await this.initialize();
    let providers = this.providers;
    if (options.tenantId) {
      const resolved = await this._resolveProviders(options.tenantId);
      providers = resolved.providers;
    }

    const providerName =
      options.provider || this._getEmbeddingProvider(providers);
    if (!providerName) {
      throw new AIProviderError(
        "NO_EMBEDDING_PROVIDER",
        "No embedding-capable provider is available for this tenant. Configure a direct OpenAI provider (embeddings) or pass provider explicitly.",
        "gateway",
      );
    }
    const provider = providers.get(providerName);

    if (!provider || !provider.isEnabled) {
      throw new AIProviderError(
        "PROVIDER_UNAVAILABLE",
        `Provider ${providerName} is not available for embeddings`,
        "gateway",
      );
    }

    const embeddingModel =
      options.model || provider.defaultEmbeddingModel || null;
    if (!embeddingModel) {
      throw new AIProviderError(
        "EMBEDDING_MODEL_NOT_CONFIGURED",
        `Provider ${providerName} does not have an embedding model configured`,
        "gateway",
      );
    }
    return provider.createEmbedding(input, embeddingModel);
  }

  /**
   * Create a multimodal completion (text + files/images).
   * Routes to the first provider that supports multimodal input.
   *
   * options.files = [{ mimeType: 'image/png', data: <base64string> }]
   * options.messages = standard messages array
   */
  async createMultimodalCompletion(options, context = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const { providers, fallbackOrder, source } = await this._resolveProviders(
      context.tenantId,
    );

    if (providers.size === 0) {
      throw new AIProviderError(
        "NO_PROVIDERS",
        "No AI providers available",
        "gateway",
      );
    }

    // Determine which providers support multimodal
    let providerOrder;
    if (options.provider && providers.has(options.provider)) {
      const requested = providers.get(options.provider);
      if (!requested.supportsMultimodal) {
        throw new AIProviderError(
          "MULTIMODAL_NOT_SUPPORTED",
          `Provider ${options.provider} does not support file/image input`,
          "gateway",
        );
      }
      providerOrder = [options.provider];
    } else {
      // Auto-select: prefer providers that support multimodal
      providerOrder = fallbackOrder.filter((name) => {
        const p = providers.get(name);
        return p && p.isEnabled && p.supportsMultimodal;
      });
    }

    if (providerOrder.length === 0) {
      throw new AIProviderError(
        "NO_MULTIMODAL_PROVIDER",
        "No provider with multimodal (vision) support is available. Configure Gemini, OpenAI (GPT-4o), or Anthropic (Claude 3.5+).",
        "gateway",
      );
    }

    const errors = [];

    for (const providerName of providerOrder) {
      const provider = providers.get(providerName);
      if (!provider || !provider.isEnabled) continue;

      try {
        console.log(`[AIGateway] Multimodal → ${providerName} (${source})`);

        const model =
          options.model &&
          Array.isArray(provider.models) &&
          provider.models.includes(options.model)
            ? options.model
            : provider.defaultModel;

        const result = await provider.createMultimodalCompletion({
          ...options,
          model,
        });

        this._recordCompletion(result, context);

        return { ...result, fallbackUsed: providerName !== providerOrder[0] };
      } catch (error) {
        console.warn(
          `[AIGateway] Multimodal ${providerName} failed:`,
          error.message,
        );
        errors.push({ provider: providerName, error: error.message });
      }
    }

    throw new AIProviderError(
      "ALL_PROVIDERS_FAILED",
      `All multimodal providers failed: ${errors.map((e) => `${e.provider}: ${e.error}`).join("; ")}`,
      "gateway",
    );
  }

  estimateCost(provider, model, inputTokens, outputTokens) {
    const prov = this.providers.get(provider);
    if (!prov) return 0;
    return prov.calculateCost(model, inputTokens, outputTokens);
  }

  /**
   * Clear tenant provider cache (called when tenant config changes)
   */
  clearTenantCache(tenantId) {
    if (tenantId) {
      tenantProviderCache.delete(tenantId);
    } else {
      tenantProviderCache.clear();
    }
  }

  async _recordCompletion(result, context) {
    try {
      if (this.eventService) {
        await this.eventService.producer.publish("qassure.ai.events", {
          type: "ai.completion.success",
          data: {
            provider: result.provider,
            model: result.model,
            tokens: result.usage.total_tokens,
            cost: result.cost,
            latency_ms: result.latency_ms,
            tenantId: context.tenantId,
            userId: context.userId,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn(
        "[AIGateway] Failed to record completion event:",
        err.message,
      );
    }
  }

  /**
   * Find the first provider that supports embeddings
   */
  _getEmbeddingProvider(providers = this.providers) {
    // First check known providers in preferred order
    for (const name of ["openai", "gemini", "open-source"]) {
      const provider = providers.get(name);
      if (
        provider &&
        provider.isEnabled &&
        provider.embeddingModels &&
        provider.embeddingModels.length > 0
      ) {
        if (
          name === "openai" &&
          provider.mode === "azure" &&
          !provider.embeddingDeployment
        ) {
          continue;
        }
        return name;
      }
    }
    // Then check any tenant-registered provider (e.g., Mistral7b)
    for (const [name, provider] of providers) {
      if (["openai", "gemini", "open-source"].includes(name)) continue;
      if (
        provider &&
        provider.isEnabled &&
        provider.embeddingModels &&
        provider.embeddingModels.length > 0
      ) {
        return name;
      }
    }
    return null;
  }

  /**
   * Reads the custom fallback order from system settings for this tenant or globally
   */
  async _applyCustomFallbackOrder(fallbackOrder, tenantId) {
    let resolvedFallbackOrder = [...fallbackOrder];
    try {
      const database = require("../../config/database");
      const settingRes = await database.query(
        `SELECT setting_value, value_type FROM system_settings 
         WHERE category = 'ai' AND setting_key = $1 
         AND (tenant_id = $2 OR tenant_id IS NULL)
         ORDER BY tenant_id NULLS LAST LIMIT 1`,
        [AI_SETTING_FALLBACK_ORDER, tenantId],
      );
      if (settingRes.rows.length > 0) {
        const row = settingRes.rows[0];
        let customOrder = [];
        if (
          row.value_type === "json" ||
          row.setting_value.trim().startsWith("[")
        ) {
          customOrder = JSON.parse(row.setting_value);
        } else {
          customOrder = row.setting_value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
        if (Array.isArray(customOrder) && customOrder.length > 0) {
          const ordered = [];
          for (const provider of customOrder) {
            if (fallbackOrder.includes(provider)) {
              ordered.push(provider);
            }
          }
          for (const provider of fallbackOrder) {
            if (!ordered.includes(provider)) {
              ordered.push(provider);
            }
          }
          resolvedFallbackOrder = ordered;
        }
      }
    } catch (err) {
      console.warn(
        "[AIGateway] Failed to load custom fallback order:",
        err.message,
      );
    }
    return resolvedFallbackOrder;
  }

  /**
   * Record fallback incident to history and dispatch real-time alerts to super admins
   */
  async _handleFallbackLogAndNotify(data) {
    const {
      tenantId,
      failedProvider,
      failedModel,
      fallbackProvider,
      fallbackModel,
      errorMessage,
      failedProviderObj,
    } = data;
    const database = require("../../config/database");

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

    let tenantName = "System Global";
    if (tenantId) {
      try {
        const tenantRes = await database.query(
          "SELECT name FROM tenants WHERE id = $1",
          [tenantId],
        );
        if (tenantRes.rows.length > 0) {
          tenantName = tenantRes.rows[0].name;
        }
      } catch (err) {
        console.warn("[AIGateway] Failed to fetch tenant name:", err.message);
      }
    }

    const configDetails = {
      config_type:
        failedProviderObj?.config?.configType ||
        failedProviderObj?.mode ||
        "direct",
      endpoint:
        failedProviderObj?.config?.azureEndpoint ||
        failedProviderObj?.config?.endpoint ||
        "N/A",
      deployment:
        failedProviderObj?.config?.azureDeployment ||
        failedProviderObj?.deployment ||
        "N/A",
      api_version:
        failedProviderObj?.config?.azureApiVersion ||
        failedProviderObj?.config?.apiVersion ||
        "N/A",
      apiKeyMasked: "N/A",
    };

    if (tenantId && failedProvider) {
      try {
        const configRes = await database.query(
          "SELECT config_type, endpoint, deployment, api_version, encrypted_api_key FROM tenant_ai_configs WHERE tenant_id = $1 AND provider = $2",
          [tenantId, failedProvider],
        );
        if (configRes.rows.length > 0) {
          const row = configRes.rows[0];
          configDetails.config_type = row.config_type;
          configDetails.endpoint = row.endpoint || "N/A";
          configDetails.deployment = row.deployment || "N/A";
          configDetails.api_version = row.api_version || "N/A";

          if (row.encrypted_api_key) {
            try {
              const { decrypt, maskApiKey } =
                require("../../services/tenant-ai-config.service").prototype
                  ?._formatForResponse
                  ? require("../../utils/encryption")
                  : { decrypt: (k) => k, maskApiKey: (k) => "****" };
              const decrypted = decrypt(row.encrypted_api_key);
              configDetails.apiKeyMasked = maskApiKey(decrypted);
            } catch (e) {
              configDetails.apiKeyMasked = "********";
            }
          }
        }
      } catch (err) {
        console.warn(
          "[AIGateway] Failed to fetch tenant custom config for log:",
          err.message,
        );
      }
    }

    if (configDetails.apiKeyMasked === "N/A" && failedProviderObj?.config) {
      const rawKey =
        failedProviderObj.config.azureApiKey || failedProviderObj.config.apiKey;
      if (rawKey) {
        configDetails.apiKeyMasked =
          rawKey.length > 8
            ? `${rawKey.substring(0, 4)}...${rawKey.substring(rawKey.length - 4)}`
            : "****";
      }
    }

    await database.query(
      `
      INSERT INTO ai_fallbacks (
        tenant_id, failed_provider, failed_model, fallback_provider, fallback_model, error_message, config_details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        tenantId,
        failedProvider,
        failedModel,
        fallbackProvider,
        fallbackModel,
        errorMessage,
        JSON.stringify(configDetails),
      ],
    );

    try {
      const superAdmins = await database.query(`
        SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, ut.tenant_id
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        LEFT JOIN user_tenants ut ON ut.user_id = u.id
        WHERE r.code = 'super_admin' AND u.status = 'active'
      `);

      if (superAdmins.rows.length === 0) return;

      const {
        getNotificationService,
      } = require("../../services/notification.service");
      const notificationService = getNotificationService();

      const title = `⚠️ AI Provider Fallback Triggered on Tenant: ${tenantName}`;
      const message = `The gateway automatically fell back to ${fallbackProvider} (${fallbackModel}) after primary provider ${failedProvider} failed. Error: ${errorMessage}`;

      const emailSubject = `[Alert] AI Provider Fallback Activated - ${tenantName}`;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
          <h2 style="color: #dd6b20; margin-top: 0;">⚠️ AI Provider Fallback Alert</h2>
          <p>An API call to a primary AI provider failed, and the gateway automatically fell back to a secondary provider.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="background-color: #f7fafc;">
              <td style="padding: 8px; font-weight: bold; border: 1px solid #edf2f7;">Tenant Scope</td>
              <td style="padding: 8px; border: 1px solid #edf2f7;">${tenantName} (${tenantId || "System Global"})</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; border: 1px solid #edf2f7;">Failed Provider</td>
              <td style="padding: 8px; border: 1px solid #edf2f7; text-transform: uppercase;">${failedProvider}</td>
            </tr>
            <tr style="background-color: #f7fafc;">
              <td style="padding: 8px; font-weight: bold; border: 1px solid #edf2f7;">Failed Model</td>
              <td style="padding: 8px; border: 1px solid #edf2f7;">${failedModel}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; border: 1px solid #edf2f7;">Error Details</td>
              <td style="padding: 8px; border: 1px solid #edf2f7; color: #e53e3e;">${errorMessage}</td>
            </tr>
            <tr style="background-color: #f7fafc;">
              <td style="padding: 8px; font-weight: bold; border: 1px solid #edf2f7;">Fallback Provider</td>
              <td style="padding: 8px; border: 1px solid #edf2f7; text-transform: uppercase;">${fallbackProvider}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; border: 1px solid #edf2f7;">Fallback Model</td>
              <td style="padding: 8px; border: 1px solid #edf2f7;">${fallbackModel}</td>
            </tr>
          </table>

          <h3 style="color: #4a5568; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Failed Provider Configuration Details:</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px;">
            <tr>
              <td style="padding: 6px; font-weight: bold;">Config Type</td>
              <td style="padding: 6px;">${configDetails.config_type}</td>
            </tr>
            <tr style="background-color: #f7fafc;">
              <td style="padding: 6px; font-weight: bold;">Endpoint</td>
              <td style="padding: 6px; font-family: monospace;">${configDetails.endpoint}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold;">Deployment Name</td>
              <td style="padding: 6px;">${configDetails.deployment}</td>
            </tr>
            <tr style="background-color: #f7fafc;">
              <td style="padding: 6px; font-weight: bold;">API Version</td>
              <td style="padding: 6px;">${configDetails.api_version}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold;">API Key (Masked)</td>
              <td style="padding: 6px; font-family: monospace;">${configDetails.apiKeyMasked}</td>
            </tr>
          </table>

          <p style="margin-top: 20px; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7; padding-top: 15px;">
            This is an automated platform alert. Please review the AI Fallback Dashboard under Settings for full logs and priority configurations.
          </p>
        </div>
      `;

      for (const admin of superAdmins.rows) {
        const targetTenantId = tenantId || admin.tenant_id;
        if (!targetTenantId) continue;

        await notificationService
          .send(targetTenantId, admin.id, {
            title,
            message,
            notification_type: "alert",
            category: "system",
            priority: "high",
            action_url: "/settings/ai-fallbacks",
          })
          .catch((err) =>
            console.error(
              "[AIGateway] Notification insert failed:",
              err.message,
            ),
          );

        const emailService = require("../email/email.service").getEmailService
          ? require("../email/email.service").getEmailService()
          : null;
        if (emailService && admin.email) {
          await emailService
            .send(admin.email, emailSubject, emailBody, null, targetTenantId)
            .catch(() => {});
        }
      }
    } catch (err) {
      console.warn(
        "[AIGateway] Failed to send fallback notifications to Super Admins:",
        err.message,
      );
    }
  }
}

let instance = null;
const getAIGateway = () => {
  if (!instance) instance = new AIGatewayService();
  return instance;
};

module.exports = { AIGatewayService, getAIGateway };
