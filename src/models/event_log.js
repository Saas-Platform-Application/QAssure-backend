// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Eventlog {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.tenant_id = data.tenant_id;
//     this.event_id = data.event_id;
//     this.event_type = data.event_type;
//     this.event_source = data.event_source;
//     this.event_subject = data.event_subject;
//     this.event_time = data.event_time;
//     this.spec_version = data.spec_version;
//     this.data_content_type = data.data_content_type;
//     this.data_schema = data.data_schema;
//     this.data = data.data;
//     this.correlation_id = data.correlation_id;
//     this.causation_id = data.causation_id;
//     this.kafka_topic = data.kafka_topic;
//     this.kafka_partition = data.kafka_partition;
//     this.kafka_offset = data.kafka_offset;
//     this.kafka_key = data.kafka_key;
//     this.producer_id = data.producer_id;
//     this.published_at = data.published_at;
//     this.consumed_at = data.consumed_at;
//     this.consumer_group = data.consumer_group;
//     this.processing_status = data.processing_status;
//     this.retry_count = data.retry_count;
//     this.error_message = data.error_message;
//     this.metadata = data.metadata;
//     this.created_at = data.created_at;
//   }

//   // Static method to create new EventLog
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO event_logs (
//         id,
//         tenant_id,
//         event_id,
//         event_type,
//         event_source,
//         event_subject,
//         event_time,
//         spec_version,
//         data_content_type,
//         data_schema,
//         data,
//         correlation_id,
//         causation_id,
//         kafka_topic,
//         kafka_partition,
//         kafka_offset,
//         kafka_key,
//         producer_id,
//         published_at,
//         consumed_at,
//         consumer_group,
//         processing_status,
//         retry_count,
//         error_message,
//         metadata,
//         created_at
//       ) VALUES (
//         $1,
//         $2,
//         $3,
//         $4,
//         $5,
//         $6,
//         $7,
//         $8,
//         $9,
//         $10,
//         $11,
//         $12,
//         $13,
//         $14,
//         $15,
//         $16,
//         $17,
//         $18,
//         $19,
//         $20,
//         $21,
//         $22,
//         $23,
//         $24,
//         $25,
//         NOW()
//       )
//       RETURNING *
//     `;

//     const values = [
//       id,
//       data.tenant_id || null,
//       data.event_id || null,
//       data.event_type || null,
//       data.event_source || null,
//       data.event_subject || null,
//       data.event_time || null,
//       data.spec_version || null,
//       data.data_content_type || null,
//       data.data_schema || null,
//       data.data ? JSON.stringify(data.data) : null,
//       data.correlation_id || null,
//       data.causation_id || null,
//       data.kafka_topic || null,
//       data.kafka_partition || null,
//       data.kafka_offset || null,
//       data.kafka_key || null,
//       data.producer_id || null,
//       data.published_at || null,
//       data.consumed_at || null,
//       data.consumer_group || null,
//       data.processing_status || null,
//       data.retry_count || null,
//       data.error_message || null,
//       data.metadata ? JSON.stringify(data.metadata) : null,
//     ];

//     const result = await database.query(query, values);
//     return new Eventlog(result.rows[0]);
//   }

//   // Static method to get EventLog by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM event_logs
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Eventlog(result.rows[0]) : null;
//   }

//   // Static method to get all EventLog with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM event_logs
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Eventlog(row));
//   }

//   // Static method to get EventLog by event_id
//   static async getByEventId(event_id) {
//     const query = `
//       SELECT * FROM event_logs
//       WHERE event_id = $1
//       LIMIT 1
//     `;
//     const result = await database.query(query, [event_id]);
//     return result.rows.length ? new Eventlog(result.rows[0]) : null;
//   }

//   // Instance method to update EventLog
//   async update(updateData) {
//     const query = `
//       UPDATE event_logs SET
//         tenant_id = COALESCE($2, tenant_id),
//         event_id = COALESCE($3, event_id),
//         event_type = COALESCE($4, event_type),
//         event_source = COALESCE($5, event_source),
//         event_subject = COALESCE($6, event_subject),
//         event_time = COALESCE($7, event_time),
//         spec_version = COALESCE($8, spec_version),
//         data_content_type = COALESCE($9, data_content_type),
//         data_schema = COALESCE($10, data_schema),
//         data = COALESCE($11, data),
//         correlation_id = COALESCE($12, correlation_id),
//         causation_id = COALESCE($13, causation_id),
//         kafka_topic = COALESCE($14, kafka_topic),
//         kafka_partition = COALESCE($15, kafka_partition),
//         kafka_offset = COALESCE($16, kafka_offset),
//         kafka_key = COALESCE($17, kafka_key),
//         producer_id = COALESCE($18, producer_id),
//         published_at = COALESCE($19, published_at),
//         consumed_at = COALESCE($20, consumed_at),
//         consumer_group = COALESCE($21, consumer_group),
//         processing_status = COALESCE($22, processing_status),
//         retry_count = COALESCE($23, retry_count),
//         error_message = COALESCE($24, error_message),
//         metadata = COALESCE($25, metadata),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.tenant_id,
//       updateData.event_id,
//       updateData.event_type,
//       updateData.event_source,
//       updateData.event_subject,
//       updateData.event_time,
//       updateData.spec_version,
//       updateData.data_content_type,
//       updateData.data_schema,
//       updateData.data !== undefined ? JSON.stringify(updateData.data) : undefined,
//       updateData.correlation_id,
//       updateData.causation_id,
//       updateData.kafka_topic,
//       updateData.kafka_partition,
//       updateData.kafka_offset,
//       updateData.kafka_key,
//       updateData.producer_id,
//       updateData.published_at,
//       updateData.consumed_at,
//       updateData.consumer_group,
//       updateData.processing_status,
//       updateData.retry_count,
//       updateData.error_message,
//       updateData.metadata !== undefined ? JSON.stringify(updateData.metadata) : undefined,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete EventLog
//   async delete() {
//     const query = `
//       DELETE FROM event_logs
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [this.id]);
//     return result.rowCount > 0;
//   }

//   // Validate instance data
//   validate() {
//     if (this.id === null || this.id === undefined ) {
//       throw new Error('id is required');
//     }
//     // Note: Uniqueness validation should be handled at database level with unique constraints
//     if (this.event_id === null || this.event_id === undefined || this.event_id.trim().length === 0) {
//       throw new Error('event_id is required');
//     }
//     if (this.event_id && this.event_id.length > 255) {
//       throw new Error('event_id must be at most 255 characters');
//     }
//     if (this.event_id && this.event_id.length < 1) {
//       throw new Error('event_id must be at least 1 characters');
//     }
//     // Note: Uniqueness validation should be handled at database level with unique constraints
//     if (this.event_type === null || this.event_type === undefined || this.event_type.trim().length === 0) {
//       throw new Error('event_type is required');
//     }
//     if (this.event_type && this.event_type.length > 255) {
//       throw new Error('event_type must be at most 255 characters');
//     }
//     if (this.event_type && this.event_type.length < 1) {
//       throw new Error('event_type must be at least 1 characters');
//     }
//     if (this.event_source === null || this.event_source === undefined || this.event_source.trim().length === 0) {
//       throw new Error('event_source is required');
//     }
//     if (this.event_source && this.event_source.length > 255) {
//       throw new Error('event_source must be at most 255 characters');
//     }
//     if (this.event_source && this.event_source.length < 1) {
//       throw new Error('event_source must be at least 1 characters');
//     }
//     if (this.event_subject && this.event_subject.length > 255) {
//       throw new Error('event_subject must be at most 255 characters');
//     }
//     if (this.event_time === null || this.event_time === undefined ) {
//       throw new Error('event_time is required');
//     }
//     if (this.spec_version === null || this.spec_version === undefined || this.spec_version.trim().length === 0) {
//       throw new Error('spec_version is required');
//     }
//     if (this.spec_version && this.spec_version.length > 10) {
//       throw new Error('spec_version must be at most 10 characters');
//     }
//     if (this.data_content_type && this.data_content_type.length > 100) {
//       throw new Error('data_content_type must be at most 100 characters');
//     }
//     if (this.data_schema && this.data_schema.length > 255) {
//       throw new Error('data_schema must be at most 255 characters');
//     }
//     if (this.data === null || this.data === undefined ) {
//       throw new Error('data is required');
//     }
//     if (this.correlation_id && this.correlation_id.length > 255) {
//       throw new Error('correlation_id must be at most 255 characters');
//     }
//     if (this.causation_id && this.causation_id.length > 255) {
//       throw new Error('causation_id must be at most 255 characters');
//     }
//     if (this.kafka_topic === null || this.kafka_topic === undefined || this.kafka_topic.trim().length === 0) {
//       throw new Error('kafka_topic is required');
//     }
//     if (this.kafka_topic && this.kafka_topic.length > 255) {
//       throw new Error('kafka_topic must be at most 255 characters');
//     }
//     if (this.kafka_topic && this.kafka_topic.length < 1) {
//       throw new Error('kafka_topic must be at least 1 characters');
//     }
//     if (this.kafka_key && this.kafka_key.length > 255) {
//       throw new Error('kafka_key must be at most 255 characters');
//     }
//     if (this.producer_id && this.producer_id.length > 255) {
//       throw new Error('producer_id must be at most 255 characters');
//     }
//     if (this.published_at === null || this.published_at === undefined ) {
//       throw new Error('published_at is required');
//     }
//     if (this.consumer_group && this.consumer_group.length > 255) {
//       throw new Error('consumer_group must be at most 255 characters');
//     }
//     if (this.processing_status === null || this.processing_status === undefined ) {
//       throw new Error('processing_status is required');
//     }
//     if (this.retry_count === null || this.retry_count === undefined ) {
//       throw new Error('retry_count is required');
//     }
//     if (this.created_at === null || this.created_at === undefined ) {
//       throw new Error('created_at is required');
//     }
//   }
// }

// module.exports = Eventlog;
