/**
 * OpenAI Provider - QAssure Platform
 * Supports both Direct OpenAI API and Azure OpenAI Service
 * Mode is auto-detected from environment variables:
 *   Azure mode:  AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY + AZURE_OPENAI_DEPLOYMENT
 *   Direct mode: OPENAI_API_KEY
 *
 * Environment variables (all optional — override defaults):
 *   AI_PROVIDER_TIMEOUT         Timeout in ms for API calls (default: 60000)
 *   AI_PROVIDER_MAX_RETRIES     Max retries on transient errors (default: 2)
 *   AI_DEFAULT_MAX_TOKENS       Default max tokens for completions (default: 2048)
 *   AI_DEFAULT_LONG_CONTEXT_TOKENS  Default max tokens for long-context/multimodal calls (default: 4096)
 *   AI_PRICING_WARN_AGE_DAYS    Log a warning if pricing table is older than this many days (default: 90)
 *   AI_CANCEL_TIMEOUT           Timeout for cancel requests in ms (default: 5000)
 */
const { OpenAI, AzureOpenAI } = require("openai");
const { BaseAIProvider } = require("./base-provider");

// ── Configurable defaults from env ───────────────────────────────────────────
const DEFAULT_MAX_TOKENS = parseInt(process.env.AI_DEFAULT_MAX_TOKENS) || 2048;
const DEFAULT_LONG_CONTEXT_TOKENS = parseInt(process.env.AI_DEFAULT_LONG_CONTEXT_TOKENS) || 4096;

// ── Pricing table ─────────────────────────────────────────────────────────────
// Last updated: 2025-05-01
// Override per-tenant via custom_pricing in the AI config.
// If AI_PRICING_WARN_AGE_DAYS env var is set and this date is older, a startup warning is logged.
const PRICING_LAST_UPDATED = new Date("2025-05-01");
const PRICING_WARN_AGE_DAYS = parseInt(process.env.AI_PRICING_WARN_AGE_DAYS) || 90;
const pricingAgeDays = Math.floor((Date.now() - PRICING_LAST_UPDATED.getTime()) / 86400000);
if (pricingAgeDays > PRICING_WARN_AGE_DAYS) {
  console.warn(
    `[OpenAI] ⚠️  Pricing table is ${pricingAgeDays} days old (last updated ${PRICING_LAST_UPDATED.toISOString().slice(0, 10)}). ` +
    `OpenAI prices may have changed. Use custom_pricing in the tenant AI config to override.`
  );
}

// Azure OpenAI pricing per 1K tokens (USD) — reference values for QAssure platform-key billing.
// Last updated: 2025-05-01
const AZURE_PRICING = {
  "gpt-4.1": { input: 0.002, output: 0.008 },
};

class OpenAIProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    this.name = "openai";
    this.displayName = "OpenAI";
    this.client = null;
    this.mode = null; // 'azure' or 'direct'
    this.deployment = null;

    // Completion models — fetched live from OpenAI models.list() during _initializeDirect().
    // No hardcoded fallback: if the API call fails, the provider is disabled.
    this.directModels = [];

    // Azure: populated from deployment config only
    this.azureModels = [];

    this.models = [];
    this.defaultModel = null;

    // References the module-level AZURE_PRICING constant.
    this.azurePricing = AZURE_PRICING;

    this.pricing = {};

    // Embedding models — fetched live from OpenAI models.list() during _initializeDirect().
    // Azure: set from embeddingDeployment config. No hardcoded defaults.
    this.embeddingModels = [];
    this.defaultEmbeddingModel = null;
  }

  /**
   * Initialize - auto-detects Azure vs Direct mode
   */
  async initialize() {
    // Priority 1: Azure OpenAI
    const azureEndpoint =
      this.config.azureEndpoint || process.env.AZURE_OPENAI_ENDPOINT;
    const azureApiKey =
      this.config.azureApiKey || process.env.AZURE_OPENAI_API_KEY;
    const azureDeployment =
      this.config.azureDeployment || process.env.AZURE_OPENAI_DEPLOYMENT;
    const azureEmbeddingDeployment =
      this.config.azureEmbeddingDeployment ||
      process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;
    const azureApiVersion =
      this.config.azureApiVersion ||
      process.env.AZURE_OPENAI_API_VERSION ||
      "2024-12-01-preview";

    // Priority 2: Direct OpenAI
    const directApiKey = this.config.apiKey || process.env.OPENAI_API_KEY;

    if (azureEndpoint && azureApiKey) {
      return this._initializeAzure(
        azureEndpoint,
        azureApiKey,
        azureDeployment,
        azureEmbeddingDeployment,
        azureApiVersion,
      );
    }

    if (directApiKey) {
      return this._initializeDirect(directApiKey);
    }

    console.warn(
      "[OpenAI] No API key configured (checked AZURE_OPENAI_* and OPENAI_API_KEY) - provider disabled",
    );
    this.isEnabled = false;
    return false;
  }

  /**
   * Initialize Azure OpenAI mode
   * Requires a deployment name — no hardcoded fallback model.
   */
  async _initializeAzure(endpoint, apiKey, deployment, embeddingDeployment, apiVersion) {
    try {
      this.mode = "azure";

      // Azure requires an explicit deployment name — refuse to start with a hardcoded guess
      if (!deployment) {
        console.error(
          "[OpenAI] ❌ Azure mode requires AZURE_OPENAI_DEPLOYMENT to be set. " +
          "Provider disabled. Set the deployment name in the tenant AI config or env var."
        );
        this.isEnabled = false;
        return false;
      }

      this.deployment = deployment;
      this.embeddingDeployment = embeddingDeployment;

      this.client = new AzureOpenAI({
        endpoint,
        apiKey,
        apiVersion,
        timeout: this.config.timeout || parseInt(process.env.AI_PROVIDER_TIMEOUT) || 60000,
        maxRetries: this.config.maxRetries || parseInt(process.env.AI_PROVIDER_MAX_RETRIES) || 2,
      });

      // Azure model list = the configured deployment(s) only
      this.azureModels = [deployment];
      this.models = this.azureModels;
      this.defaultModel = this.config.defaultModel || this.azureModels[0];

      // Azure embedding: must be configured explicitly — no guessing
      if (embeddingDeployment) {
        this.embeddingModels = [embeddingDeployment];
        this.defaultEmbeddingModel = embeddingDeployment;
      } else {
        console.warn(
          "[OpenAI] ⚠️  No AZURE_OPENAI_EMBEDDING_DEPLOYMENT configured. " +
          "Embedding calls will fail. Set azureEmbeddingDeployment in the tenant AI config."
        );
      }
      this.pricing = this.azurePricing;

      this.isEnabled = true;
      console.log(
        `[OpenAI] ✅ Azure mode initialized | Endpoint: ${endpoint} | Deployment: ${deployment}`,
      );
      return true;
    } catch (error) {
      console.error("[OpenAI] ❌ Azure initialization failed:", error.message);
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Initialize Direct OpenAI API mode.
   * Fetches the live model list from models.list() — NO static fallback.
   * Completion models (gpt-*, o-series) and embedding models (text-embedding-*)
   * are split from the same single API call.
   * If the API call fails, the provider is disabled with a clear error.
   */
  async _initializeDirect(apiKey) {
    try {
      this.mode = "direct";

      this.client = new OpenAI({
        apiKey,
        timeout: this.config.timeout || parseInt(process.env.AI_PROVIDER_TIMEOUT) || 60000,
        maxRetries: this.config.maxRetries || parseInt(process.env.AI_PROVIDER_MAX_RETRIES) || 2,
      });

      // ── Fetch live model list (completion + embedding in one call) ────────
      let fetchOk = false;
      try {
        const modelList = await this.client.models.list();
        const allModels = modelList.data || [];

        // Completion models: gpt-* and o-series (o1, o3, o4-mini, etc.)
        this.directModels = allModels
          .filter(m => m.id.startsWith("gpt-") || /^o\d/.test(m.id))
          .map(m => m.id)
          .sort();

        // Embedding models: text-embedding-*
        this.embeddingModels = allModels
          .filter(m => m.id.startsWith("text-embedding-"))
          .map(m => m.id)
          .sort();

        // Pick sensible defaults: prefer 3-small for embeddings (best cost/quality ratio)
        this.defaultEmbeddingModel =
          this.embeddingModels.find(m => m.includes("3-small")) ||
          this.embeddingModels[0] ||
          null;

        fetchOk = this.directModels.length > 0;
        console.log(
          `[OpenAI] ✅ Fetched ${this.directModels.length} completion model(s) ` +
          `and ${this.embeddingModels.length} embedding model(s) from OpenAI API`
        );
      } catch (fetchErr) {
        console.error(
          `[OpenAI] ❌ Could not fetch model list from OpenAI API: ${fetchErr.message}. ` +
          "Provider disabled. Check OPENAI_API_KEY and AI_PROVIDER_TIMEOUT."
        );
        this.isEnabled = false;
        return false;
      }
      // ────────────────────────────────────────────────────────────────────

      if (!fetchOk) {
        console.error(
          "[OpenAI] ❌ OpenAI returned an empty model list. " +
          "Provider disabled. The API key may lack model access permissions."
        );
        this.isEnabled = false;
        return false;
      }

      this.models = this.directModels;
      this.defaultModel = this.config.defaultModel || this.directModels[0] || null;

      if (!this.defaultModel) {
        console.warn("[OpenAI] No default model available. Set default_model in tenant AI config.");
      }

      this.pricing = {};
      this.isEnabled = true;

      // GPT-4o and GPT-4-turbo support vision
      this.supportsMultimodal = true;
      this.supportedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      console.log("[OpenAI] ✅ Direct API mode initialized");
      return true;
    } catch (error) {
      console.error("[OpenAI] ❌ Direct initialization failed:", error.message);
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Health check - mode-aware
   */
  async healthCheck() {
    if (!this.isEnabled || !this.client) {
      return { healthy: false, error: "Provider not initialized" };
    }

    try {
      const start = Date.now();

      if (this.mode === "azure") {
        // Azure doesn't support models.list() — use a minimal completion
        await this.client.chat.completions.create({
          model: this.deployment || this.defaultModel,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        });
      } else {
        await this.client.models.list();
      }

      const latency = Date.now() - start;

      return {
        healthy: true,
        latency_ms: latency,
        provider: this.name,
        mode: this.mode,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        provider: this.name,
        mode: this.mode,
      };
    }
  }

  /**
   * Create a chat completion - mode-aware
   */
  async createCompletion(options) {
    if (!this.isEnabled || !this.client) {
      throw new Error("OpenAI provider is not enabled");
    }

    const errors = this.validateOptions(options);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }

    // In Azure mode, always use the deployment name
    const model =
      this.mode === "azure"
        ? this.deployment || this.defaultModel
        : options.model || this.defaultModel;

    if (!model) {
      throw new Error(
        "[OpenAI] No model specified and no default_model configured. " +
        "Set default_model in the tenant AI config."
      );
    }

    const start = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens || DEFAULT_MAX_TOKENS,
        top_p: options.top_p ?? 1,
        frequency_penalty: options.frequency_penalty ?? 0,
        presence_penalty: options.presence_penalty ?? 0,
        stop: options.stop || null,
        stream: false,
      }, {
        signal: options.signal
      });

      const latency = Date.now() - start;
      const usage = response.usage || {};
      const cost = this.calculateCost(
        model,
        usage.prompt_tokens || 0,
        usage.completion_tokens || 0,
      );

      return this.formatResponse(
        {
          id: response.id,
          content: response.choices[0]?.message?.content || "",
          usage: {
            prompt_tokens: usage.prompt_tokens || 0,
            completion_tokens: usage.completion_tokens || 0,
            total_tokens: usage.total_tokens || 0,
          },
          finish_reason: response.choices[0]?.finish_reason,
        },
        {
          model,
          cost,
          latency_ms: latency,
        },
      );
    } catch (error) {
      console.error(`[OpenAI] Completion error (${this.mode}):`, error.message);
      throw this._handleError(error, model);
    }
  }

  /**
   * Create a streaming completion
   */
  async createStreamingCompletion(options, onChunk) {
    if (!this.isEnabled || !this.client) {
      throw new Error("OpenAI provider is not enabled");
    }

    const model =
      this.mode === "azure"
        ? this.deployment || this.defaultModel
        : options.model || this.defaultModel;

    if (!model) {
      throw new Error(
        "[OpenAI] No model specified and no default_model configured. " +
        "Set default_model in the tenant AI config."
      );
    }

    const start = Date.now();
    let fullContent = "";

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens || DEFAULT_MAX_TOKENS,
        stream: true,
      }, {
        signal: options.signal
      });

      let requestId = null;
      for await (const chunk of stream) {
        if (chunk.id) {
          requestId = chunk.id;
        }
        const content = chunk.choices?.[0]?.delta?.content || "";
        fullContent += content;

        if (onChunk) {
          onChunk({ ...chunk, content, done: false });
        }
      }

      const latency = Date.now() - start;

      if (onChunk) {
        onChunk({ content: "", done: true, fullContent, latency_ms: latency });
      }

      return {
        content: fullContent,
        model,
        provider: this.name,
        latency_ms: latency,
        requestId,
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Create embeddings (Direct mode only — Azure embeddings need separate deployment)
   */
  async createEmbedding(input, model = null) {
    if (!this.isEnabled || !this.client) {
      throw new Error("OpenAI provider is not enabled");
    }

    const embeddingModel =
      model ||
      (this.mode === "azure"
        ? this.embeddingDeployment
        : this.defaultEmbeddingModel) ||
      this.defaultEmbeddingModel;

    try {
      const response = await this.client.embeddings.create({
        model: embeddingModel,
        input: Array.isArray(input) ? input : [input],
      });

      return {
        embeddings: response.data.map((d) => d.embedding),
        model: embeddingModel,
        usage: response.usage,
        provider: this.name,
      };
    } catch (error) {
      throw this._handleError(error, embeddingModel);
    }
  }

  /**
   * Create a multimodal completion with image input.
   * OpenAI GPT-4o supports images via data URI in content array.
   *
   * options.files = [{ mimeType: 'image/png', data: <base64string> }]
   */
  async createMultimodalCompletion(options) {
    if (!this.isEnabled || !this.client) {
      throw new Error("OpenAI provider is not enabled");
    }

    const model = this.mode === "azure"
      ? (this.deployment || this.defaultModel)
      : (options.model || this.defaultModel);

    if (!model) {
      throw new Error(
        "[OpenAI] No model specified and no default_model configured. " +
        "Set default_model in the tenant AI config."
      );
    }

    const start = Date.now();

    try {
      // Convert messages: inject files into the last user message as image_url content blocks
      const messages = options.messages.map(msg => {
        if (msg.role === "user") return { ...msg };
        return msg;
      });

      if (options.files && options.files.length > 0) {
        const lastUserIdx = messages.map(m => m.role).lastIndexOf("user");
        if (lastUserIdx !== -1) {
          const textContent = messages[lastUserIdx].content;
          const contentParts = [{ type: "text", text: textContent }];

          for (const file of options.files) {
            contentParts.push({
              type: "image_url",
              image_url: {
                url: `data:${file.mimeType};base64,${file.data}`,
                detail: "auto"
              }
            });
          }

          messages[lastUserIdx].content = contentParts;
        }
      }

      const response = await this.client.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens || DEFAULT_LONG_CONTEXT_TOKENS,
        stream: false
      });

      const latency = Date.now() - start;
      const usage = response.usage || {};
      const cost = this.calculateCost(model, usage.prompt_tokens || 0, usage.completion_tokens || 0);

      return this.formatResponse({
        id: response.id,
        content: response.choices[0]?.message?.content || "",
        usage: {
          prompt_tokens: usage.prompt_tokens || 0,
          completion_tokens: usage.completion_tokens || 0,
          total_tokens: usage.total_tokens || 0
        },
        finish_reason: response.choices[0]?.finish_reason
      }, {
        model,
        cost,
        latency_ms: latency
      });
    } catch (error) {
      console.error(`[OpenAI] Multimodal completion error (${this.mode}):`, error.message);
      throw this._handleError(error, model);
    }
  }

  /**
   * Get provider info with mode
   */
  getInfo() {
    return {
      ...super.getInfo(),
      mode: this.mode,
      deployment: this.deployment,
    };
  }

  /**
   * Handle and transform errors
   */
  _handleError(error, deploymentName = null) {
    if (error.status === 429) {
      return new AIProviderError(
        "RATE_LIMITED",
        `OpenAI rate limit exceeded (${this.mode})`,
        this.name,
      );
    }
    if (error.status === 401) {
      return new AIProviderError(
        "AUTH_FAILED",
        `OpenAI authentication failed (${this.mode})`,
        this.name,
      );
    }
    if (error.status === 404 && this.mode === "azure") {
      return new AIProviderError(
        "DEPLOYMENT_NOT_FOUND",
        `Azure deployment not found: ${deploymentName || this.deployment}`,
        this.name,
      );
    }
    if (error.status === 503) {
      return new AIProviderError(
        "SERVICE_UNAVAILABLE",
        `OpenAI service unavailable (${this.mode})`,
        this.name,
      );
    }
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      return new AIProviderError(
        "CONNECTION_FAILED",
        `Failed to connect to OpenAI (${this.mode})`,
        this.name,
      );
    }

    return new AIProviderError("PROVIDER_ERROR", error.message, this.name);
  }

  async cancelExecution(requestId, providerConfig = {}) {
    return true;
  }
}

/**
 * AI Provider Error
 */
class AIProviderError extends Error {
  constructor(code, message, provider) {
    super(message);
    this.name = "AIProviderError";
    this.code = code;
    this.provider = provider;
  }
}

module.exports = { OpenAIProvider, AIProviderError };
