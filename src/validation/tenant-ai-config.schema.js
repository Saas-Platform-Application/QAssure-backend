/**
 * Tenant AI Config Validation Schemas
 */
const { z } = require("zod");

// Known open-source models (for reference — NOT restrictive)
// const OPEN_SOURCE_MODELS = [
//   'Mistral 7B',
//   'Mistral 24B',
//   'Llama 3.2B',
//   'Llama 8B',
//   'Llama 70B',
//   'Qwen 2.5 3B',
//   'Qwen 2.5 7B',
//   'Qwen 2.5 14B',
//   'Qwen 2.5 72B',
//   'Gemma 7B',
//   'Gemma 2 27B',
//   'Mistral7b'
// ];

// Built-in providers handled by dedicated provider classes
const BUILTIN_PROVIDERS = ["openai", "anthropic", "gemini"];

const ProviderParamsSchema = z.object({
  provider: z.string().min(1, "Provider name is required").max(100),
});

const TestConnectionBodySchema = z.object({
  model: z.string().max(100).optional(),
});

const UpsertConfigSchema = z
  .object({
    provider: z.string().min(1, "Provider name is required").max(100),
    config_type: z.enum(["azure", "direct"]),
    display_name: z.string().max(255).optional(),
    // Min 10 chars: intentionally kept low.
    // Open-source deployments (vLLM, Ollama, Together, Groq) sometimes use UUIDs or short
    // bearer tokens as their API key. The provider itself will reject invalid keys at call time.
    api_key: z.string().min(10, "API key must be at least 10 characters").max(500),
    endpoint: z.string().url().max(500).optional(),
    deployment: z.string().max(255).optional(),
    api_version: z.string().max(50).optional(),
    // Raised from 20 to 50 to accommodate providers with large model catalogs
    custom_models: z.array(z.string().max(100)).max(50).optional(),
    custom_pricing: z
      .record(
        z.string(),
        z.object({
          input: z.number().min(0).max(10, "Input pricing must be ≤ $10 per 1K tokens"),
          output: z.number().min(0).max(10, "Output pricing must be ≤ $10 per 1K tokens"),
        }),
      )
      .optional(),
    default_model: z.string().max(100).optional(),
    custom_embedding_models: z.array(z.string().max(100)).max(10).optional(),
    default_embedding_model: z.string().max(100).optional(),
    fallback_provider: z.string().max(50).optional().nullable(),
    cancel_url: z.string().url().max(500).optional().nullable(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.config_type === "azure") {
        return !!data.endpoint && !!data.deployment;
      }
      // Any non-builtin provider requires an endpoint
      if (
        !BUILTIN_PROVIDERS.includes(data.provider) &&
        !data.provider.startsWith("gemini")
      ) {
        return !!data.endpoint;
      }
      return true;
    },
    {
      message:
        "Azure config requires endpoint and deployment. Custom/open-source providers require endpoint.",
      path: ["endpoint"],
    },
  );

module.exports = {
  ProviderParamsSchema,
  UpsertConfigSchema,
  TestConnectionBodySchema,
  // OPEN_SOURCE_MODELS,
  BUILTIN_PROVIDERS,
};
