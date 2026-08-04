// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Qmssyncconflict {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.tenant_id = data.tenant_id;
//     this.sync_job_id = data.sync_job_id;
//     this.qms_connection_id = data.qms_connection_id;
//     this.entity_type = data.entity_type;
//     this.entity_id = data.entity_id;
//     this.qms_record_id = data.qms_record_id;
//     this.qassure_record_id = data.qassure_record_id;
//     this.conflict_type = data.conflict_type;
//     this.conflict_field = data.conflict_field;
//     this.qms_value = data.qms_value;
//     this.qassure_value = data.qassure_value;
//     this.conflict_details = data.conflict_details;
//     this.status = data.status;
//     this.resolution_strategy = data.resolution_strategy;
//     this.resolved_value = data.resolved_value;
//     this.resolved_by = data.resolved_by;
//     this.resolved_at = data.resolved_at;
//     this.resolution_notes = data.resolution_notes;
//     this.retry_count = data.retry_count;
//     this.last_retry_at = data.last_retry_at;
//     this.error_message = data.error_message;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }

//   // Static method to create new QmsSyncConflict
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO qms_sync_conflicts (
//         id,
//         tenant_id,
//         sync_job_id,
//         qms_connection_id,
//         entity_type,
//         entity_id,
//         qms_record_id,
//         qassure_record_id,
//         conflict_type,
//         conflict_field,
//         qms_value,
//         qassure_value,
//         conflict_details,
//         status,
//         resolution_strategy,
//         resolved_value,
//         resolved_by,
//         resolved_at,
//         resolution_notes,
//         retry_count,
//         last_retry_at,
//         error_message,
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
//         NOW()
//       )
//       RETURNING *
//     `;

//     const values = [
//       id,
//       data.tenant_id || null,
//       data.sync_job_id || null,
//       data.qms_connection_id || null,
//       data.entity_type || null,
//       data.entity_id || null,
//       data.qms_record_id || null,
//       data.qassure_record_id || null,
//       data.conflict_type || null,
//       data.conflict_field || null,
//       data.qms_value ? JSON.stringify(data.qms_value) : null,
//       data.qassure_value ? JSON.stringify(data.qassure_value) : null,
//       data.conflict_details ? JSON.stringify(data.conflict_details) : null,
//       data.status || null,
//       data.resolution_strategy || null,
//       data.resolved_value ? JSON.stringify(data.resolved_value) : null,
//       data.resolved_by || null,
//       data.resolved_at || null,
//       data.resolution_notes || null,
//       data.retry_count || null,
//       data.last_retry_at || null,
//       data.error_message || null,
//     ];

//     const result = await database.query(query, values);
//     return new Qmssyncconflict(result.rows[0]);
//   }

//   // Static method to get QmsSyncConflict by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM qms_sync_conflicts
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Qmssyncconflict(result.rows[0]) : null;
//   }

//   // Static method to get all QmsSyncConflict with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM qms_sync_conflicts
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Qmssyncconflict(row));
//   }

//   // Instance method to update QmsSyncConflict
//   async update(updateData) {
//     const query = `
//       UPDATE qms_sync_conflicts SET
//         tenant_id = COALESCE($2, tenant_id),
//         sync_job_id = COALESCE($3, sync_job_id),
//         qms_connection_id = COALESCE($4, qms_connection_id),
//         entity_type = COALESCE($5, entity_type),
//         entity_id = COALESCE($6, entity_id),
//         qms_record_id = COALESCE($7, qms_record_id),
//         qassure_record_id = COALESCE($8, qassure_record_id),
//         conflict_type = COALESCE($9, conflict_type),
//         conflict_field = COALESCE($10, conflict_field),
//         qms_value = COALESCE($11, qms_value),
//         qassure_value = COALESCE($12, qassure_value),
//         conflict_details = COALESCE($13, conflict_details),
//         status = COALESCE($14, status),
//         resolution_strategy = COALESCE($15, resolution_strategy),
//         resolved_value = COALESCE($16, resolved_value),
//         resolved_by = COALESCE($17, resolved_by),
//         resolved_at = COALESCE($18, resolved_at),
//         resolution_notes = COALESCE($19, resolution_notes),
//         retry_count = COALESCE($20, retry_count),
//         last_retry_at = COALESCE($21, last_retry_at),
//         error_message = COALESCE($22, error_message),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.tenant_id,
//       updateData.sync_job_id,
//       updateData.qms_connection_id,
//       updateData.entity_type,
//       updateData.entity_id,
//       updateData.qms_record_id,
//       updateData.qassure_record_id,
//       updateData.conflict_type,
//       updateData.conflict_field,
//       updateData.qms_value !== undefined ? JSON.stringify(updateData.qms_value) : undefined,
//       updateData.qassure_value !== undefined ? JSON.stringify(updateData.qassure_value) : undefined,
//       updateData.conflict_details !== undefined ? JSON.stringify(updateData.conflict_details) : undefined,
//       updateData.status,
//       updateData.resolution_strategy,
//       updateData.resolved_value !== undefined ? JSON.stringify(updateData.resolved_value) : undefined,
//       updateData.resolved_by,
//       updateData.resolved_at,
//       updateData.resolution_notes,
//       updateData.retry_count,
//       updateData.last_retry_at,
//       updateData.error_message,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete QmsSyncConflict
//   async delete() {
//     const query = `
//       DELETE FROM qms_sync_conflicts
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
//     if (this.tenant_id === null || this.tenant_id === undefined ) {
//       throw new Error('tenant_id is required');
//     }
//     if (this.sync_job_id === null || this.sync_job_id === undefined ) {
//       throw new Error('sync_job_id is required');
//     }
//     if (this.qms_connection_id === null || this.qms_connection_id === undefined ) {
//       throw new Error('qms_connection_id is required');
//     }
//     if (this.entity_type === null || this.entity_type === undefined || this.entity_type.trim().length === 0) {
//       throw new Error('entity_type is required');
//     }
//     if (this.entity_type && this.entity_type.length > 100) {
//       throw new Error('entity_type must be at most 100 characters');
//     }
//     if (this.entity_type && this.entity_type.length < 1) {
//       throw new Error('entity_type must be at least 1 characters');
//     }
//     if (this.entity_id === null || this.entity_id === undefined || this.entity_id.trim().length === 0) {
//       throw new Error('entity_id is required');
//     }
//     if (this.entity_id && this.entity_id.length > 255) {
//       throw new Error('entity_id must be at most 255 characters');
//     }
//     if (this.entity_id && this.entity_id.length < 1) {
//       throw new Error('entity_id must be at least 1 characters');
//     }
//     if (this.qms_record_id === null || this.qms_record_id === undefined || this.qms_record_id.trim().length === 0) {
//       throw new Error('qms_record_id is required');
//     }
//     if (this.qms_record_id && this.qms_record_id.length > 255) {
//       throw new Error('qms_record_id must be at most 255 characters');
//     }
//     if (this.qms_record_id && this.qms_record_id.length < 1) {
//       throw new Error('qms_record_id must be at least 1 characters');
//     }
//     if (this.qassure_record_id && this.qassure_record_id.length > 255) {
//       throw new Error('qassure_record_id must be at most 255 characters');
//     }
//     if (this.conflict_type === null || this.conflict_type === undefined ) {
//       throw new Error('conflict_type is required');
//     }
//     if (this.conflict_field && this.conflict_field.length > 255) {
//       throw new Error('conflict_field must be at most 255 characters');
//     }
//     if (this.status === null || this.status === undefined ) {
//       throw new Error('status is required');
//     }
//     if (this.retry_count === null || this.retry_count === undefined ) {
//       throw new Error('retry_count is required');
//     }
//     if (this.created_at === null || this.created_at === undefined ) {
//       throw new Error('created_at is required');
//     }
//     if (this.updated_at === null || this.updated_at === undefined ) {
//       throw new Error('updated_at is required');
//     }
//   }
// }

// module.exports = Qmssyncconflict;
