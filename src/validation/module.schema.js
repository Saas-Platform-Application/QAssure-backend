const {
  z
} = require('zod');

// Create schema for Module
const CreateModuleSchema = z.object({

  // module_id: z.string().min(1, "module_id is required").min(10, "module_id must be at least 10 characters").max(100, "module_id must be at most 100 characters").regex(/^qassure\.[a-z0-9-]+\.v[0-9]+$/, "module_id format is invalid"),

  module_id: z.string().trim().min(1, "module_id is required").min(3, "module_id must be at least 3 characters").max(100, "module_id must be at most 100 characters"),

  name: z.string().trim().min(1, "name is required").min(3, "name must be at least 3 characters").max(100, "name must be at most 100 characters"),

  description: z.string().max(1000, "description must be at most 1000 characters").optional().nullable(),

  version: z.string().min(1, "version is required").max(20, "version must be at most 20 characters").regex(/^[0-9]+\.[0-9]+\.[0-9]+$/, "version format is invalid"),

  status: z.enum(["pending",
    "starting",
    "running",
    "stopping",
    "stopped",
    "failed",
    "deprecated",
    "maintenance"
  ]).default("running"),

  runtime_language: z.string().min(1, "runtime_language is required").max(50, "runtime_language must be at most 50 characters"),

  framework: z.string().max(50, "framework must be at most 50 characters").optional().nullable(),

  frontend_base_url: z.string().min(1, "frontend_base_url is required").max(255, "frontend_base_url must be at most 255 characters").url("Invalid URL format"),
  backend_base_url: z.string().min(1, "backend_base_url is required").max(255, "backend_base_url must be at most 255 characters").url("Invalid URL format"),

  health_endpoint: z.string().min(1, "health_endpoint is required").max(255, "health_endpoint must be at most 255 characters"),

  webhookurl: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.string().max(500, "webhookurl must be at most 500 characters").url("Invalid URL format").optional().nullable()
  ),

  sync_webhook_url: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.string().max(500, "sync_webhook_url must be at most 500 characters").url("Invalid URL format").optional().nullable()
  ),

  endpoints: z.any().optional().nullable(),

  kafka_topics: z.any().optional().nullable(),

  cpu_request: z.string().max(20, "cpu_request must be at most 20 characters").optional().nullable(),

  cpu_limit: z.string().max(20, "cpu_limit must be at most 20 characters").optional().nullable(),

  memory_request: z.string().max(20, "memory_request must be at most 20 characters").optional().nullable(),

  memory_limit: z.string().max(20, "memory_limit must be at most 20 characters").optional().nullable(),

  min_replicas: z.number().int().min(1, "min_replicas must be at least 1").max(50, "min_replicas must be at most 50").optional().nullable(),

  max_replicas: z.number().int().min(1, "max_replicas must be at least 1").max(50, "max_replicas must be at most 50").optional().nullable(),

  last_health_check: z.coerce.date().optional().nullable(),

  health_status: z
  .enum(["healthy", "unhealthy"])
  .default("healthy"),

  consecutive_failures: z.number().int().optional().nullable(),

  registered_by: z.string().uuid().optional().nullable(),

  tenant_id: z.string().uuid().optional().nullable(),

  metadata: z.any().optional().nullable(),

});

// Update schema - only includes fields that can be updated via update() method
// Based on module.service.js update() method (lines 494-509)
// Excludes: module_id, version, status, runtime_language, framework (immutable after creation)
// Excludes: last_health_check, health_status, consecutive_failures (system managed)
// Excludes: registered_by, tenant_id (system managed)
const UpdateModuleSchema = z.object({
  name: z.string().trim().min(3, "name must be at least 3 characters").max(100, "name must be at most 100 characters"),
  description: z.string().max(1000, "description must be at most 1000 characters").nullable(),
  frontend_base_url: z.string().max(255, "frontend_base_url must be at most 255 characters").url("Invalid URL format"),
  backend_base_url: z.string().max(255, "backend_base_url must be at most 255 characters").url("Invalid URL format"),
  health_endpoint: z.string().max(255, "health_endpoint must be at most 255 characters"),
  endpoints: z.any().nullable(),
  kafka_topics: z.any().nullable(),
  cpu_request: z.string().max(20, "cpu_request must be at most 20 characters").nullable(),
  cpu_limit: z.string().max(20, "cpu_limit must be at most 20 characters").nullable(),
  memory_request: z.string().max(20, "memory_request must be at most 20 characters").nullable(),
  memory_limit: z.string().max(20, "memory_limit must be at most 20 characters").nullable(),
  min_replicas: z.number().int().min(1, "min_replicas must be at least 1").max(50, "min_replicas must be at most 50").nullable(),
  max_replicas: z.number().int().min(1, "max_replicas must be at least 1").max(50, "max_replicas must be at most 50").nullable(),
  metadata: z.any().nullable(),
}).partial(); // Make all fields optional for partial updates

const ModuleParamsSchema = z.object({
  id: z.string().uuid(),
});

// Update status schema - validates against actual module states
// Based on MODULE_STATES from module.service.js
const UpdateStatusSchema = z.object({
  status: z.enum([
    "pending",
    "starting",
    "running",
    "stopping",
    "stopped",
    "failed",
    "deprecated",
    "maintenance"
  ], {
    errorMap: () => ({
      message: "Status must be one of: pending, starting, running, stopping, stopped, failed, deprecated, maintenance"
    })
  }),
  reason: z.string().optional().nullable(),
});

const UpdateVersionSchema = z.object({
  version: z.string().min(1, "Version is required").max(20, "version must be at most 20 characters").regex(/^[0-9]+\.[0-9]+\.[0-9]+$/, "version format is invalid"),
  changelog: z.string().optional().nullable(),
});

module.exports = {
  CreateModuleSchema,
  UpdateModuleSchema,
  ModuleParamsSchema,
  UpdateStatusSchema,
  UpdateVersionSchema,
};