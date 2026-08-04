const { z } = require('zod');

// Create schema for Eventlog
const CreateEventlogSchema = z.object({
    
  tenant_id: z.string().uuid().optional().nullable(),
  
  event_id: z.string().min(1, "event_id is required").min(1, "event_id must be at least 1 characters").max(255, "event_id must be at most 255 characters"),
  
  event_type: z.string().min(1, "event_type is required").min(1, "event_type must be at least 1 characters").max(255, "event_type must be at most 255 characters"),
  
  event_source: z.string().min(1, "event_source is required").min(1, "event_source must be at least 1 characters").max(255, "event_source must be at most 255 characters"),
  
  event_subject: z.string().max(255, "event_subject must be at most 255 characters").optional().nullable(),
  
  event_time: z.coerce.date(),
  
  spec_version: z.string().min(1, "spec_version is required").max(10, "spec_version must be at most 10 characters"),
  
  data_content_type: z.string().max(100, "data_content_type must be at most 100 characters").optional().nullable(),
  
  data_schema: z.string().max(255, "data_schema must be at most 255 characters").optional().nullable(),
  
  data: z.any(),
  
  correlation_id: z.string().max(255, "correlation_id must be at most 255 characters").optional().nullable(),
  
  causation_id: z.string().max(255, "causation_id must be at most 255 characters").optional().nullable(),
  
  kafka_topic: z.string().min(1, "kafka_topic is required").min(1, "kafka_topic must be at least 1 characters").max(255, "kafka_topic must be at most 255 characters"),
  
  kafka_partition: z.number().int().optional().nullable(),
  
  kafka_offset: z.number().int().optional().nullable(),
  
  kafka_key: z.string().max(255, "kafka_key must be at most 255 characters").optional().nullable(),
  
  producer_id: z.string().max(255, "producer_id must be at most 255 characters").optional().nullable(),
  
  published_at: z.coerce.date(),
  
  consumed_at: z.coerce.date().optional().nullable(),
  
  consumer_group: z.string().max(255, "consumer_group must be at most 255 characters").optional().nullable(),
  
  processing_status: z.enum(["PUBLISHED", "CONSUMED", "PROCESSED", "FAILED", "DEAD_LETTER"]),
  
  retry_count: z.number().int().max(100, "retry_count must be at most 100"),
  
  error_message: z.string().max(5000, "error_message must be at most 5000 characters").optional().nullable(),
  
  metadata: z.any().optional().nullable(),
  
});

const UpdateEventlogSchema = CreateEventlogSchema.partial();

const EventlogParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  CreateEventlogSchema,
  UpdateEventlogSchema,
  EventlogParamsSchema,
  };
