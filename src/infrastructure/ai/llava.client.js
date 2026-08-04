/**
 * LLaVA Client - QAssure Platform
 * Calls LTTS's LLaVA vision-language model for document page description.
 * Part of the LTTS multimodal ingestion pipeline (stage 3):
 *   PDF -> images -> YOLO -> LLaVA -> DistilUseBase -> Qwen7B
 *
 * Verified contract (LTTS Azure deployment, May 2026):
 *   POST {endpoint}, multipart/form-data with fields:
 *     file       = image bytes (PNG)
 *     prompt     = text instruction
 *     max_tokens = optional integer
 *   Auth: Authorization: Bearer {api-key}
 *   Response: {
 *     "object": "vision.generation",
 *     "model":  "model_snapshot",
 *     "prompt": "<echoed prompt>",
 *     "response": "<generated text>"
 *   }
 *
 * Note: LLaVA is NOT OpenAI-vision compatible. We use this dedicated client
 * instead of OpenSourceProvider.createMultimodalCompletion for the LTTS pipeline.
 */
const axios = require('axios');
const FormData = require('form-data');

const DEFAULT_PROMPT =
  'Provide a complete textual representation of this document page, including all text, tables (as structured text), and descriptions of any figures or images.';

class LlavaClient {
  constructor(config = {}) {
    this.endpoint = config.endpoint || process.env.LTTS_LLAVA_ENDPOINT;
    this.apiKey = config.apiKey || process.env.LTTS_LLAVA_API_KEY || null;
    this.timeout = config.timeout || 180000;
    this.defaultPrompt = config.defaultPrompt || DEFAULT_PROMPT;
    this.defaultMaxTokens = config.defaultMaxTokens || 1024;
  }

  isConfigured() {
    return !!this.endpoint;
  }

  /**
   * Generate a textual description of an image.
   * @param {string} base64    PNG base64 (no data: prefix)
   * @param {string} [prompt]  Optional text instruction (defaults to document-page prompt)
   * @param {object} [opts]    { maxTokens }
   * @returns {Promise<{text: string, model: string, prompt: string}>}
   */
  async generate(base64, prompt = null, opts = {}) {
    if (!this.isConfigured()) {
      throw new Error('LLaVA endpoint not configured. Set LTTS_LLAVA_ENDPOINT env var.');
    }
    const buffer = Buffer.from(base64, 'base64');
    const form = new FormData();
    form.append('file', buffer, { filename: 'page.png', contentType: 'image/png' });
    form.append('prompt', prompt || this.defaultPrompt);
    form.append('max_tokens', String(opts.maxTokens || this.defaultMaxTokens));

    const headers = { ...form.getHeaders() };
    if (this.apiKey) headers['Authorization'] = 'Bearer ' + this.apiKey;

    const response = await axios.post(this.endpoint, form, {
      headers,
      timeout: this.timeout,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return {
      text: response.data?.response || '',
      model: response.data?.model || null,
      prompt: response.data?.prompt || prompt || this.defaultPrompt,
    };
  }
}

let instance = null;
const getLlavaClient = (config) => {
  if (!instance || config) instance = new LlavaClient(config);
  return instance;
};

module.exports = { LlavaClient, getLlavaClient };
