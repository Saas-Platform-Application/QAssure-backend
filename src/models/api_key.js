// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Apikey {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.key_hash = data.key_hash;
//     this.key_prefix = data.key_prefix;
//     this.name = data.name;
//     this.description = data.description;
//     this.tenant_id = data.tenant_id;
//     this.created_by = data.created_by;
//     this.status = data.status;
//     this.rate_limit = data.rate_limit;
//     this.ip_allowlist = data.ip_allowlist;
//     this.last_used_at = data.last_used_at;
//     this.last_used_ip = data.last_used_ip;
//     this.usage_count = data.usage_count;
//     this.expires_at = data.expires_at;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }

//   // Static method to create new ApiKey
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO api_keys (
//         id,
//         key_hash,
//         key_prefix,
//         name,
//         description,
//         tenant_id,
//         created_by,
//         status,
//         rate_limit,
//         ip_allowlist,
//         last_used_at,
//         last_used_ip,
//         usage_count,
//         expires_at,
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
//         NOW()
//       )
//       RETURNING *
//     `;

//     const values = [
//       id,
//       data.key_hash || null,
//       data.key_prefix || null,
//       data.name || null,
//       data.description || null,
//       data.tenant_id || null,
//       data.created_by || null,
//       data.status || null,
//       data.rate_limit || null,
//       data.ip_allowlist ? JSON.stringify(data.ip_allowlist) : null,
//       data.last_used_at || null,
//       data.last_used_ip || null,
//       data.usage_count || null,
//       data.expires_at || null,
//     ];

//     const result = await database.query(query, values);
//     return new Apikey(result.rows[0]);
//   }

//   // Static method to get ApiKey by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM api_keys
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Apikey(result.rows[0]) : null;
//   }

//   // Static method to get all ApiKey with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM api_keys
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Apikey(row));
//   }

//   // Static method to get ApiKey by key_hash
//   static async getByKeyHash(key_hash) {
//     const query = `
//       SELECT * FROM api_keys
//       WHERE key_hash = $1
//       LIMIT 1
//     `;
//     const result = await database.query(query, [key_hash]);
//     return result.rows.length ? new Apikey(result.rows[0]) : null;
//   }

//   // Instance method to update ApiKey
//   async update(updateData) {
//     const query = `
//       UPDATE api_keys SET
//         key_hash = COALESCE($2, key_hash),
//         key_prefix = COALESCE($3, key_prefix),
//         name = COALESCE($4, name),
//         description = COALESCE($5, description),
//         tenant_id = COALESCE($6, tenant_id),
//         created_by = COALESCE($7, created_by),
//         status = COALESCE($8, status),
//         rate_limit = COALESCE($9, rate_limit),
//         ip_allowlist = COALESCE($10, ip_allowlist),
//         last_used_at = COALESCE($11, last_used_at),
//         last_used_ip = COALESCE($12, last_used_ip),
//         usage_count = COALESCE($13, usage_count),
//         expires_at = COALESCE($14, expires_at),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.key_hash,
//       updateData.key_prefix,
//       updateData.name,
//       updateData.description,
//       updateData.tenant_id,
//       updateData.created_by,
//       updateData.status,
//       updateData.rate_limit,
//       updateData.ip_allowlist !== undefined ? JSON.stringify(updateData.ip_allowlist) : undefined,
//       updateData.last_used_at,
//       updateData.last_used_ip,
//       updateData.usage_count,
//       updateData.expires_at,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete ApiKey
//   async delete() {
//     const query = `
//       DELETE FROM api_keys
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [this.id]);
//     return result.rowCount > 0;
//   }

//   // Validate instance data
//   validate() {
//     if (this.id === null || this.id === undefined) {
//       throw new Error('id is required');
//     }
//     // Note: Uniqueness validation should be handled at database level with unique constraints
//     if (this.key_hash === null || this.key_hash === undefined || this.key_hash.trim().length === 0) {
//       throw new Error('key_hash is required');
//     }
//     if (this.key_hash && this.key_hash.length > 255) {
//       throw new Error('key_hash must be at most 255 characters');
//     }
//     if (this.key_prefix === null || this.key_prefix === undefined || this.key_prefix.trim().length === 0) {
//       throw new Error('key_prefix is required');
//     }
//     if (this.key_prefix && this.key_prefix.length > 10) {
//       throw new Error('key_prefix must be at most 10 characters');
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
//     if (this.tenant_id === null || this.tenant_id === undefined) {
//       throw new Error('tenant_id is required');
//     }
//     if (this.created_by === null || this.created_by === undefined) {
//       throw new Error('created_by is required');
//     }
//     if (this.status === null || this.status === undefined) {
//       throw new Error('status is required');
//     }
//     if (this.last_used_ip && this.last_used_ip.length > 45) {
//       throw new Error('last_used_ip must be at most 45 characters');
//     }
//     if (this.created_at === null || this.created_at === undefined) {
//       throw new Error('created_at is required');
//     }
//     if (this.updated_at === null || this.updated_at === undefined) {
//       throw new Error('updated_at is required');
//     }
//   }
// }

// module.exports = Apikey;
