const { z } = require('zod');

// Create schema for Healthcheck
const CreateHealthcheckSchema = z.object({
    
  module_id: z.string().uuid(),
  
  status: z.enum(["HEALTHY", "DEGRADED", "UNHEALTHY"]),
  
  response_time_ms: z.number().int().optional().nullable(),
  
  http_status: z.number().int().min(100, "http_status must be at least 100").max(599, "http_status must be at most 599").optional().nullable(),
  
  error_message: z.string().max(1000, "error_message must be at most 1000 characters").optional().nullable(),
  
  components: z.any().optional().nullable(),
  
  consecutive_failures: z.number().int().optional().nullable(),
  
  checked_at: z.coerce.date(),

});

const UpdateHealthcheckSchema = CreateHealthcheckSchema.partial();

const HealthcheckParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  CreateHealthcheckSchema,
  UpdateHealthcheckSchema,
  HealthcheckParamsSchema,
  };
