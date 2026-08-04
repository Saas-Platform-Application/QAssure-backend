// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Module {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.module_id = data.module_id;
//     this.name = data.name;
//     this.description = data.description;
//     this.version = data.version;
//     this.status = data.status;
//     this.runtime_language = data.runtime_language;
//     this.framework = data.framework;
//     this.base_url = data.base_url;
//     this.health_endpoint = data.health_endpoint;
//     this.endpoints = data.endpoints;
//     this.kafka_topics = data.kafka_topics;
//     this.cpu_request = data.cpu_request;
//     this.cpu_limit = data.cpu_limit;
//     this.memory_request = data.memory_request;
//     this.memory_limit = data.memory_limit;
//     this.min_replicas = data.min_replicas;
//     this.max_replicas = data.max_replicas;
//     this.last_health_check = data.last_health_check;
//     this.health_status = data.health_status;
//     this.consecutive_failures = data.consecutive_failures;
//     this.registered_by = data.registered_by;
//     this.tenant_id = data.tenant_id;
//     this.metadata = data.metadata;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }

//   // Static method to create new Module
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO modules (
//         id,
//         module_id,
//         name,
//         description,
//         version,
//         status,
//         runtime_language,
//         framework,
//         base_url,
//         health_endpoint,
//         endpoints,
//         kafka_topics,
//         cpu_request,
//         cpu_limit,
//         memory_request,
//         memory_limit,
//         min_replicas,
//         max_replicas,
//         last_health_check,
//         health_status,
//         consecutive_failures,
//         registered_by,
//         tenant_id,
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
//         NOW()
//       )
//       RETURNING *
//     `;

//     const values = [
//       id,
//       data.module_id || null,
//       data.name || null,
//       data.description || null,
//       data.version || null,
//       data.status || null,
//       data.runtime_language || null,
//       data.framework || null,
//       data.base_url || null,
//       data.health_endpoint || null,
//       data.endpoints ? JSON.stringify(data.endpoints) : null,
//       data.kafka_topics ? JSON.stringify(data.kafka_topics) : null,
//       data.cpu_request || null,
//       data.cpu_limit || null,
//       data.memory_request || null,
//       data.memory_limit || null,
//       data.min_replicas || null,
//       data.max_replicas || null,
//       data.last_health_check || null,
//       data.health_status || null,
//       data.consecutive_failures || null,
//       data.registered_by || null,
//       data.tenant_id || null,
//       data.metadata ? JSON.stringify(data.metadata) : null,
//     ];

//     const result = await database.query(query, values);
//     return new Module(result.rows[0]);
//   }

//   // Static method to get Module by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM modules
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Module(result.rows[0]) : null;
//   }

//   // Static method to get all Module with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM modules
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Module(row));
//   }

//   // Static method to get Module by module_id
//   static async getByModuleId(module_id) {
//     const query = `
//       SELECT * FROM modules
//       WHERE module_id = $1
//       LIMIT 1
//     `;
//     const result = await database.query(query, [module_id]);
//     return result.rows.length ? new Module(result.rows[0]) : null;
//   }

//   // Instance method to update Module
//   async update(updateData) {
//     const query = `
//       UPDATE modules SET
//         module_id = COALESCE($2, module_id),
//         name = COALESCE($3, name),
//         description = COALESCE($4, description),
//         version = COALESCE($5, version),
//         status = COALESCE($6, status),
//         runtime_language = COALESCE($7, runtime_language),
//         framework = COALESCE($8, framework),
//         base_url = COALESCE($9, base_url),
//         health_endpoint = COALESCE($10, health_endpoint),
//         endpoints = COALESCE($11, endpoints),
//         kafka_topics = COALESCE($12, kafka_topics),
//         cpu_request = COALESCE($13, cpu_request),
//         cpu_limit = COALESCE($14, cpu_limit),
//         memory_request = COALESCE($15, memory_request),
//         memory_limit = COALESCE($16, memory_limit),
//         min_replicas = COALESCE($17, min_replicas),
//         max_replicas = COALESCE($18, max_replicas),
//         last_health_check = COALESCE($19, last_health_check),
//         health_status = COALESCE($20, health_status),
//         consecutive_failures = COALESCE($21, consecutive_failures),
//         registered_by = COALESCE($22, registered_by),
//         tenant_id = COALESCE($23, tenant_id),
//         metadata = COALESCE($24, metadata),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.module_id,
//       updateData.name,
//       updateData.description,
//       updateData.version,
//       updateData.status,
//       updateData.runtime_language,
//       updateData.framework,
//       updateData.base_url,
//       updateData.health_endpoint,
//       updateData.endpoints !== undefined ? JSON.stringify(updateData.endpoints) : undefined,
//       updateData.kafka_topics !== undefined ? JSON.stringify(updateData.kafka_topics) : undefined,
//       updateData.cpu_request,
//       updateData.cpu_limit,
//       updateData.memory_request,
//       updateData.memory_limit,
//       updateData.min_replicas,
//       updateData.max_replicas,
//       updateData.last_health_check,
//       updateData.health_status,
//       updateData.consecutive_failures,
//       updateData.registered_by,
//       updateData.tenant_id,
//       updateData.metadata !== undefined ? JSON.stringify(updateData.metadata) : undefined,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete Module
//   async delete() {
//     const query = `
//       DELETE FROM modules
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
//     if (this.module_id === null || this.module_id === undefined || this.module_id.trim().length === 0) {
//       throw new Error('module_id is required');
//     }
//     if (this.module_id && this.module_id.length > 100) {
//       throw new Error('module_id must be at most 100 characters');
//     }
//     if (this.module_id && this.module_id.length < 10) {
//       throw new Error('module_id must be at least 10 characters');
//     }
//     // Note: Uniqueness validation should be handled at database level with unique constraints
//     if (this.name === null || this.name === undefined || this.name.trim().length === 0) {
//       throw new Error('name is required');
//     }
//     if (this.name && this.name.length > 100) {
//       throw new Error('name must be at most 100 characters');
//     }
//     if (this.name && this.name.length < 3) {
//       throw new Error('name must be at least 3 characters');
//     }
//     if (this.version === null || this.version === undefined || this.version.trim().length === 0) {
//       throw new Error('version is required');
//     }
//     if (this.version && this.version.length > 20) {
//       throw new Error('version must be at most 20 characters');
//     }
//     if (this.status === null || this.status === undefined ) {
//       throw new Error('status is required');
//     }
//     if (this.runtime_language === null || this.runtime_language === undefined || this.runtime_language.trim().length === 0) {
//       throw new Error('runtime_language is required');
//     }
//     if (this.runtime_language && this.runtime_language.length > 50) {
//       throw new Error('runtime_language must be at most 50 characters');
//     }
//     if (this.framework && this.framework.length > 50) {
//       throw new Error('framework must be at most 50 characters');
//     }
//     if (this.base_url === null || this.base_url === undefined || this.base_url.trim().length === 0) {
//       throw new Error('base_url is required');
//     }
//     if (this.base_url && this.base_url.length > 255) {
//       throw new Error('base_url must be at most 255 characters');
//     }
//     if (this.health_endpoint === null || this.health_endpoint === undefined || this.health_endpoint.trim().length === 0) {
//       throw new Error('health_endpoint is required');
//     }
//     if (this.health_endpoint && this.health_endpoint.length > 255) {
//       throw new Error('health_endpoint must be at most 255 characters');
//     }
//     if (this.cpu_request && this.cpu_request.length > 20) {
//       throw new Error('cpu_request must be at most 20 characters');
//     }
//     if (this.cpu_limit && this.cpu_limit.length > 20) {
//       throw new Error('cpu_limit must be at most 20 characters');
//     }
//     if (this.memory_request && this.memory_request.length > 20) {
//       throw new Error('memory_request must be at most 20 characters');
//     }
//     if (this.memory_limit && this.memory_limit.length > 20) {
//       throw new Error('memory_limit must be at most 20 characters');
//     }
//     if (this.health_status && this.health_status.length > 20) {
//       throw new Error('health_status must be at most 20 characters');
//     }
//     if (this.registered_by === null || this.registered_by === undefined ) {
//       throw new Error('registered_by is required');
//     }
//     if (this.created_at === null || this.created_at === undefined ) {
//       throw new Error('created_at is required');
//     }
//     if (this.updated_at === null || this.updated_at === undefined ) {
//       throw new Error('updated_at is required');
//     }
//   }
// }

// module.exports = Module;
