// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Usertenant {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.user_id = data.user_id;
//     this.tenant_id = data.tenant_id;
//     this.status = data.status;
//     this.is_primary = data.is_primary;
//     this.joined_at = data.joined_at;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }

//   // Static method to create new UserTenant
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO user_tenants (
//         id,
//         user_id,
//         tenant_id,
//         status,
//         is_primary,
//         joined_at,
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
//       data.user_id || null,
//       data.tenant_id || null,
//       data.status || null,
//       data.is_primary || null,
//       data.joined_at || null,
//     ];

//     const result = await database.query(query, values);
//     return new Usertenant(result.rows[0]);
//   }

//   // Static method to get UserTenant by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM user_tenants
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Usertenant(result.rows[0]) : null;
//   }

//   // Static method to get all UserTenant with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM user_tenants
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Usertenant(row));
//   }

//   // Instance method to update UserTenant
//   async update(updateData) {
//     const query = `
//       UPDATE user_tenants SET
//         user_id = COALESCE($2, user_id),
//         tenant_id = COALESCE($3, tenant_id),
//         status = COALESCE($4, status),
//         is_primary = COALESCE($5, is_primary),
//         joined_at = COALESCE($6, joined_at),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.user_id,
//       updateData.tenant_id,
//       updateData.status,
//       updateData.is_primary,
//       updateData.joined_at,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete UserTenant
//   async delete() {
//     const query = `
//       DELETE FROM user_tenants
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
//     if (this.tenant_id === null || this.tenant_id === undefined ) {
//       throw new Error('tenant_id is required');
//     }
//     if (this.status === null || this.status === undefined ) {
//       throw new Error('status is required');
//     }
//     if (this.joined_at === null || this.joined_at === undefined ) {
//       throw new Error('joined_at is required');
//     }
//     if (this.created_at === null || this.created_at === undefined ) {
//       throw new Error('created_at is required');
//     }
//     if (this.updated_at === null || this.updated_at === undefined ) {
//       throw new Error('updated_at is required');
//     }
//   }
// }

// module.exports = Usertenant;
