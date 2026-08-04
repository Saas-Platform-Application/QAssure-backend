/**
 * AI Gateway Validation Schemas - QAssure Platform
 * Zod schemas for AI route input validation
 */
const { z } = require("zod");
// const { OPEN_SOURCE_MODELS } = require('./tenant-ai-config.schema');

// Shared
const UUIDSchema = z.string().uuid("Invalid UUID format");

const IdParamsSchema = z.object({
  id: UUIDSchema,
});

// POST /ai/completions
const CreateCompletionSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"], {
          message: "role must be 'system', 'user', or 'assistant'",
        }),
        content: z
          .string()
          .min(1, "content cannot be empty")
          .max(100000, "content too long"),
      }),
    )
    .min(1, "messages array cannot be empty")
    .max(100, "Too many messages"),
  model: z.string().max(100).optional(),
  // provider: z.enum(['openai', 'anthropic', 'gemini', 'open-source', ...OPEN_SOURCE_MODELS]).optional(),
  provider: z.string().min(1, "Provider name is required").max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(128000).optional(),
  top_p: z.number().min(0).max(1).optional(),
  stop: z.union([z.string(), z.array(z.string().max(100)).max(4)]).optional(),
});

const optionalDateQuery = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z
    .string()
    .optional()
    .refine(
      (val) => {
        if (val === undefined) return true;
        return !Number.isNaN(Date.parse(val));
      },
      { message: "Invalid date" },
    ),
);

// GET /ai/completions (query params)
const ListCompletionsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().max(100))
    .optional(),
  // provider: z.enum(['openai', 'anthropic', 'gemini', 'open-source', ...OPEN_SOURCE_MODELS]).optional(),
  provider: z.string().min(1, "Provider name is required").max(100).optional(),
  model: z.string().max(100).optional(),
  // Keep query param naming consistent with other platform APIs
  user_id: z.string().uuid().optional(),
  module_id: z.string().uuid().optional(),
  start_date: optionalDateQuery,
  end_date: optionalDateQuery,
  status: z.enum(["completed", "failed", "pending"]).optional(),
});

// GET /ai/costs (query params)
const CostQuerySchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: z.enum(["day", "week", "month"]).optional(),
});

// POST /ai/playground
const PlaygroundSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().min(1).max(100000),
      }),
    )
    .min(1)
    .max(100),
  model: z.string().max(100).optional(),
  // provider: z.enum(['openai', 'anthropic', 'gemini', 'open-source', ...OPEN_SOURCE_MODELS]).optional(),
  provider: z.string().min(1, "Provider name is required").max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(128000).optional(),
});

// GET /ai/providers/:provider/health (gemini-2.0-flash = legacy DB provider key)
const ProviderParamsSchema = z.object({
  // provider: z.enum(['openai', 'anthropic', 'gemini', 'open-source', ...OPEN_SOURCE_MODELS])
  provider: z.string().min(1, "Provider name is required").max(100).optional(),
});

// GET /ai/fallbacks (query params)
const ListFallbacksQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().max(100))
    .optional(),
});

// POST /ai/fallback-order
const UpdateFallbackOrderSchema = z.object({
  fallback_order: z
    .array(z.string().min(1).max(50))
    .min(1, "fallback_order cannot be empty")
    .max(10),
});

// POST /ai/fallback-mapping
// mapping: { openai: 'anthropic', anthropic: 'openai', gemini: 'open-source', ... }
const UpdateFallbackMappingSchema = z.object({
  mapping: z.record(z.string().min(1).max(100), z.string().min(1).max(100)),
});

module.exports = {
  UUIDSchema,
  IdParamsSchema,
  CreateCompletionSchema,
  ListCompletionsQuerySchema,
  CostQuerySchema,
  PlaygroundSchema,
  ProviderParamsSchema,
  ListFallbacksQuerySchema,
  UpdateFallbackOrderSchema,
  UpdateFallbackMappingSchema,
};
