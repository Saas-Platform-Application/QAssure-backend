const { z } = require('zod');

// Create schema for Qmssyncjob
const CreateQmssyncjobSchema = z.object({
    
  connection_id: z.string().uuid(),
  
  job_type: z.enum(["FULL", "INCREMENTAL", "RECONCILIATION"]),
  
  direction: z.enum(["QMS_TO_QASSURE", "QASSURE_TO_QMS", "BIDIRECTIONAL"]),
  
  status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]),
  
  entity_type: z.string().max(100, "entity_type must be at most 100 characters").optional().nullable(),
  
  records_total: z.number().int().optional().nullable(),
  
  records_processed: z.number().int().optional().nullable(),
  
  records_created: z.number().int().optional().nullable(),
  
  records_updated: z.number().int().optional().nullable(),
  
  records_failed: z.number().int().optional().nullable(),
  
  conflicts_detected: z.number().int().optional().nullable(),
  
  conflicts_resolved: z.number().int().optional().nullable(),
  
  error_message: z.string().max(2000, "error_message must be at most 2000 characters").optional().nullable(),
  
  error_details: z.any().optional().nullable(),
  
  started_at: z.coerce.date().optional().nullable(),
  
  completed_at: z.coerce.date().optional().nullable(),
  
  triggered_by: z.string().uuid().optional().nullable(),
  
  metadata: z.any().optional().nullable(),

});

const UpdateQmssyncjobSchema = CreateQmssyncjobSchema.partial();

const QmssyncjobParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  CreateQmssyncjobSchema,
  UpdateQmssyncjobSchema,
  QmssyncjobParamsSchema,
  };
