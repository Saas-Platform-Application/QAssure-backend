// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Userrole {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.user_id = data.user_id;
//     this.role_id = data.role_id;
//     this.tenant_id = data.tenant_id;
//     this.module_id = data.module_id;
//     this.assigned_by = data.assigned_by;
//     this.assigned_at = data.assigned_at;
//     this.expires_at = data.expires_at;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }

//   // Static method to create new UserRole
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO user_roles (
//         id,
//         user_id,
//         role_id,
//         tenant_id,
//         module_id,
//         assigned_by,
//         assigned_at,
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
//         NOW()
//       )
//       RETURNING *
//     `;

//     const values = [
//       id,
//       data.user_id || null,
//       data.role_id || null,
//       data.tenant_id || null,
//       data.module_id || null,
//       data.assigned_by || null,
//       data.assigned_at || null,
//       data.expires_at || null,
//     ];

//     const result = await database.query(query, values);
//     return new Userrole(result.rows[0]);
//   }

//   // Static method to get UserRole by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM user_roles
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Userrole(result.rows[0]) : null;
//   }

//   // Static method to get all UserRole with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM user_roles
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Userrole(row));
//   }

//   // Instance method to update UserRole
//   async update(updateData) {
//     const query = `
//       UPDATE user_roles SET
//         user_id = COALESCE($2, user_id),
//         role_id = COALESCE($3, role_id),
//         tenant_id = COALESCE($4, tenant_id),
//         module_id = COALESCE($5, module_id),
//         assigned_by = COALESCE($6, assigned_by),
//         assigned_at = COALESCE($7, assigned_at),
//         expires_at = COALESCE($8, expires_at),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.user_id,
//       updateData.role_id,
//       updateData.tenant_id,
//       updateData.module_id,
//       updateData.assigned_by,
//       updateData.assigned_at,
//       updateData.expires_at,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete UserRole
//   async delete() {
//     const query = `
//       DELETE FROM user_roles
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
//     if (this.role_id === null || this.role_id === undefined ) {
//       throw new Error('role_id is required');
//     }
//     if (this.assigned_at === null || this.assigned_at === undefined ) {
//       throw new Error('assigned_at is required');
//     }
//     if (this.created_at === null || this.created_at === undefined ) {
//       throw new Error('created_at is required');
//     }
//     if (this.updated_at === null || this.updated_at === undefined ) {
//       throw new Error('updated_at is required');
//     }
//   }
// }

// module.exports = Userrole;
