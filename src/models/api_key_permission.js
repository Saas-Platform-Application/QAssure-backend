// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Apikeypermission {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.api_key_id = data.api_key_id;
//     this.resource = data.resource;
//     this.action = data.action;
//     this.scope = data.scope;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }

//   // Static method to create new ApiKeyPermission
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO api_key_permissions (
//         id,
//         api_key_id,
//         resource,
//         action,
//         scope,
//         created_at
//       ) VALUES (
//         $1,
//         $2,
//         $3,
//         $4,
//         $5,
//         NOW()
//       )
//       RETURNING *
//     `;

//     const values = [
//       id,
//       data.api_key_id || null,
//       data.resource || null,
//       data.action || null,
//       data.scope || null,
//     ];

//     const result = await database.query(query, values);
//     return new Apikeypermission(result.rows[0]);
//   }

//   // Static method to get ApiKeyPermission by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM api_key_permissions
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Apikeypermission(result.rows[0]) : null;
//   }

//   // Static method to get all ApiKeyPermission with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM api_key_permissions
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Apikeypermission(row));
//   }

//   // Instance method to update ApiKeyPermission
//   async update(updateData) {
//     const query = `
//       UPDATE api_key_permissions SET
//         api_key_id = COALESCE($2, api_key_id),
//         resource = COALESCE($3, resource),
//         action = COALESCE($4, action),
//         scope = COALESCE($5, scope),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.api_key_id,
//       updateData.resource,
//       updateData.action,
//       updateData.scope,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete ApiKeyPermission
//   async delete() {
//     const query = `
//       DELETE FROM api_key_permissions
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
//     if (this.api_key_id === null || this.api_key_id === undefined ) {
//       throw new Error('api_key_id is required');
//     }
//     if (this.resource === null || this.resource === undefined || this.resource.trim().length === 0) {
//       throw new Error('resource is required');
//     }
//     if (this.resource && this.resource.length > 100) {
//       throw new Error('resource must be at most 100 characters');
//     }
//     if (this.action === null || this.action === undefined || this.action.trim().length === 0) {
//       throw new Error('action is required');
//     }
//     if (this.action && this.action.length > 50) {
//       throw new Error('action must be at most 50 characters');
//     }
//     if (this.scope === null || this.scope === undefined ) {
//       throw new Error('scope is required');
//     }
//     if (this.created_at === null || this.created_at === undefined ) {
//       throw new Error('created_at is required');
//     }
//     if (this.updated_at === null || this.updated_at === undefined ) {
//       throw new Error('updated_at is required');
//     }
//   }
// }

// module.exports = Apikeypermission;
