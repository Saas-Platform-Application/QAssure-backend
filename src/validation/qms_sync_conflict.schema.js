const { z } = require('zod');

// Create schema for Qmssyncconflict
const CreateQmssyncconflictSchema = z.object({
    
  tenant_id: z.string().uuid(),
  
  sync_job_id: z.string().uuid(),
  
  qms_connection_id: z.string().uuid(),
  
  entity_type: z.string().min(1, "entity_type is required").min(1, "entity_type must be at least 1 characters").max(100, "entity_type must be at most 100 characters"),
  
  entity_id: z.string().min(1, "entity_id is required").min(1, "entity_id must be at least 1 characters").max(255, "entity_id must be at most 255 characters"),
  
  qms_record_id: z.string().min(1, "qms_record_id is required").min(1, "qms_record_id must be at least 1 characters").max(255, "qms_record_id must be at most 255 characters"),
  
  qassure_record_id: z.string().max(255, "qassure_record_id must be at most 255 characters").optional().nullable(),
  
  conflict_type: z.enum(["FIELD_MISMATCH", "DUPLICATE_RECORD", "MISSING_DEPENDENCY", "VALIDATION_ERROR", "CONCURRENT_MODIFICATION", "DELETE_CONFLICT"]),
  
  conflict_field: z.string().max(255, "conflict_field must be at most 255 characters").optional().nullable(),
  
  qms_value: z.any().optional().nullable(),
  
  qassure_value: z.any().optional().nullable(),
  
  conflict_details: z.any().optional().nullable(),
  
  status: z.enum(["PENDING", "RESOLVED", "AUTO_RESOLVED", "MANUAL_RESOLVED", "IGNORED", "FAILED"]),
  
  resolution_strategy: z.enum(["QMS_WINS", "QASSURE_WINS", "MERGE", "MANUAL", "SKIP"]).optional().nullable(),
  
  resolved_value: z.any().optional().nullable(),
  
  resolved_by: z.string().uuid().optional().nullable(),
  
  resolved_at: z.coerce.date().optional().nullable(),
  
  resolution_notes: z.string().max(10000, "resolution_notes must be at most 10000 characters").optional().nullable(),
  
  retry_count: z.number().int().max(100, "retry_count must be at most 100"),
  
  last_retry_at: z.coerce.date().optional().nullable(),
  
  error_message: z.string().max(5000, "error_message must be at most 5000 characters").optional().nullable(),

});

const UpdateQmssyncconflictSchema = CreateQmssyncconflictSchema.partial();

const QmssyncconflictParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  CreateQmssyncconflictSchema,
  UpdateQmssyncconflictSchema,
  QmssyncconflictParamsSchema,
  };
