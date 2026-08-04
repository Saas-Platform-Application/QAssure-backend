/**
 * Anthropic Provider - QAssure Platform
 * Supports both Direct Anthropic API and Azure AI Foundry
 * Mode is auto-detected from environment variables:
 *   Azure mode:  AZURE_ANTHROPIC_ENDPOINT + AZURE_AI_API_KEY + AZURE_ANTHROPIC_DEPLOYMENT
 *   Direct mode: ANTHROPIC_API_KEY
 *
 * Environment variables (all optional — override defaults):
 *   AI_PROVIDER_TIMEOUT         Timeout in ms for API calls (default: 60000)
 *   AI_PROVIDER_MAX_RETRIES     Max retries on transient errors (default: 2)
 *   AI_DEFAULT_MAX_TOKENS       Default max tokens for completions (default: 2048)
 *   AI_DEFAULT_LONG_CONTEXT_TOKENS  Default max tokens for long-context/multimodal (default: 4096)
 *   AI_PRICING_WARN_AGE_DAYS    Warn if pricing table is older than N days (default: 90)
 */
const Anthropic = require('@anthropic-ai/sdk');
const { BaseAIProvider } = require('./base-provider');
const { AIProviderError } = require('./openai.provider');

// ── Configurable defaults from env ───────────────────────────────────────────
const DEFAULT_MAX_TOKENS = parseInt(process.env.AI_DEFAULT_MAX_TOKENS) || 2048;
const DEFAULT_LONG_CONTEXT_TOKENS = parseInt(process.env.AI_DEFAULT_LONG_CONTEXT_TOKENS) || 4096;

// ── Pricing table ─────────────────────────────────────────────────────────────
// Last updated: 2025-05-01
// Override per-tenant via custom_pricing in the AI config.
const PRICING_LAST_UPDATED = new Date("2025-05-01");
const PRICING_WARN_AGE_DAYS = parseInt(process.env.AI_PRICING_WARN_AGE_DAYS) || 90;
const pricingAgeDays = Math.floor((Date.now() - PRICING_LAST_UPDATED.getTime()) / 86400000);
if (pricingAgeDays > PRICING_WARN_AGE_DAYS) {
  console.warn(
    `[Anthropic] ⚠️  Pricing table is ${pricingAgeDays} days old (last updated ${PRICING_LAST_UPDATED.toISOString().slice(0, 10)}). ` +
    `Anthropic prices may have changed. Use custom_pricing in the tenant AI config to override.`
  );
}

// Azure Foundry pricing per 1K tokens (USD) — reference values for QAssure platform-key billing.
// Last updated: 2025-05-01
const AZURE_PRICING = {
  'claude-sonnet-4-5': { input: 0.003, output: 0.015 }
};


class AnthropicProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'anthropic';
    this.displayName = 'Anthropic Claude';
    this.client = null;
    this.mode = null; // 'azure' or 'direct'
    this.deployment = null;

    // Completion models — fetched live from Anthropic models.list() during _initializeDirect().
    // No hardcoded fallback: if the API call fails, the provider is disabled.
    this.directModels = [];

    // Azure: populated from deployment config only
    this.azureModels = [];

    this.models = [];
    this.defaultModel = null;

    // References the module-level AZURE_PRICING constant.
    this.azurePricing = AZURE_PRICING;

    this.pricing = {};
  }

  /**
   * Initialize - auto-detects Azure vs Direct mode
   */
  async initialize() {
    // Priority 1: Azure AI Foundry
    const azureEndpoint = this.config.azureEndpoint || process.env.AZURE_ANTHROPIC_ENDPOINT;
    const azureApiKey = this.config.azureApiKey || process.env.AZURE_AI_API_KEY;
    const azureDeployment = this.config.azureDeployment || process.env.AZURE_ANTHROPIC_DEPLOYMENT;

    // Priority 2: Direct Anthropic
    const directApiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY;

    if (azureEndpoint && azureApiKey) {
      return this._initializeAzure(azureEndpoint, azureApiKey, azureDeployment);
    }

    if (directApiKey) {
      return this._initializeDirect(directApiKey);
    }

    console.warn('[Anthropic] No API key configured (checked AZURE_ANTHROPIC_* and ANTHROPIC_API_KEY) - provider disabled');
    this.isEnabled = false;
    return false;
  }

  /**
   * Initialize Azure AI Foundry mode.
   * Requires an explicit deployment name — no hardcoded fallback model.
   */
  async _initializeAzure(endpoint, apiKey, deployment) {
    try {
      this.mode = 'azure';

      // Azure requires an explicit deployment — refuse to start with a hardcoded guess
      if (!deployment) {
        console.error(
          '[Anthropic] ❌ Azure Foundry mode requires AZURE_ANTHROPIC_DEPLOYMENT to be set. ' +
          'Provider disabled. Set the deployment name in the tenant AI config or env var.'
        );
        this.isEnabled = false;
        return false;
      }

      this.deployment = deployment;

      // Azure AI Foundry requires:
      //   - Authorization: Bearer <key> (not x-api-key)
      //   - anthropic-version header
      // The Anthropic SDK sends x-api-key by default, so we override via authToken + defaultHeaders
      const baseURL = endpoint.endsWith('/') ? endpoint : endpoint + '/';
      this.client = new Anthropic({
        apiKey: 'dummy',
        baseURL,
        timeout: this.config.timeout || parseInt(process.env.AI_PROVIDER_TIMEOUT) || 60000,
        maxRetries: this.config.maxRetries || parseInt(process.env.AI_PROVIDER_MAX_RETRIES) || 2,
        defaultHeaders: {
          'Authorization': `Bearer ${apiKey}`,
          'anthropic-version': '2023-06-01'
        }
      });

      this.azureModels = [this.deployment];
      this.models = this.azureModels;
      this.defaultModel = this.config.defaultModel || this.deployment;
      this.pricing = this.azurePricing;

      this.isEnabled = true;
      console.log(`[Anthropic] ✅ Azure Foundry mode initialized | Endpoint: ${endpoint} | Deployment: ${this.deployment}`);
      return true;
    } catch (error) {
      console.error('[Anthropic] ❌ Azure initialization failed:', error.message);
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Initialize Direct Anthropic API mode.
   * Fetches the live model list from models.list() — NO static fallback.
   * If the API call fails, the provider is disabled with a clear error.
   */
  async _initializeDirect(apiKey) {
    try {
      this.mode = 'direct';

      this.client = new Anthropic({
        apiKey,
        timeout: this.config.timeout || parseInt(process.env.AI_PROVIDER_TIMEOUT) || 60000,
        maxRetries: this.config.maxRetries || parseInt(process.env.AI_PROVIDER_MAX_RETRIES) || 2,
      });

      // ── Fetch live model list — NO static fallback ────────────────────────
      let fetchOk = false;
      try {
        const modelPage = await this.client.models.list();
        const liveModels = (modelPage.data || [])
          .filter(m => m.id.startsWith('claude'))
          .map(m => m.id);

        if (liveModels.length > 0) {
          this.directModels = liveModels;
          fetchOk = true;
          console.log(`[Anthropic] ✅ Fetched ${liveModels.length} live model(s) from Anthropic API`);
        } else {
          console.error(
            '[Anthropic] ❌ Anthropic API returned an empty model list. ' +
            'Provider disabled. The API key may lack model access permissions.'
          );
        }
      } catch (fetchErr) {
        console.error(
          `[Anthropic] ❌ Could not fetch model list from Anthropic API: ${fetchErr.message}. ` +
          'Provider disabled. Check ANTHROPIC_API_KEY and AI_PROVIDER_TIMEOUT.'
        );
        this.isEnabled = false;
        return false;
      }
      // ─────────────────────────────────────────────────────────────────────

      if (!fetchOk) {
        this.isEnabled = false;
        return false;
      }

      this.models = this.directModels;
      this.defaultModel = this.config.defaultModel || this.directModels[0] || null;

      if (!this.defaultModel) {
        console.warn('[Anthropic] No default model available. Set default_model in tenant AI config.');
      }

      this.pricing = {};
      this.isEnabled = true;

      // Claude 3.5+ supports vision
      this.supportsMultimodal = true;
      this.supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      console.log('[Anthropic] ✅ Direct API mode initialized');
      return true;
    } catch (error) {
      console.error('[Anthropic] ❌ Direct initialization failed:', error.message);
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Health check - mode-aware
   */
  async healthCheck() {
    if (!this.isEnabled || !this.client) {
      return { healthy: false, error: 'Provider not initialized' };
    }

    try {
      const start = Date.now();

      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }]
      });

      const latency = Date.now() - start;

      return {
        healthy: true,
        latency_ms: latency,
        provider: this.name,
        mode: this.mode
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        provider: this.name,
        mode: this.mode
      };
    }
  }

  /**
   * Create a chat completion - mode-aware
   */
  async createCompletion(options) {
    if (!this.isEnabled || !this.client) {
      throw new Error('Anthropic provider is not enabled');
    }

    const errors = this.validateOptions(options);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // In Azure mode, use the deployment name
    const model = this.mode === 'azure'
      ? this.deployment
      : (options.model || this.defaultModel);

    if (!model) {
      throw new Error(
        '[Anthropic] No model specified and no default_model configured. ' +
        'Set default_model in the tenant AI config.'
      );
    }

    const start = Date.now();

    try {
      const { system, messages } = this._convertMessages(options.messages);

      const requestParams = {
        model,
        max_tokens: options.max_tokens || DEFAULT_MAX_TOKENS,
        messages,
        temperature: options.temperature ?? 0.7,
        stop_sequences: options.stop || undefined
      };

      // Azure Foundry Claude rejects temperature + top_p together
      if (this.mode !== 'azure' && options.top_p !== undefined) {
        requestParams.top_p = options.top_p;
      }

      if (system) {
        requestParams.system = system;
      }

      const response = await this.client.messages.create(requestParams, { signal: options.signal });

      const latency = Date.now() - start;
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      const cost = this.calculateCost(model, inputTokens, outputTokens);

      return this.formatResponse({
        id: response.id,
        content: response.content[0]?.text || '',
        usage: {
          prompt_tokens: inputTokens,
          completion_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens
        },
        finish_reason: response.stop_reason
      }, {
        model,
        cost,
        latency_ms: latency
      });
    } catch (error) {
      console.error(`[Anthropic] Completion error (${this.mode}):`, error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Create a streaming completion
   */
  async createStreamingCompletion(options, onChunk) {
    if (!this.isEnabled || !this.client) {
      throw new Error('Anthropic provider is not enabled');
    }

    const model = this.mode === 'azure'
      ? this.deployment
      : (options.model || this.defaultModel);

    if (!model) {
      throw new Error(
        '[Anthropic] No model specified and no default_model configured. ' +
        'Set default_model in the tenant AI config.'
      );
    }

    const start = Date.now();
    let fullContent = '';

    try {
      const { system, messages } = this._convertMessages(options.messages);

      const requestParams = {
        model,
        max_tokens: options.max_tokens || DEFAULT_MAX_TOKENS,
        messages,
        temperature: options.temperature ?? 0.7,
        stream: true
      };

      if (system) {
        requestParams.system = system;
      }

      const stream = await this.client.messages.stream(requestParams, { signal: options.signal });

      let requestId = null;
      for await (const event of stream) {
        if (event.message?.id) {
          requestId = event.message.id;
        } else if (event.id) {
          requestId = event.id;
        }
        let content = '';
        if (event.type === 'content_block_delta') {
          content = event.delta?.text || '';
          fullContent += content;
        }

        if (onChunk) {
          onChunk({ ...event, content, done: false });
        }
      }

      const latency = Date.now() - start;

      if (onChunk) {
        onChunk({ content: '', done: true, fullContent, latency_ms: latency });
      }

      return {
        content: fullContent,
        model,
        provider: this.name,
        latency_ms: latency,
        requestId
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Convert OpenAI-style messages to Anthropic format
   */
  _convertMessages(messages) {
    let system = null;
    const convertedMessages = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = msg.content;
      } else {
        convertedMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      }
    }

    return { system, messages: this._validateMessageOrder(convertedMessages) };
  }

  /**
   * Ensure messages alternate and start with user
   */
  _validateMessageOrder(messages) {
    if (messages.length === 0) {
      return [{ role: 'user', content: 'Hello' }];
    }

    const validated = [];
    let lastRole = null;

    for (const msg of messages) {
      if (msg.role === lastRole) {
        validated[validated.length - 1].content += '\n' + msg.content;
        continue;
      }

      if (validated.length === 0 && msg.role === 'assistant') {
        validated.push({ role: 'user', content: '...' });
      }

      validated.push(msg);
      lastRole = msg.role;
    }

    return validated;
  }

  /**
   * Create embeddings (not supported by Anthropic)
   */
  async createEmbedding(input) {
    throw new AIProviderError(
      'NOT_SUPPORTED',
      'Anthropic does not support embeddings. Use OpenAI or another provider.',
      this.name
    );
  }

  /**
   * Create a multimodal completion with image input.
   * Anthropic Claude supports images via base64 source blocks.
   *
   * options.files = [{ mimeType: 'image/png', data: <base64string> }]
   */
  async createMultimodalCompletion(options) {
    if (!this.isEnabled || !this.client) {
      throw new Error('Anthropic provider is not enabled');
    }

    const model = this.mode === 'azure'
      ? this.deployment
      : (options.model || this.defaultModel);

    if (!model) {
      throw new Error(
        '[Anthropic] No model specified and no default_model configured. ' +
        'Set default_model in the tenant AI config.'
      );
    }

    const start = Date.now();

    try {
      const { system, messages } = this._convertMessages(options.messages);

      // Inject files into the last user message as image content blocks
      if (options.files && options.files.length > 0) {
        const lastUserIdx = messages.map(m => m.role).lastIndexOf('user');
        if (lastUserIdx !== -1) {
          const textContent = messages[lastUserIdx].content;
          const contentParts = [];

          for (const file of options.files) {
            contentParts.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: file.mimeType,
                data: file.data
              }
            });
          }

          contentParts.push({ type: 'text', text: textContent });
          messages[lastUserIdx].content = contentParts;
        }
      }

      const requestParams = {
        model,
        max_tokens: options.max_tokens || DEFAULT_LONG_CONTEXT_TOKENS,
        messages,
        temperature: options.temperature ?? 0.7
      };

      if (this.mode !== 'azure' && options.top_p !== undefined) {
        requestParams.top_p = options.top_p;
      }

      if (system) {
        requestParams.system = system;
      }

      const response = await this.client.messages.create(requestParams);

      const latency = Date.now() - start;
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      const cost = this.calculateCost(model, inputTokens, outputTokens);

      return this.formatResponse({
        id: response.id,
        content: response.content[0]?.text || '',
        usage: {
          prompt_tokens: inputTokens,
          completion_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens
        },
        finish_reason: response.stop_reason
      }, {
        model,
        cost,
        latency_ms: latency
      });
    } catch (error) {
      console.error(`[Anthropic] Multimodal completion error (${this.mode}):`, error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Get provider info with mode
   */
  getInfo() {
    return {
      ...super.getInfo(),
      mode: this.mode,
      deployment: this.deployment
    };
  }

  /**
   * Handle and transform errors
   */
  _handleError(error) {
    if (error.status === 429) {
      return new AIProviderError('RATE_LIMITED', `Anthropic rate limit exceeded (${this.mode})`, this.name);
    }
    if (error.status === 401) {
      return new AIProviderError('AUTH_FAILED', `Anthropic authentication failed (${this.mode})`, this.name);
    }
    if (error.status === 503 || error.status === 529) {
      return new AIProviderError('SERVICE_UNAVAILABLE', `Anthropic service unavailable (${this.mode})`, this.name);
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return new AIProviderError('CONNECTION_FAILED', `Failed to connect to Anthropic (${this.mode})`, this.name);
    }

    return new AIProviderError('PROVIDER_ERROR', error.message, this.name);
  }

  async cancelExecution(requestId, providerConfig = {}) {
    return true;
  }
}

module.exports = { AnthropicProvider };