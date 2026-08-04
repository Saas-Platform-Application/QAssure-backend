const { z } = require('zod');

// Create schema for Qmsentitymapping
const CreateQmsentitymappingSchema = z.object({
    
  tenant_id: z.string().uuid(),
  
  qms_connection_id: z.string().uuid(),
  
  qms_entity_type: z.string().min(1, "qms_entity_type is required").min(1, "qms_entity_type must be at least 1 characters").max(100, "qms_entity_type must be at most 100 characters"),
  
  qassure_entity_type: z.string().min(1, "qassure_entity_type is required").min(1, "qassure_entity_type must be at least 1 characters").max(100, "qassure_entity_type must be at most 100 characters"),
  
  mapping_direction: z.enum(["QMS_TO_QASSURE", "QASSURE_TO_QMS", "BIDIRECTIONAL"]),
  
  field_mappings: z.any(),
  
  transformation_rules: z.any().optional().nullable(),
  
  validation_rules: z.any().optional().nullable(),
  
  conflict_resolution_strategy: z.enum(["QMS_WINS", "QASSURE_WINS", "MERGE", "MANUAL", "SKIP", "LATEST_TIMESTAMP"]),
  
  sync_enabled: z.boolean(),
  
  sync_frequency: z.enum(["REAL_TIME", "HOURLY", "DAILY", "WEEKLY", "MANUAL"]).optional().nullable(),
  
  filter_criteria: z.any().optional().nullable(),
  
  last_sync_at: z.coerce.date().optional().nullable(),
  
  records_synced: z.number().int(),
  
  created_by: z.string().uuid(),
  
  updated_by: z.string().uuid().optional().nullable(),

});

const UpdateQmsentitymappingSchema = CreateQmsentitymappingSchema.partial();

const QmsentitymappingParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  CreateQmsentitymappingSchema,
  UpdateQmsentitymappingSchema,
  QmsentitymappingParamsSchema,
  };
