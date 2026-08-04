// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Tenant {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.name = data.name;
//     this.slug = data.slug;
//     this.status = data.status;
//     this.settings = data.settings;
//     this.subscription_tier = data.subscription_tier;
//     this.max_users = data.max_users;
//     this.max_modules = data.max_modules;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }

//   // Static method to create new Tenant
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO tenants (
//         id,
//         name,
//         slug,
//         status,
//         settings,
//         subscription_tier,
//         max_users,
//         max_modules,
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
//       data.name || null,
//       data.slug || null,
//       data.status || null,
//       data.settings ? JSON.stringify(data.settings) : null,
//       data.subscription_tier || null,
//       data.max_users || null,
//       data.max_modules || null,
//     ];

//     const result = await database.query(query, values);
//     return new Tenant(result.rows[0]);
//   }

//   // Static method to get Tenant by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM tenants
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Tenant(result.rows[0]) : null;
//   }

//   // Static method to get all Tenant with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM tenants
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Tenant(row));
//   }

//   // Static method to get Tenant by name
//   static async getByName(name) {
//     const query = `
//       SELECT * FROM tenants
//       WHERE name = $1
//       LIMIT 1
//     `;
//     const result = await database.query(query, [name]);
//     return result.rows.length ? new Tenant(result.rows[0]) : null;
//   }
//   // Static method to get Tenant by slug
//   static async getBySlug(slug) {
//     const query = `
//       SELECT * FROM tenants
//       WHERE slug = $1
//       LIMIT 1
//     `;
//     const result = await database.query(query, [slug]);
//     return result.rows.length ? new Tenant(result.rows[0]) : null;
//   }

//   // Instance method to update Tenant
//   async update(updateData) {
//     const query = `
//       UPDATE tenants SET
//         name = COALESCE($2, name),
//         slug = COALESCE($3, slug),
//         status = COALESCE($4, status),
//         settings = COALESCE($5, settings),
//         subscription_tier = COALESCE($6, subscription_tier),
//         max_users = COALESCE($7, max_users),
//         max_modules = COALESCE($8, max_modules),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.name,
//       updateData.slug,
//       updateData.status,
//       updateData.settings !== undefined ? JSON.stringify(updateData.settings) : undefined,
//       updateData.subscription_tier,
//       updateData.max_users,
//       updateData.max_modules,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete Tenant
//   async delete() {
//     const query = `
//       DELETE FROM tenants
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
//     if (this.name && this.name.length > 100) {
//       throw new Error('name must be at most 100 characters');
//     }
//     if (this.name && this.name.length < 3) {
//       throw new Error('name must be at least 3 characters');
//     }
//     // Note: Uniqueness validation should be handled at database level with unique constraints
//     if (this.slug === null || this.slug === undefined || this.slug.trim().length === 0) {
//       throw new Error('slug is required');
//     }
//     if (this.slug && this.slug.length > 100) {
//       throw new Error('slug must be at most 100 characters');
//     }
//     if (this.slug && this.slug.length < 3) {
//       throw new Error('slug must be at least 3 characters');
//     }
//     // Note: Uniqueness validation should be handled at database level with unique constraints
//     if (this.status === null || this.status === undefined ) {
//       throw new Error('status is required');
//     }
//     if (this.subscription_tier && this.subscription_tier.length > 50) {
//       throw new Error('subscription_tier must be at most 50 characters');
//     }
//     if (this.created_at === null || this.created_at === undefined ) {
//       throw new Error('created_at is required');
//     }
//     if (this.updated_at === null || this.updated_at === undefined ) {
//       throw new Error('updated_at is required');
//     }
//   }
// }

// module.exports = Tenant;
