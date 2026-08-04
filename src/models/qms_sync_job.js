// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Qmssyncjob {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.connection_id = data.connection_id;
//     this.job_type = data.job_type;
//     this.direction = data.direction;
//     this.status = data.status;
//     this.entity_type = data.entity_type;
//     this.records_total = data.records_total;
//     this.records_processed = data.records_processed;
//     this.records_created = data.records_created;
//     this.records_updated = data.records_updated;
//     this.records_failed = data.records_failed;
//     this.conflicts_detected = data.conflicts_detected;
//     this.conflicts_resolved = data.conflicts_resolved;
//     this.error_message = data.error_message;
//     this.error_details = data.error_details;
//     this.started_at = data.started_at;
//     this.completed_at = data.completed_at;
//     this.triggered_by = data.triggered_by;
//     this.metadata = data.metadata;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }

//   // Static method to create new QmsSyncJob
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO qms_sync_jobs (
//         id,
//         connection_id,
//         job_type,
//         direction,
//         status,
//         entity_type,
//         records_total,
//         records_processed,
//         records_created,
//         records_updated,
//         records_failed,
//         conflicts_detected,
//         conflicts_resolved,
//         error_message,
//         error_details,
//         started_at,
//         completed_at,
//         triggered_by,
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
//         NOW()
//       )
//       RETURNING *
//     `;

//     const values = [
//       id,
//       data.connection_id || null,
//       data.job_type || null,
//       data.direction || null,
//       data.status || null,
//       data.entity_type || null,
//       data.records_total || null,
//       data.records_processed || null,
//       data.records_created || null,
//       data.records_updated || null,
//       data.records_failed || null,
//       data.conflicts_detected || null,
//       data.conflicts_resolved || null,
//       data.error_message || null,
//       data.error_details ? JSON.stringify(data.error_details) : null,
//       data.started_at || null,
//       data.completed_at || null,
//       data.triggered_by || null,
//       data.metadata ? JSON.stringify(data.metadata) : null,
//     ];

//     const result = await database.query(query, values);
//     return new Qmssyncjob(result.rows[0]);
//   }

//   // Static method to get QmsSyncJob by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM qms_sync_jobs
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Qmssyncjob(result.rows[0]) : null;
//   }

//   // Static method to get all QmsSyncJob with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM qms_sync_jobs
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Qmssyncjob(row));
//   }

//   // Instance method to update QmsSyncJob
//   async update(updateData) {
//     const query = `
//       UPDATE qms_sync_jobs SET
//         connection_id = COALESCE($2, connection_id),
//         job_type = COALESCE($3, job_type),
//         direction = COALESCE($4, direction),
//         status = COALESCE($5, status),
//         entity_type = COALESCE($6, entity_type),
//         records_total = COALESCE($7, records_total),
//         records_processed = COALESCE($8, records_processed),
//         records_created = COALESCE($9, records_created),
//         records_updated = COALESCE($10, records_updated),
//         records_failed = COALESCE($11, records_failed),
//         conflicts_detected = COALESCE($12, conflicts_detected),
//         conflicts_resolved = COALESCE($13, conflicts_resolved),
//         error_message = COALESCE($14, error_message),
//         error_details = COALESCE($15, error_details),
//         started_at = COALESCE($16, started_at),
//         completed_at = COALESCE($17, completed_at),
//         triggered_by = COALESCE($18, triggered_by),
//         metadata = COALESCE($19, metadata),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.connection_id,
//       updateData.job_type,
//       updateData.direction,
//       updateData.status,
//       updateData.entity_type,
//       updateData.records_total,
//       updateData.records_processed,
//       updateData.records_created,
//       updateData.records_updated,
//       updateData.records_failed,
//       updateData.conflicts_detected,
//       updateData.conflicts_resolved,
//       updateData.error_message,
//       updateData.error_details !== undefined ? JSON.stringify(updateData.error_details) : undefined,
//       updateData.started_at,
//       updateData.completed_at,
//       updateData.triggered_by,
//       updateData.metadata !== undefined ? JSON.stringify(updateData.metadata) : undefined,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete QmsSyncJob
//   async delete() {
//     const query = `
//       DELETE FROM qms_sync_jobs
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
//     if (this.connection_id === null || this.connection_id === undefined ) {
//       throw new Error('connection_id is required');
//     }
//     if (this.job_type === null || this.job_type === undefined ) {
//       throw new Error('job_type is required');
//     }
//     if (this.direction === null || this.direction === undefined ) {
//       throw new Error('direction is required');
//     }
//     if (this.status === null || this.status === undefined ) {
//       throw new Error('status is required');
//     }
//     if (this.entity_type && this.entity_type.length > 100) {
//       throw new Error('entity_type must be at most 100 characters');
//     }
//     if (this.created_at === null || this.created_at === undefined ) {
//       throw new Error('created_at is required');
//     }
//     if (this.updated_at === null || this.updated_at === undefined ) {
//       throw new Error('updated_at is required');
//     }
//   }
// }

// module.exports = Qmssyncjob;
