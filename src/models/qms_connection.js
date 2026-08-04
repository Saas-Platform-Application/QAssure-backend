// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Qmsconnection {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.tenant_id = data.tenant_id;
//     this.name = data.name;
//     this.qms_type = data.qms_type;
//     this.base_url = data.base_url;
//     this.auth_type = data.auth_type;
//     this.auth_config = data.auth_config;
//     this.sync_mode = data.sync_mode;
//     this.entity_mappings = data.entity_mappings;
//     this.field_mappings = data.field_mappings;
//     this.webhook_url = data.webhook_url;
//     this.webhook_secret = data.webhook_secret;
//     this.status = data.status;
//     this.last_sync_at = data.last_sync_at;
//     this.last_error = data.last_error;
//     this.created_by = data.created_by;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }

//   // Static method to create new QmsConnection
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO qms_connections (
//         id,
//         tenant_id,
//         name,
//         qms_type,
//         base_url,
//         auth_type,
//         auth_config,
//         sync_mode,
//         entity_mappings,
//         field_mappings,
//         webhook_url,
//         webhook_secret,
//         status,
//         last_sync_at,
//         last_error,
//         created_by,
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
//       data.name || null,
//       data.qms_type || null,
//       data.base_url || null,
//       data.auth_type || null,
//       data.auth_config ? JSON.stringify(data.auth_config) : null,
//       data.sync_mode || null,
//       data.entity_mappings ? JSON.stringify(data.entity_mappings) : null,
//       data.field_mappings ? JSON.stringify(data.field_mappings) : null,
//       data.webhook_url || null,
//       data.webhook_secret || null,
//       data.status || null,
//       data.last_sync_at || null,
//       data.last_error || null,
//       data.created_by || null,
//     ];

//     const result = await database.query(query, values);
//     return new Qmsconnection(result.rows[0]);
//   }

//   // Static method to get QmsConnection by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM qms_connections
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Qmsconnection(result.rows[0]) : null;
//   }

//   // Static method to get all QmsConnection with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM qms_connections
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Qmsconnection(row));
//   }

//   // Instance method to update QmsConnection
//   async update(updateData) {
//     const query = `
//       UPDATE qms_connections SET
//         tenant_id = COALESCE($2, tenant_id),
//         name = COALESCE($3, name),
//         qms_type = COALESCE($4, qms_type),
//         base_url = COALESCE($5, base_url),
//         auth_type = COALESCE($6, auth_type),
//         auth_config = COALESCE($7, auth_config),
//         sync_mode = COALESCE($8, sync_mode),
//         entity_mappings = COALESCE($9, entity_mappings),
//         field_mappings = COALESCE($10, field_mappings),
//         webhook_url = COALESCE($11, webhook_url),
//         webhook_secret = COALESCE($12, webhook_secret),
//         status = COALESCE($13, status),
//         last_sync_at = COALESCE($14, last_sync_at),
//         last_error = COALESCE($15, last_error),
//         created_by = COALESCE($16, created_by),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.tenant_id,
//       updateData.name,
//       updateData.qms_type,
//       updateData.base_url,
//       updateData.auth_type,
//       updateData.auth_config !== undefined ? JSON.stringify(updateData.auth_config) : undefined,
//       updateData.sync_mode,
//       updateData.entity_mappings !== undefined ? JSON.stringify(updateData.entity_mappings) : undefined,
//       updateData.field_mappings !== undefined ? JSON.stringify(updateData.field_mappings) : undefined,
//       updateData.webhook_url,
//       updateData.webhook_secret,
//       updateData.status,
//       updateData.last_sync_at,
//       updateData.last_error,
//       updateData.created_by,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete QmsConnection
//   async delete() {
//     const query = `
//       DELETE FROM qms_connections
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
//     if (this.name === null || this.name === undefined || this.name.trim().length === 0) {
//       throw new Error('name is required');
//     }
//     if (this.name && this.name.length > 100) {
//       throw new Error('name must be at most 100 characters');
//     }
//     if (this.name && this.name.length < 3) {
//       throw new Error('name must be at least 3 characters');
//     }
//     if (this.qms_type === null || this.qms_type === undefined ) {
//       throw new Error('qms_type is required');
//     }
//     if (this.base_url === null || this.base_url === undefined || this.base_url.trim().length === 0) {
//       throw new Error('base_url is required');
//     }
//     if (this.base_url && this.base_url.length > 255) {
//       throw new Error('base_url must be at most 255 characters');
//     }
//     if (this.auth_type === null || this.auth_type === undefined ) {
//       throw new Error('auth_type is required');
//     }
//     if (this.auth_config === null || this.auth_config === undefined ) {
//       throw new Error('auth_config is required');
//     }
//     if (this.sync_mode === null || this.sync_mode === undefined ) {
//       throw new Error('sync_mode is required');
//     }
//     if (this.webhook_url && this.webhook_url.length > 255) {
//       throw new Error('webhook_url must be at most 255 characters');
//     }
//     if (this.webhook_secret && this.webhook_secret.length > 255) {
//       throw new Error('webhook_secret must be at most 255 characters');
//     }
//     if (this.status === null || this.status === undefined ) {
//       throw new Error('status is required');
//     }
//     if (this.created_by === null || this.created_by === undefined ) {
//       throw new Error('created_by is required');
//     }
//     if (this.created_at === null || this.created_at === undefined ) {
//       throw new Error('created_at is required');
//     }
//     if (this.updated_at === null || this.updated_at === undefined ) {
//       throw new Error('updated_at is required');
//     }
//   }
// }

// module.exports = Qmsconnection;
