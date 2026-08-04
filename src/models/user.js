// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class User {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.email = data.email;
//     this.password_hash = data.password_hash;
//     this.first_name = data.first_name;
//     this.last_name = data.last_name;
//     this.status = data.status;
//     this.auth_provider = data.auth_provider;
//     this.saml_subject = data.saml_subject;
//     this.oauth_provider = data.oauth_provider;
//     this.oauth_subject = data.oauth_subject;
//     this.last_login_at = data.last_login_at;
//     this.login_count = data.login_count;
//     this.last_login_ip = data.last_login_ip;
//     this.preferences = data.preferences;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }

//   // Static method to create new User
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO users (
//         id,
//         email,
//         password_hash,
//         first_name,
//         last_name,
//         status,
//         auth_provider,
//         saml_subject,
//         oauth_provider,
//         oauth_subject,
//         last_login_at,
//         login_count,
//         last_login_ip,
//         preferences,
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
//       data.email || null,
//       data.password_hash || null,
//       data.first_name || null,
//       data.last_name || null,
//       data.status || null,
//       data.auth_provider || null,
//       data.saml_subject || null,
//       data.oauth_provider || null,
//       data.oauth_subject || null,
//       data.last_login_at || null,
//       data.login_count || null,
//       data.last_login_ip || null,
//       data.preferences ? JSON.stringify(data.preferences) : null,
//     ];

//     const result = await database.query(query, values);
//     return new User(result.rows[0]);
//   }

//   // Static method to get User by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM users
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new User(result.rows[0]) : null;
//   }

//   // Static method to get all User with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM users
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new User(row));
//   }

//   // Static method to get User by email
//   static async getByEmail(email) {
//     const query = `
//       SELECT * FROM users
//       WHERE email = $1
//       LIMIT 1
//     `;
//     const result = await database.query(query, [email]);
//     return result.rows.length ? new User(result.rows[0]) : null;
//   }
//   // Static method to get User by saml_subject
//   static async getBySamlSubject(saml_subject) {
//     const query = `
//       SELECT * FROM users
//       WHERE saml_subject = $1
//       LIMIT 1
//     `;
//     const result = await database.query(query, [saml_subject]);
//     return result.rows.length ? new User(result.rows[0]) : null;
//   }

//   // Instance method to update User
//   async update(updateData) {
//     const query = `
//       UPDATE users SET
//         email = COALESCE($2, email),
//         password_hash = COALESCE($3, password_hash),
//         first_name = COALESCE($4, first_name),
//         last_name = COALESCE($5, last_name),
//         status = COALESCE($6, status),
//         auth_provider = COALESCE($7, auth_provider),
//         saml_subject = COALESCE($8, saml_subject),
//         oauth_provider = COALESCE($9, oauth_provider),
//         oauth_subject = COALESCE($10, oauth_subject),
//         last_login_at = COALESCE($11, last_login_at),
//         login_count = COALESCE($12, login_count),
//         last_login_ip = COALESCE($13, last_login_ip),
//         preferences = COALESCE($14, preferences),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.email,
//       updateData.password_hash,
//       updateData.first_name,
//       updateData.last_name,
//       updateData.status,
//       updateData.auth_provider,
//       updateData.saml_subject,
//       updateData.oauth_provider,
//       updateData.oauth_subject,
//       updateData.last_login_at,
//       updateData.login_count,
//       updateData.last_login_ip,
//       updateData.preferences !== undefined ? JSON.stringify(updateData.preferences) : undefined,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete User
//   async delete() {
//     const query = `
//       DELETE FROM users
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
//     if (this.email === null || this.email === undefined || this.email.trim().length === 0) {
//       throw new Error('email is required');
//     }
//     if (this.email && this.email.length > 255) {
//       throw new Error('email must be at most 255 characters');
//     }
//     if (this.email && this.email.length < 5) {
//       throw new Error('email must be at least 5 characters');
//     }
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (this.email && !emailRegex.test(this.email)) {
//       throw new Error('email must be a valid email address');
//     }
//     // Note: Uniqueness validation should be handled at database level with unique constraints
//     if (this.password_hash && this.password_hash.length > 255) {
//       throw new Error('password_hash must be at most 255 characters');
//     }
//     if (this.first_name && this.first_name.length > 100) {
//       throw new Error('first_name must be at most 100 characters');
//     }
//     if (this.last_name && this.last_name.length > 100) {
//       throw new Error('last_name must be at most 100 characters');
//     }
//     if (this.status === null || this.status === undefined ) {
//       throw new Error('status is required');
//     }
//     if (this.auth_provider === null || this.auth_provider === undefined ) {
//       throw new Error('auth_provider is required');
//     }
//     if (this.saml_subject && this.saml_subject.length > 255) {
//       throw new Error('saml_subject must be at most 255 characters');
//     }
//     // Note: Uniqueness validation should be handled at database level with unique constraints
//     if (this.oauth_provider && this.oauth_provider.length > 50) {
//       throw new Error('oauth_provider must be at most 50 characters');
//     }
//     if (this.oauth_subject && this.oauth_subject.length > 255) {
//       throw new Error('oauth_subject must be at most 255 characters');
//     }
//     if (this.last_login_ip && this.last_login_ip.length > 45) {
//       throw new Error('last_login_ip must be at most 45 characters');
//     }
//     if (this.created_at === null || this.created_at === undefined ) {
//       throw new Error('created_at is required');
//     }
//     if (this.updated_at === null || this.updated_at === undefined ) {
//       throw new Error('updated_at is required');
//     }
//   }
// }

// module.exports = User;
