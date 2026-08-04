/**
 * Google Gemini Provider - QAssure Platform
 * Supports Google Generative AI (Gemini) for completions and embeddings.
 * Auto-detected from GOOGLE_AI_API_KEY environment variable.
 *
 * Environment variables (all optional — override defaults):
 *   AI_PROVIDER_TIMEOUT         Timeout in ms for API calls (default: 60000)
 *   AI_DEFAULT_MAX_TOKENS       Default max tokens for completions (default: 2048)
 *   AI_DEFAULT_LONG_CONTEXT_TOKENS  Default max tokens for long-context/multimodal (default: 4096)
 *   AI_PRICING_WARN_AGE_DAYS    Warn if pricing table is older than N days (default: 90)
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { BaseAIProvider } = require("./base-provider");
const { AIProviderError } = require("./openai.provider");

// ── Configurable defaults from env ───────────────────────────────────────────
const DEFAULT_MAX_TOKENS = parseInt(process.env.AI_DEFAULT_MAX_TOKENS) || 2048;
const DEFAULT_LONG_CONTEXT_TOKENS =
  parseInt(process.env.AI_DEFAULT_LONG_CONTEXT_TOKENS) || 4096;

// ── Pricing table ─────────────────────────────────────────────────────────────
// Last updated: 2025-05-01
// Override per-tenant via custom_pricing in the AI config.
const PRICING_LAST_UPDATED = new Date("2025-05-01");
const PRICING_WARN_AGE_DAYS =
  parseInt(process.env.AI_PRICING_WARN_AGE_DAYS) || 90;
const pricingAgeDays = Math.floor(
  (Date.now() - PRICING_LAST_UPDATED.getTime()) / 86400000,
);
if (pricingAgeDays > PRICING_WARN_AGE_DAYS) {
  console.warn(
    `[Gemini] ⚠️  Pricing table is ${pricingAgeDays} days old (last updated ${PRICING_LAST_UPDATED.toISOString().slice(0, 10)}). ` +
      `Google prices may have changed. Use custom_pricing in the tenant AI config to override.`,
  );
}

class GeminiProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    this.name = "gemini";
    this.displayName = "Google Gemini";
    this.client = null;
    this.apiKey = null;

    // Completion models — fetched live from the Gemini REST API during initialize().
    // No hardcoded fallback: if the API call fails, the provider is disabled.
    this.completionModels = [];

    this.models = [];
    this.defaultModel = null;

    this.pricing = {};

    // Embedding models — fetched live from the Gemini REST API during initialize().
    // No hardcoded defaults.
    this.embeddingModels = [];
    this.defaultEmbeddingModel = null;
    this.embeddingDimensions = 768;

    // Gemini 2.0 Flash supports native multimodal (images, PDFs)
    this.supportsMultimodal = true;
    this.supportedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
  }

  /**
   * Initialize the provider.
   * Fetches the live model list via the Gemini REST API — NO static fallback.
   * Splits models by capability: generateContent → completion, embedContent → embedding.
   * If the API call fails, the provider is disabled with a clear error.
   */
  async initialize() {
    const apiKey = this.config.apiKey || process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      console.warn(
        "[Gemini] No API key configured (checked GOOGLE_AI_API_KEY) - provider disabled",
      );
      this.isEnabled = false;
      return false;
    }

    try {
      this.apiKey = apiKey;
      this.client = new GoogleGenerativeAI(apiKey);

      // ── Fetch live model list (completion + embedding in one REST call) ───
      const timeout =
        this.config.timeout ||
        parseInt(process.env.AI_PROVIDER_TIMEOUT) ||
        60000;
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        Math.min(timeout, 10000),
      );

      let fetchOk = false;
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          { signal: controller.signal },
        );
        clearTimeout(timer);

        if (!res.ok) {
          console.error(
            `[Gemini] ❌ Model list fetch returned HTTP ${res.status}. ` +
              "Provider disabled. Check GOOGLE_AI_API_KEY permissions.",
          );
          this.isEnabled = false;
          return false;
        }

        const data = await res.json();
        const allModels = data.models || [];

        // Completion models: support generateContent
        this.completionModels = allModels
          .filter(
            (m) =>
              m.name.includes("gemini") &&
              (m.supportedGenerationMethods || []).includes("generateContent"),
          )
          .map((m) => m.name.replace("models/", ""));

        // Embedding models: support embedContent
        this.embeddingModels = allModels
          .filter((m) =>
            (m.supportedGenerationMethods || []).includes("embedContent"),
          )
          .map((m) => m.name.replace("models/", ""));

        // Default embedding: prefer gemini-embedding-001 if available, else first
        this.defaultEmbeddingModel =
          this.embeddingModels.find((m) => m.includes("embedding-001")) ||
          this.embeddingModels[0] ||
          null;

        fetchOk = this.completionModels.length > 0;
        console.log(
          `[Gemini] ✅ Fetched ${this.completionModels.length} completion model(s) ` +
            `and ${this.embeddingModels.length} embedding model(s) from Gemini API`,
        );

        if (!this.defaultEmbeddingModel) {
          console.warn(
            "[Gemini] ⚠️  No embedding models found in the Gemini API response. " +
              "Embedding calls will fail until models become available.",
          );
        }
      } catch (fetchErr) {
        clearTimeout(timer);
        console.error(
          `[Gemini] ❌ Could not fetch model list from Gemini API: ${fetchErr.message}. ` +
            "Provider disabled. Check GOOGLE_AI_API_KEY and AI_PROVIDER_TIMEOUT.",
        );
        this.isEnabled = false;
        return false;
      }
      // ─────────────────────────────────────────────────────────────────────

      if (!fetchOk) {
        console.error(
          "[Gemini] ❌ Gemini API returned no completion models. " +
            "Provider disabled. The API key may lack model access permissions.",
        );
        this.isEnabled = false;
        return false;
      }

      this.models = this.completionModels;
      this.defaultModel =
        this.config.defaultModel || this.completionModels[0] || null;

      if (!this.defaultModel) {
        console.warn(
          "[Gemini] No default model available. Set default_model in tenant AI config.",
        );
      }

      this.isEnabled = true;
      console.log("[Gemini] ✅ Initialized");
      return true;
    } catch (error) {
      console.error("[Gemini] ❌ Initialization failed:", error.message);
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.isEnabled || !this.client) {
      return { healthy: false, error: "Provider not initialized" };
    }

    try {
      const start = Date.now();
      const model = this.client.getGenerativeModel({
        model: this.defaultModel,
      });
      await model.generateContent("ping");
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

  /**
   * Create a chat completion
   */
  async createCompletion(options) {
    if (!this.isEnabled || !this.client) {
      throw new Error("Gemini provider is not enabled");
    }

    const errors = this.validateOptions(options);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }

    const modelName = options.model || this.defaultModel;

    if (!modelName) {
      throw new Error(
        "[Gemini] No model specified and no default_model configured. " +
          "Set default_model in the tenant AI config.",
      );
    }

    const start = Date.now();

    try {
      const model = this.client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.max_tokens || DEFAULT_MAX_TOKENS,
          topP: options.top_p ?? 1,
        },
      });

      // Convert OpenAI-style messages to Gemini format
      const { systemInstruction, contents } = this._convertMessages(
        options.messages,
      );

      const requestOptions = options.signal
        ? { requestOptions: { signal: options.signal } }
        : undefined;
      let result;
      if (systemInstruction) {
        // Use chat with system instruction
        const modelWithSystem = this.client.getGenerativeModel({
          model: modelName,
          systemInstruction,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.max_tokens || DEFAULT_MAX_TOKENS,
            topP: options.top_p ?? 1,
          },
        });
        result = await modelWithSystem.generateContent(
          { contents },
          requestOptions,
        );
      } else {
        result = await model.generateContent({ contents }, requestOptions);
      }

      const response = result.response;
      const content = response.text();
      const latency = Date.now() - start;

      // Gemini usage metadata
      const usage = response.usageMetadata || {};
      const promptTokens = usage.promptTokenCount || 0;
      const completionTokens = usage.candidatesTokenCount || 0;
      const totalTokens =
        usage.totalTokenCount || promptTokens + completionTokens;
      const cost = this.calculateCost(
        modelName,
        promptTokens,
        completionTokens,
      );

      return this.formatResponse(
        {
          id: `gemini_${Date.now()}`,
          content,
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
          },
          finish_reason: response.candidates?.[0]?.finishReason || "STOP",
        },
        {
          model: modelName,
          cost,
          latency_ms: latency,
        },
      );
    } catch (error) {
      console.error("[Gemini] Completion error:", error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Create a streaming completion
   */
  async createStreamingCompletion(options, onChunk) {
    if (!this.isEnabled || !this.client) {
      throw new Error("Gemini provider is not enabled");
    }

    const modelName = options.model || this.defaultModel;

    if (!modelName) {
      throw new Error(
        "[Gemini] No model specified and no default_model configured. " +
          "Set default_model in the tenant AI config.",
      );
    }

    const start = Date.now();
    let fullContent = "";

    try {
      const model = this.client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.max_tokens || DEFAULT_MAX_TOKENS,
        },
      });

      const { contents } = this._convertMessages(options.messages);
      const requestOptions = options.signal
        ? { requestOptions: { signal: options.signal } }
        : undefined;
      const result = await model.generateContentStream(
        { contents },
        requestOptions,
      );

      for await (const chunk of result.stream) {
        const text = chunk.text();
        fullContent += text;

        if (onChunk) {
          onChunk({ ...chunk, content: text, done: false });
        }
      }

      const latency = Date.now() - start;

      if (onChunk) {
        onChunk({ content: "", done: true, fullContent, latency_ms: latency });
      }

      return {
        content: fullContent,
        model: modelName,
        provider: this.name,
        latency_ms: latency,
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Create embeddings using Gemini's embedding model
   */
  async createEmbedding(input, model = null) {
    if (!this.isEnabled || !this.client) {
      throw new Error("Gemini provider is not enabled");
    }

    const embeddingModel = model || this.defaultEmbeddingModel;

    try {
      const geminiModel = this.client.getGenerativeModel({
        model: embeddingModel,
      });
      const inputs = Array.isArray(input) ? input : [input];

      // Gemini embeds one at a time — batch manually
      const embeddings = [];
      for (const text of inputs) {
        const result = await geminiModel.embedContent({
          content: { parts: [{ text }] },
          outputDimensionality: 768,
        });
        embeddings.push(result.embedding.values);
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
      console.error("[Gemini] Embedding error:", error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Create a multimodal completion with file/image input.
   * Gemini natively processes PDFs and images via inlineData.
   *
   * options.files = [{ mimeType: 'image/png', data: <base64string> }]
   * options.messages = standard OpenAI-style messages array
   */
  async createMultimodalCompletion(options) {
    if (!this.isEnabled || !this.client) {
      throw new Error("Gemini provider is not enabled");
    }

    const modelName = options.model || this.defaultModel;

    if (!modelName) {
      throw new Error(
        "[Gemini] No model specified and no default_model configured. " +
          "Set default_model in the tenant AI config.",
      );
    }

    const start = Date.now();

    try {
      const { systemInstruction, contents } = this._convertMessages(
        options.messages,
      );

      // Append file parts to the last user message
      if (options.files && options.files.length > 0) {
        const lastUserMsg = [...contents]
          .reverse()
          .find((c) => c.role === "user");
        if (lastUserMsg) {
          for (const file of options.files) {
            lastUserMsg.parts.push({
              inlineData: {
                mimeType: file.mimeType,
                data: file.data, // base64 string
              },
            });
          }
        }
      }

      const generationConfig = {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.max_tokens || DEFAULT_LONG_CONTEXT_TOKENS,
        topP: options.top_p ?? 1,
      };

      let result;
      if (systemInstruction) {
        const model = this.client.getGenerativeModel({
          model: modelName,
          systemInstruction,
          generationConfig,
        });
        result = await model.generateContent({ contents });
      } else {
        const model = this.client.getGenerativeModel({
          model: modelName,
          generationConfig,
        });
        result = await model.generateContent({ contents });
      }

      const response = result.response;
      const content = response.text();
      const latency = Date.now() - start;

      const usage = response.usageMetadata || {};
      const promptTokens = usage.promptTokenCount || 0;
      const completionTokens = usage.candidatesTokenCount || 0;
      const totalTokens =
        usage.totalTokenCount || promptTokens + completionTokens;
      const cost = this.calculateCost(
        modelName,
        promptTokens,
        completionTokens,
      );

      return this.formatResponse(
        {
          id: `gemini_mm_${Date.now()}`,
          content,
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
          },
          finish_reason: response.candidates?.[0]?.finishReason || "STOP",
        },
        {
          model: modelName,
          cost,
          latency_ms: latency,
        },
      );
    } catch (error) {
      console.error("[Gemini] Multimodal completion error:", error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Convert OpenAI-style messages to Gemini format
   */
  _convertMessages(messages) {
    let systemInstruction = null;
    const contents = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemInstruction = msg.content;
      } else {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Gemini requires at least one message
    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "Hello" }] });
    }

    // Gemini requires first message to be from user
    if (contents[0].role === "model") {
      contents.unshift({ role: "user", parts: [{ text: "..." }] });
    }

    return { systemInstruction, contents };
  }

  /**
   * Handle and transform errors
   */
  _handleError(error) {
    if (error.status === 429 || error.message?.includes("RATE_LIMIT")) {
      return new AIProviderError(
        "RATE_LIMITED",
        "Gemini rate limit exceeded",
        this.name,
      );
    }
    if (
      error.status === 401 ||
      error.status === 403 ||
      error.message?.includes("API_KEY")
    ) {
      return new AIProviderError(
        "AUTH_FAILED",
        "Gemini authentication failed",
        this.name,
      );
    }
    if (error.status === 503 || error.message?.includes("UNAVAILABLE")) {
      return new AIProviderError(
        "SERVICE_UNAVAILABLE",
        "Gemini service unavailable",
        this.name,
      );
    }
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      return new AIProviderError(
        "CONNECTION_FAILED",
        "Failed to connect to Gemini",
        this.name,
      );
    }
    if (error.message?.includes("SAFETY")) {
      return new AIProviderError(
        "CONTENT_FILTERED",
        "Content blocked by Gemini safety filters",
        this.name,
      );
    }

    return new AIProviderError("PROVIDER_ERROR", error.message, this.name);
  }

  async cancelExecution(requestId, providerConfig = {}) {
    return true;
  }
}

module.exports = { GeminiProvider };
