/**
 * Prompt Validation Schemas - QAssure Platform
 * Zod schemas for prompt management route validation
 */
const { z } = require('zod');
// const { OPEN_SOURCE_MODELS } = require('./tenant-ai-config.schema');

const UUIDSchema = z.string().uuid('Invalid UUID format');

const IdParamsSchema = z.object({
  id: UUIDSchema
});

// POST /ai/prompts
const CreatePromptSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).optional(),
  use_case: z.string().min(1).max(100),
  system_message: z.string().max(50000).optional(),
  user_template: z.string().min(1, 'User template is required').max(50000),
  model: z.string().max(100).optional(),
  // provider: z.enum(['openai', 'anthropic', 'gemini', 'open-source', ...OPEN_SOURCE_MODELS]).optional(),
  provider: z.string().min(1, 'Provider name is required').max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(128000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  variables: z.array(z.object({
    name: z.string().min(1).max(100),
    type: z.enum(['string', 'number', 'boolean', 'array']).optional(),
    required: z.boolean().optional(),
    default: z.any().optional()
  })).optional(),
  is_default: z.boolean().optional(),
  change_notes: z.string().max(1000).optional(),
  module_ids: z.array(z.string().uuid()).max(50).optional().nullable(),
  module_id: z.string().uuid().optional().nullable()
});

// PUT /ai/prompts/:id
const UpdatePromptSchema = CreatePromptSchema.partial();

// PATCH /ai/prompts/:id/status
const UpdateStatusSchema = z.object({
  status: z.enum(['draft', 'active', 'archived', 'deprecated'])
});

// POST /ai/prompts/:id/execute
const ExecutePromptSchema = z.object({
  variables: z.record(z.string(), z.any()).optional(),
  model: z.string().max(100).optional(),
  // provider: z.enum(['openai', 'anthropic', 'gemini', 'open-source', ...OPEN_SOURCE_MODELS]).optional(),
  provider: z.string().min(1, 'Provider name is required').max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(128000).optional(),
  stream: z.boolean().optional()
});

// POST /ai/prompts/:id/test
const TestPromptSchema = ExecutePromptSchema;

// POST /ai/prompts/:id/rollback
const RollbackSchema = z.object({
  version: z.number().int().min(1, 'Version number is required')
});

// POST /ai/prompts/:id/cancel
const CancelPromptSchema = z.object({
  request_id: z.string().min(1, 'Request ID is required').max(255)
});

// POST /ai/prompts/:id/test-cases
const CreateTestCaseSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  variables: z.record(z.string(), z.any()).optional(),
  expected_output: z.string().max(50000).optional(),
  expected_contains: z.array(z.string()).optional(),
  max_tokens: z.number().int().min(1).max(128000).optional(),
  tags: z.array(z.string()).optional()
});

// GET /ai/prompts query
const ListPromptsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().max(100)).optional(),
  use_case: z.string().max(100).optional(),
  status: z.enum(['draft', 'active', 'archived', 'deprecated']).optional(),
  search: z.string().max(200).optional(),
  tags: z.string().max(500).optional(),
  module_id: z.string().uuid().optional().nullable()
});

const TestCaseIdParamsSchema = z.object({
  testCaseId: UUIDSchema
});

const VersionParamsSchema = z.object({
  id: UUIDSchema,
  version: z.string().regex(/^\d+$/).transform(Number)
});

module.exports = {
  IdParamsSchema,
  CreatePromptSchema,
  UpdatePromptSchema,
  UpdateStatusSchema,
  ExecutePromptSchema,
  TestPromptSchema,
  RollbackSchema,
  CreateTestCaseSchema,
  ListPromptsQuerySchema,
  TestCaseIdParamsSchema,
  VersionParamsSchema,
  CancelPromptSchema
};