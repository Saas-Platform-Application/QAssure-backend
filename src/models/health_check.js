// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Healthcheck {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.module_id = data.module_id;
//     this.status = data.status;
//     this.response_time_ms = data.response_time_ms;
//     this.http_status = data.http_status;
//     this.error_message = data.error_message;
//     this.components = data.components;
//     this.consecutive_failures = data.consecutive_failures;
//     this.checked_at = data.checked_at;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }

//   // Static method to create new HealthCheck
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO health_checks (
//         id,
//         module_id,
//         status,
//         response_time_ms,
//         http_status,
//         error_message,
//         components,
//         consecutive_failures,
//         checked_at,
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
//         NOW()
//       )
//       RETURNING *
//     `;

//     const values = [
//       id,
//       data.module_id || null,
//       data.status || null,
//       data.response_time_ms || null,
//       data.http_status || null,
//       data.error_message || null,
//       data.components ? JSON.stringify(data.components) : null,
//       data.consecutive_failures || null,
//       data.checked_at || null,
//     ];

//     const result = await database.query(query, values);
//     return new Healthcheck(result.rows[0]);
//   }

//   // Static method to get HealthCheck by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM health_checks
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Healthcheck(result.rows[0]) : null;
//   }

//   // Static method to get all HealthCheck with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM health_checks
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Healthcheck(row));
//   }

//   // Instance method to update HealthCheck
//   async update(updateData) {
//     const query = `
//       UPDATE health_checks SET
//         module_id = COALESCE($2, module_id),
//         status = COALESCE($3, status),
//         response_time_ms = COALESCE($4, response_time_ms),
//         http_status = COALESCE($5, http_status),
//         error_message = COALESCE($6, error_message),
//         components = COALESCE($7, components),
//         consecutive_failures = COALESCE($8, consecutive_failures),
//         checked_at = COALESCE($9, checked_at),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.module_id,
//       updateData.status,
//       updateData.response_time_ms,
//       updateData.http_status,
//       updateData.error_message,
//       updateData.components !== undefined ? JSON.stringify(updateData.components) : undefined,
//       updateData.consecutive_failures,
//       updateData.checked_at,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete HealthCheck
//   async delete() {
//     const query = `
//       DELETE FROM health_checks
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
//     if (this.module_id === null || this.module_id === undefined ) {
//       throw new Error('module_id is required');
//     }
//     if (this.status === null || this.status === undefined ) {
//       throw new Error('status is required');
//     }
//     if (this.checked_at === null || this.checked_at === undefined ) {
//       throw new Error('checked_at is required');
//     }
//     if (this.created_at === null || this.created_at === undefined ) {
//       throw new Error('created_at is required');
//     }
//     if (this.updated_at === null || this.updated_at === undefined ) {
//       throw new Error('updated_at is required');
//     }
//   }
// }

// module.exports = Healthcheck;
