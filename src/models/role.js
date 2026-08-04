// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Role {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.name = data.name;
//     this.code = data.code;
//     this.description = data.description;
//     this.scope = data.scope;
//     this.is_system = data.is_system;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }

//   // Static method to create new Role
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO roles (
//         id,
//         name,
//         code,
//         description,
//         scope,
//         is_system,
//         created_at
//       ) VALUES (
//         $1,
//         $2,
//         $3,
//         $4,
//         $5,
//         $6,
//         NOW()
//       )
//       RETURNING *
//     `;

//     const values = [
//       id,
//       data.name || null,
//       data.code || null,
//       data.description || null,
//       data.scope || null,
//       data.is_system || null,
//     ];

//     const result = await database.query(query, values);
//     return new Role(result.rows[0]);
//   }

//   // Static method to get Role by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM roles
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Role(result.rows[0]) : null;
//   }

//   // Static method to get all Role with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM roles
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Role(row));
//   }

//   // Static method to get Role by name
//   static async getByName(name) {
//     const query = `
//       SELECT * FROM roles
//       WHERE name = $1
//       LIMIT 1
//     `;
//     const result = await database.query(query, [name]);
//     return result.rows.length ? new Role(result.rows[0]) : null;
//   }
//   // Static method to get Role by code
//   static async getByCode(code) {
//     const query = `
//       SELECT * FROM roles
//       WHERE code = $1
//       LIMIT 1
//     `;
//     const result = await database.query(query, [code]);
//     return result.rows.length ? new Role(result.rows[0]) : null;
//   }

//   // Instance method to update Role
//   async update(updateData) {
//     const query = `
//       UPDATE roles SET
//         name = COALESCE($2, name),
//         code = COALESCE($3, code),
//         description = COALESCE($4, description),
//         scope = COALESCE($5, scope),
//         is_system = COALESCE($6, is_system),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.name,
//       updateData.code,
//       updateData.description,
//       updateData.scope,
//       updateData.is_system,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete Role
//   async delete() {
//     const query = `
//       DELETE FROM roles
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
//     if (this.name === null || this.name === undefined || this.name.trim().length === 0) {
//       throw new Error('name is required');
//     }
//     if (this.name && this.name.length > 50) {
//       throw new Error('name must be at most 50 characters');
//     }
//     if (this.name && this.name.length < 3) {
//       throw new Error('name must be at least 3 characters');
//     }
//     // Note: Uniqueness validation should be handled at database level with unique constraints
//     if (this.code === null || this.code === undefined ) {
//       throw new Error('code is required');
//     }
//     // Note: Uniqueness validation should be handled at database level with unique constraints
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

// module.exports = Role;
