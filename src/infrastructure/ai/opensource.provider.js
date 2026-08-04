/**
 * Open Source AI Provider - QAssure Platform
 * Interacts with OpenAI-compatible endpoints (like vLLM, Ollama, Together, Groq, etc)
 *
 * IMPORTANT: This provider has NO built-in model list.
 * Every tenant using open-source models MUST set custom_models and default_model
 * in their AI config. Without these, completions will throw a descriptive error.
 *
 * Environment variables (all optional — override defaults):
 *   AI_PROVIDER_TIMEOUT         Timeout in ms for chat API calls (default: 120000)
 *   AI_PROVIDER_MAX_RETRIES     Max retries on transient errors (default: 2)
 *   AI_DEFAULT_MAX_TOKENS       Default max tokens for completions (default: 2048)
 *   AI_CANCEL_TIMEOUT           Timeout for cancel requests in ms (default: 5000)
 *   OPEN_SOURCE_EMBEDDING_MODEL Default embedding model name (default: nomic-embed-text)
 */
const { OpenAI } = require("openai");
const { BaseAIProvider } = require("./base-provider");

// ── Configurable defaults from env ───────────────────────────────────────────
const DEFAULT_MAX_TOKENS = parseInt(process.env.AI_DEFAULT_MAX_TOKENS) || 2048;
const CANCEL_TIMEOUT = parseInt(process.env.AI_CANCEL_TIMEOUT) || 5000;

class OpenSourceProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    this.name = "open-source";
    this.displayName = "Open Source";
    this.client = null;

    // NOTE: No built-in model list — all models must come from custom_models in tenant config.
    // An empty array is intentional; the gateway will populate it from the tenant's custom_models.
    this.models = [];
    this.defaultModel = null;

    // Embedding models — MUST be set via custom_embedding_models / default_embedding_model
    // in the tenant AI config. There are no built-in defaults because open-source embedding
    // model names vary per deployment (Ollama, vLLM, etc.).
    // If these remain null/empty, createEmbedding() will throw a clear configuration error.
    this.embeddingModels = [];
    this.defaultEmbeddingModel = null;

    // Cost calculation is explicitly disabled (0) for BYOK open-source models
    this.pricing = {};

    this.supportsMultimodal = true;
    this.supportedMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
    ];
  }

  async initialize() {
    const apiKey =
      this.config.api_key || this.config.apiKey || "dummy-key-if-not-needed";
    const baseURL = this.config.endpoint;

    if (!baseURL) {
      console.warn(
        "[OpenSource] No endpoint URL configured - provider disabled",
      );
      this.isEnabled = false;
      return false;
    }

    if (this.config.defaultModel || this.config.default_model) {
      this.defaultModel = this.config.defaultModel || this.config.default_model;
    }

    // Apply embedding config from tenant settings ONLY — no env var or static fallback.
    if (this.config.customEmbeddingModels && this.config.customEmbeddingModels.length > 0) {
      this.embeddingModels = this.config.customEmbeddingModels;
      this.defaultEmbeddingModel =
        this.config.defaultEmbeddingModel || this.config.customEmbeddingModels[0];
    } else if (this.config.defaultEmbeddingModel) {
      this.embeddingModels = [this.config.defaultEmbeddingModel];
      this.defaultEmbeddingModel = this.config.defaultEmbeddingModel;
    } else {
      console.warn(
        "[OpenSource] ⚠️  No embedding models configured. " +
        "Set custom_embedding_models and default_embedding_model in the tenant AI config " +
        "before calling createEmbedding()."
      );
    }

    try {
      // Sanitize baseURL - OpenAI SDK expects the base path (e.g., http://host:port/v1)
      // If user provides the full chat/completions endpoint, strip it.
      let sanitizedBaseURL = baseURL;
      if (sanitizedBaseURL.endsWith("/chat/completions")) {
        sanitizedBaseURL = sanitizedBaseURL.replace("/chat/completions", "");
        console.log(
          `[OpenSource] Sanitized endpoint for SDK: ${sanitizedBaseURL}`,
        );
      }

      this.client = new OpenAI({
        apiKey,
        baseURL: sanitizedBaseURL,
        // Use AI_PROVIDER_TIMEOUT env var (default 120s) — health check uses max_tokens:5
        // and returns quickly, but real prompt execution can take much longer.
        timeout:
          this.config.timeout ||
          parseInt(process.env.AI_PROVIDER_TIMEOUT) ||
          120000,
        maxRetries:
          this.config.maxRetries ||
          parseInt(process.env.AI_PROVIDER_MAX_RETRIES) ||
          2,
      });

      this.isEnabled = true;
      console.log(`[OpenSource] ✅ Mode initialized | Endpoint: ${baseURL}`);

      if (!this.defaultModel) {
        console.warn(
          "[OpenSource] ⚠️  No default_model configured. " +
          "Set custom_models and default_model in the tenant AI config before making completion calls."
        );
      }

      return true;
    } catch (error) {
      console.error("[OpenSource] ❌ Initialization failed:", error.message);
      this.isEnabled = false;
      return false;
    }
  }

  async healthCheck() {
    if (!this.isEnabled || !this.client) {
      return { healthy: false, error: "Provider not initialized" };
    }

    try {
      const start = Date.now();

      // Send a very minimal completion to verify the API works
      await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
      });

      const latency = Date.now() - start;

      return {
        healthy: true,
        latency_ms: latency,
        provider: this.name,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        provider: this.name,
      };
    }
  }

  async createCompletion(options) {
    if (!this.isEnabled || !this.client) {
      throw new Error("OpenSource provider is not enabled");
    }

    const errors = this.validateOptions(options);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }

    const model = options.model || this.defaultModel;

    if (!model) {
      throw new Error(
        "[OpenSource] No model specified and no default_model configured. " +
        "Set custom_models and default_model in the tenant AI config for this provider."
      );
    }

    const start = Date.now();

    try {
      const extra_body = {};
      if (options.conversation_id)
        extra_body.conversation_id = options.conversation_id;
      if (options.reset !== undefined) extra_body.reset = options.reset;

      const requestPayload = {
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens || DEFAULT_MAX_TOKENS,
        top_p: options.top_p ?? 1,
        stream: false,
        extra_body: Object.keys(extra_body).length > 0 ? extra_body : undefined,
      };
      if (options.stop !== undefined) {
        requestPayload.stop = options.stop;
      }

      const response = await this.client.chat.completions.create(
        requestPayload,
        { signal: options.signal },
      );

      const latency = Date.now() - start;
      let content = "";
      let requestId = null;
      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;
      let finishReason = "stop";

      if (typeof response === "string") {
        // Parse the SSE chunks from the string
        const lines = response.split("\n");
        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("data:")) {
            const dataStr = cleanLine.substring(5).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.request_id) {
                requestId = data.request_id;
              }
              if (data.choices?.[0]?.delta?.content) {
                content += data.choices[0].delta.content;
              } else if (data.choices?.[0]?.message?.content) {
                content += data.choices[0].message.content;
              }
              if (data.usage) {
                promptTokens = data.usage.prompt_tokens || promptTokens;
                completionTokens =
                  data.usage.completion_tokens || completionTokens;
                totalTokens = data.usage.total_tokens || totalTokens;
              }
              if (data.choices?.[0]?.finish_reason) {
                finishReason = data.choices[0].finish_reason;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
        if (promptTokens === 0 && completionTokens === 0) {
          promptTokens = Math.ceil(
            options.messages.map((m) => m.content).join(" ").length / 4,
          );
          completionTokens = Math.ceil(content.length / 4);
          totalTokens = promptTokens + completionTokens;
        }
      } else {
        const usage = response.usage || {};
        content =
          response?.choices?.[0]?.message?.content ??
          response?.message?.content ??
          response?.response ??
          "";
        finishReason =
          response?.choices?.[0]?.finish_reason ??
          response?.done_reason ??
          (response?.done ? "stop" : null);
        promptTokens = usage.prompt_tokens ?? response?.prompt_eval_count ?? 0;
        completionTokens = usage.completion_tokens ?? response?.eval_count ?? 0;
        totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
        requestId = response.request_id || response.id;
      }

      // Cost is guaranteed to remain 0 for open-source BYOK models
      const cost = 0;

      return this.formatResponse(
        {
          id: requestId || (response && response.id),
          content,
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
          },
          finish_reason: finishReason,
        },
        {
          model,
          cost,
          latency_ms: latency,
        },
      );
    } catch (error) {
      console.error(`[OpenSource] Completion error:`, error.message);
      throw this._handleError(error);
    }
  }

  async createStreamingCompletion(options, onChunk) {
    if (!this.isEnabled || !this.client) {
      throw new Error("OpenSource provider is not enabled");
    }

    const model = options.model || this.defaultModel;

    if (!model) {
      throw new Error(
        "[OpenSource] No model specified and no default_model configured. " +
        "Set custom_models and default_model in the tenant AI config for this provider."
      );
    }

    const start = Date.now();
    let fullContent = "";
    let requestId = null;

    try {
      const stream = await this.client.chat.completions.create(
        {
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens || DEFAULT_MAX_TOKENS,
          stream: true,
        },
        { signal: options.signal },
      );

      for await (const chunk of stream) {
        if (chunk.request_id) {
          requestId = chunk.request_id;
        } else if (chunk.id) {
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
   * Multimodal completion (text + images) via OpenAI-compatible vision API.
   * Used by the LTTS pipeline for LLaVA. Also works with Qwen-VL, etc.
   * options.files = [{ mimeType, data: base64 }]
   */
  async createMultimodalCompletion(options) {
    if (!this.isEnabled || !this.client)
      throw new Error("OpenSource provider is not enabled");

    const model = options.model || this.defaultModel;

    if (!model) {
      throw new Error(
        "[OpenSource] No model specified and no default_model configured. " +
        "Set custom_models and default_model in the tenant AI config for this provider."
      );
    }

    const files = options.files || [];
    const userText = options.prompt || options.text || "";
    const imageParts = files.map((f) => ({
      type: "image_url",
      image_url: {
        url: "data:" + (f.mimeType || "image/png") + ";base64," + f.data,
      },
    }));
    let messages;
    if (Array.isArray(options.messages) && options.messages.length > 0) {
      messages = [...options.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === "user") {
        const existingText =
          typeof last.content === "string" ? last.content : userText;
        messages[messages.length - 1] = {
          ...last,
          content: [{ type: "text", text: existingText }, ...imageParts],
        };
      } else {
        messages.push({
          role: "user",
          content: [{ type: "text", text: userText }, ...imageParts],
        });
      }
    } else {
      messages = [
        {
          role: "user",
          content: [{ type: "text", text: userText }, ...imageParts],
        },
      ];
    }
    const start = Date.now();
    try {
      const response = await this.client.chat.completions.create(
        {
          model,
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.max_tokens || DEFAULT_MAX_TOKENS,
        },
        { signal: options.signal },
      );
      const latency = Date.now() - start;
      const content = response?.choices?.[0]?.message?.content ?? "";
      const usage = response.usage || {};
      return this.formatResponse(
        {
          id: response.id,
          content,
          usage: {
            prompt_tokens: usage.prompt_tokens || 0,
            completion_tokens: usage.completion_tokens || 0,
            total_tokens:
              usage.total_tokens ||
              (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
          },
          finish_reason: response?.choices?.[0]?.finish_reason,
        },
        { model, cost: 0, latency_ms: latency },
      );
    } catch (error) {
      console.error("[OpenSource] Multimodal completion error:", error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Create embeddings
   */
  async createEmbedding(input, model = null) {
    if (!this.isEnabled || !this.client) {
      throw new Error("OpenSource provider is not enabled");
    }

    const embeddingModel = model || this.defaultEmbeddingModel;

    if (!embeddingModel) {
      throw new Error(
        "[OpenSource] No embedding model configured. " +
        "Set custom_embedding_models and default_embedding_model in the tenant AI config for this provider."
      );
    }

    try {
      console.log(
        `[OpenSource] Generating embeddings for ${Array.isArray(input) ? input.length : 1} inputs using model: ${embeddingModel}`,
      );
      const inputs = Array.isArray(input) ? input : [input];
      const embeddings = [];
      console.log("inputs", inputs);

      for (const text of inputs) {
        console.log(
          `[OpenSource] Embedding request → model: ${embeddingModel}, baseURL: ${this.client.baseURL}, input length: ${text.length}`,
        );
        const response = await this.client.embeddings.create({
          model: embeddingModel,
          input: text,
          encoding_format: "float",
        });
        const emb = response.data[0].embedding;
        const isZero = emb.every((v) => v === 0);
        console.log(
          `[OpenSource] Embedding response → dims: ${emb.length}, isZero: ${isZero}, first5: [${emb.slice(0, 5).join(", ")}]`,
        );
        embeddings.push(emb);
      }
      console.log(
        `[OpenSource] Using API key: ${this.client.apiKey?.substring(0, 8)}...`,
      );

      // Check for zero vectors
      if (embeddings.length > 0 && embeddings[0].every((v) => v === 0)) {
        console.warn(
          `[OpenSource] ⚠️ WARNING: Received ALL-ZERO vector from endpoint: ${this.config.endpoint}`,
        );
      }

      return {
        embeddings,
        model: embeddingModel,
        usage: {
          total_tokens: inputs.reduce(
            (sum, t) => sum + Math.ceil(t.length / 4),
            0,
          ),
        },
        provider: this.name,
      };
    } catch (error) {
      console.error("[OpenSource] Embedding error:", error.message);
      throw this._handleError(error);
    }
  }

  calculateCost() {
    return 0;
  }

  _handleError(error) {
    const errorObj = new Error(error.message);
    errorObj.name = "AIProviderError";
    errorObj.code = "PROVIDER_ERROR";
    errorObj.provider = this.name;
    return errorObj;
  }

  async cancelExecution(requestId, providerConfig = {}) {
    const cancelUrl = providerConfig.cancelUrl || this.config.cancelUrl;
    if (!cancelUrl) {
      console.warn("[OpenSourceProvider] No cancelUrl configured");
      return false;
    }
    const axios = require("axios");
    const headers = { "Content-Type": "application/json" };
    const apiKey = providerConfig.apiKey || this.config.apiKey;
    if (apiKey) {
      headers["Authorization"] = apiKey.startsWith("Bearer ")
        ? apiKey
        : `Bearer ${apiKey}`;
    }
    try {
      console.log(
        `[OpenSourceProvider] Calling cancel URL: ${cancelUrl} for request_id: ${requestId}`,
      );
      await axios.post(
        cancelUrl,
        { request_id: requestId },
        // Use AI_CANCEL_TIMEOUT env var; default 5s
        { headers, timeout: CANCEL_TIMEOUT },
      );
      return true;
    } catch (err) {
      console.error(`[OpenSourceProvider] Cancel request failed:`, err.message);
      throw err;
    }
  }
}

module.exports = { OpenSourceProvider };
