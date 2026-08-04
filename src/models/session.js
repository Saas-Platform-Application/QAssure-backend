// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Session {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.user_id = data.user_id;
//     this.tenant_id = data.tenant_id;
//     this.token_hash = data.token_hash;
//     this.refresh_token_hash = data.refresh_token_hash;
//     this.ip_address = data.ip_address;
//     this.user_agent = data.user_agent;
//     this.expires_at = data.expires_at;
//     this.refresh_expires_at = data.refresh_expires_at;
//     this.revoked_at = data.revoked_at;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }

//   // Static method to create new Session
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO sessions (
//         id,
//         user_id,
//         tenant_id,
//         token_hash,
//         refresh_token_hash,
//         ip_address,
//         user_agent,
//         expires_at,
//         refresh_expires_at,
//         revoked_at,
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
//         NOW()
//       )
//       RETURNING *
//     `;

//     const values = [
//       id,
//       data.user_id || null,
//       data.tenant_id || null,
//       data.token_hash || null,
//       data.refresh_token_hash || null,
//       data.ip_address || null,
//       data.user_agent || null,
//       data.expires_at || null,
//       data.refresh_expires_at || null,
//       data.revoked_at || null,
//     ];

//     const result = await database.query(query, values);
//     return new Session(result.rows[0]);
//   }

//   // Static method to get Session by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM sessions
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Session(result.rows[0]) : null;
//   }

//   // Static method to get all Session with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM sessions
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Session(row));
//   }

//   // Static method to get Session by token_hash
//   static async getByTokenHash(token_hash) {
//     const query = `
//       SELECT * FROM sessions
//       WHERE token_hash = $1
//       LIMIT 1
//     `;
//     const result = await database.query(query, [token_hash]);
//     return result.rows.length ? new Session(result.rows[0]) : null;
//   }
//   // Static method to get Session by refresh_token_hash
//   static async getByRefreshTokenHash(refresh_token_hash) {
//     const query = `
//       SELECT * FROM sessions
//       WHERE refresh_token_hash = $1
//       LIMIT 1
//     `;
//     const result = await database.query(query, [refresh_token_hash]);
//     return result.rows.length ? new Session(result.rows[0]) : null;
//   }

//   // Instance method to update Session
//   async update(updateData) {
//     const query = `
//       UPDATE sessions SET
//         user_id = COALESCE($2, user_id),
//         tenant_id = COALESCE($3, tenant_id),
//         token_hash = COALESCE($4, token_hash),
//         refresh_token_hash = COALESCE($5, refresh_token_hash),
//         ip_address = COALESCE($6, ip_address),
//         user_agent = COALESCE($7, user_agent),
//         expires_at = COALESCE($8, expires_at),
//         refresh_expires_at = COALESCE($9, refresh_expires_at),
//         revoked_at = COALESCE($10, revoked_at),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.user_id,
//       updateData.tenant_id,
//       updateData.token_hash,
//       updateData.refresh_token_hash,
//       updateData.ip_address,
//       updateData.user_agent,
//       updateData.expires_at,
//       updateData.refresh_expires_at,
//       updateData.revoked_at,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete Session
//   async delete() {
//     const query = `
//       DELETE FROM sessions
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
//     if (this.user_id === null || this.user_id === undefined ) {
//       throw new Error('user_id is required');
//     }
//     if (this.token_hash === null || this.token_hash === undefined || this.token_hash.trim().length === 0) {
//       throw new Error('token_hash is required');
//     }
//     if (this.token_hash && this.token_hash.length > 255) {
//       throw new Error('token_hash must be at most 255 characters');
//     }
//     // Note: Uniqueness validation should be handled at database level with unique constraints
//     if (this.refresh_token_hash && this.refresh_token_hash.length > 255) {
//       throw new Error('refresh_token_hash must be at most 255 characters');
//     }
//     // Note: Uniqueness validation should be handled at database level with unique constraints
//     if (this.ip_address && this.ip_address.length > 45) {
//       throw new Error('ip_address must be at most 45 characters');
//     }
//     if (this.expires_at === null || this.expires_at === undefined ) {
//       throw new Error('expires_at is required');
//     }
//     if (this.created_at === null || this.created_at === undefined ) {
//       throw new Error('created_at is required');
//     }
//     if (this.updated_at === null || this.updated_at === undefined ) {
//       throw new Error('updated_at is required');
//     }
//   }
// }

// module.exports = Session;
