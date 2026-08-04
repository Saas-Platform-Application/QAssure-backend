/**
 * Base AI Provider - QAssure Platform
 * Abstract base class for all AI providers
 */

class BaseAIProvider {
  constructor(config = {}) {
    this.name = 'base';
    this.displayName = 'Base Provider';
    this.config = config;
    this.isEnabled = false;
    this.models = [];
    this.defaultModel = null;
    /** When true (tenant BYOK), platform billing is zero — user pays the vendor directly. */
    this.usesTenantApiKey = false;
    /** Whether this provider supports file/image input (vision models). */
    this.supportsMultimodal = false;
  }

  /**
   * Initialize the provider
   */
  async initialize() {
    throw new Error('Method initialize() must be implemented');
  }

  /**
   * Check if provider is healthy
   */
  async healthCheck() {
    throw new Error('Method healthCheck() must be implemented');
  }

  /**
   * Create a chat completion
   */
  async createCompletion(options) {
    throw new Error('Method createCompletion() must be implemented');
  }

  /**
   * Create embeddings
   */
  async createEmbedding(text) {
    throw new Error('Method createEmbedding() must be implemented');
  }

  /**
   * Cancel an active completion request
   */
  async cancelExecution(requestId, providerConfig = {}) {
    return true;
  }

  /**
   * Get available models
   */
  getModels() {
    return this.models;
  }

  /**
   * Get default model
   */
  getDefaultModel() {
    return this.defaultModel;
  }

  /**
   * Calculate cost for tokens used.
   *
   * Cost rules:
   *   - usesTenantApiKey = true  → tenant pays the provider directly → cost = 0
   *   - usesTenantApiKey = false → tenant uses QAssure platform keys  → cost calculated from raw model pricing
   */
  calculateCost(model, inputTokens, outputTokens) {
    if (this.usesTenantApiKey) return 0;
    const pricing = this.getPricing(model);
    if (!pricing) return 0;

    const baseCost =
      (inputTokens / 1000) * pricing.input +
      (outputTokens / 1000) * pricing.output;

    return parseFloat(baseCost.toFixed(8));
  }

  /**
   * Get pricing for a model (per 1K tokens)
   */
  getPricing(model) {
    return this.pricing?.[model] || null;
  }

  /**
   * Get provider info
   */
  getInfo() {
    return {
      name: this.name,
      displayName: this.displayName,
      isEnabled: this.isEnabled,
      models: this.models,
      defaultModel: this.defaultModel
    };
  }

  /**
   * Validate completion options
   */
  validateOptions(options) {
    const errors = [];
    
    if (!options.messages || !Array.isArray(options.messages)) {
      errors.push('messages must be an array');
    }
    
    if (options.messages?.length === 0) {
      errors.push('messages cannot be empty');
    }
    
    if (options.temperature !== undefined) {
      if (options.temperature < 0 || options.temperature > 2) {
        errors.push('temperature must be between 0 and 2');
      }
    }
    
    if (options.max_tokens !== undefined) {
      if (options.max_tokens < 1) {
        errors.push('max_tokens must be at least 1');
      }
    }
    
    return errors;
  }

  /**
   * Format response to standard structure
   */
  formatResponse(rawResponse, metadata = {}) {
    return {
      id: rawResponse.id || `${this.name}_${Date.now()}`,
      provider: this.name,
      model: metadata.model || this.defaultModel,
      content: rawResponse.content || '',
      usage: {
        prompt_tokens: rawResponse.usage?.prompt_tokens || 0,
        completion_tokens: rawResponse.usage?.completion_tokens || 0,
        total_tokens: rawResponse.usage?.total_tokens || 0
      },
      cost: metadata.cost || 0,
      latency_ms: metadata.latency_ms || 0,
      created_at: new Date().toISOString(),
      raw: rawResponse
    };
  }

  /**
   * Create a multimodal completion (text + file/image input).
   * Providers that support vision should override this.
   */
  async createMultimodalCompletion(options) {
    throw new Error(`Provider ${this.name} does not support multimodal input`);
  }
}

module.exports = { BaseAIProvider };
