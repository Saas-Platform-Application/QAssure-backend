// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Auditlog {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.tenant_id = data.tenant_id;
//     this.user_id = data.user_id;
//     this.action = data.action;
//     this.resource_type = data.resource_type;
//     this.resource_id = data.resource_id;
//     this.request_method = data.request_method;
//     this.request_path = data.request_path;
//     this.request_body = data.request_body;
//     this.response_status = data.response_status;
//     this.response_body = data.response_body;
//     this.ip_address = data.ip_address;
//     this.user_agent = data.user_agent;
//     this.correlation_id = data.correlation_id;
//     this.changes = data.changes;
//     this.metadata = data.metadata;
//     this.created_at = data.created_at;
//   }

//   // Static method to create new AuditLog
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO audit_logs (
//         id,
//         tenant_id,
//         user_id,
//         action,
//         resource_type,
//         resource_id,
//         request_method,
//         request_path,
//         request_body,
//         response_status,
//         response_body,
//         ip_address,
//         user_agent,
//         correlation_id,
//         changes,
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
//         NOW()
//       )
//       RETURNING *
//     `;

//     const values = [
//       id,
//       data.tenant_id || null,
//       data.user_id || null,
//       data.action || null,
//       data.resource_type || null,
//       data.resource_id || null,
//       data.request_method || null,
//       data.request_path || null,
//       data.request_body ? JSON.stringify(data.request_body) : null,
//       data.response_status || null,
//       data.response_body ? JSON.stringify(data.response_body) : null,
//       data.ip_address || null,
//       data.user_agent || null,
//       data.correlation_id || null,
//       data.changes ? JSON.stringify(data.changes) : null,
//       data.metadata ? JSON.stringify(data.metadata) : null,
//     ];

//     const result = await database.query(query, values);
//     return new Auditlog(result.rows[0]);
//   }

//   // Static method to get AuditLog by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM audit_logs
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Auditlog(result.rows[0]) : null;
//   }

//   // Static method to get all AuditLog with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM audit_logs
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Auditlog(row));
//   }

//   // Instance method to update AuditLog
//   async update(updateData) {
//     const query = `
//       UPDATE audit_logs SET
//         tenant_id = COALESCE($2, tenant_id),
//         user_id = COALESCE($3, user_id),
//         action = COALESCE($4, action),
//         resource_type = COALESCE($5, resource_type),
//         resource_id = COALESCE($6, resource_id),
//         request_method = COALESCE($7, request_method),
//         request_path = COALESCE($8, request_path),
//         request_body = COALESCE($9, request_body),
//         response_status = COALESCE($10, response_status),
//         response_body = COALESCE($11, response_body),
//         ip_address = COALESCE($12, ip_address),
//         user_agent = COALESCE($13, user_agent),
//         correlation_id = COALESCE($14, correlation_id),
//         changes = COALESCE($15, changes),
//         metadata = COALESCE($16, metadata),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.tenant_id,
//       updateData.user_id,
//       updateData.action,
//       updateData.resource_type,
//       updateData.resource_id,
//       updateData.request_method,
//       updateData.request_path,
//       updateData.request_body !== undefined ? JSON.stringify(updateData.request_body) : undefined,
//       updateData.response_status,
//       updateData.response_body !== undefined ? JSON.stringify(updateData.response_body) : undefined,
//       updateData.ip_address,
//       updateData.user_agent,
//       updateData.correlation_id,
//       updateData.changes !== undefined ? JSON.stringify(updateData.changes) : undefined,
//       updateData.metadata !== undefined ? JSON.stringify(updateData.metadata) : undefined,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete AuditLog
//   async delete() {
//     const query = `
//       DELETE FROM audit_logs
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
//     if (this.action === null || this.action === undefined || this.action.trim().length === 0) {
//       throw new Error('action is required');
//     }
//     if (this.action && this.action.length > 100) {
//       throw new Error('action must be at most 100 characters');
//     }
//     if (this.resource_type === null || this.resource_type === undefined || this.resource_type.trim().length === 0) {
//       throw new Error('resource_type is required');
//     }
//     if (this.resource_type && this.resource_type.length > 100) {
//       throw new Error('resource_type must be at most 100 characters');
//     }
//     if (this.resource_id && this.resource_id.length > 255) {
//       throw new Error('resource_id must be at most 255 characters');
//     }
//     if (this.request_method && this.request_method.length > 10) {
//       throw new Error('request_method must be at most 10 characters');
//     }
//     if (this.request_path && this.request_path.length > 500) {
//       throw new Error('request_path must be at most 500 characters');
//     }
//     if (this.ip_address && this.ip_address.length > 45) {
//       throw new Error('ip_address must be at most 45 characters');
//     }
//     if (this.correlation_id && this.correlation_id.length > 100) {
//       throw new Error('correlation_id must be at most 100 characters');
//     }
//     if (this.created_at === null || this.created_at === undefined ) {
//       throw new Error('created_at is required');
//     }
//   }
// }

// module.exports = Auditlog;
