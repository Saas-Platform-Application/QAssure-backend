// const database = require('../config/database');
// const { v4: uuidv4 } = require('uuid');

// class Qmsentitymapping {
//   constructor(data = {}) {
//     this.id = data.id;
//     this.tenant_id = data.tenant_id;
//     this.qms_connection_id = data.qms_connection_id;
//     this.qms_entity_type = data.qms_entity_type;
//     this.qassure_entity_type = data.qassure_entity_type;
//     this.mapping_direction = data.mapping_direction;
//     this.field_mappings = data.field_mappings;
//     this.transformation_rules = data.transformation_rules;
//     this.validation_rules = data.validation_rules;
//     this.conflict_resolution_strategy = data.conflict_resolution_strategy;
//     this.sync_enabled = data.sync_enabled;
//     this.sync_frequency = data.sync_frequency;
//     this.filter_criteria = data.filter_criteria;
//     this.last_sync_at = data.last_sync_at;
//     this.records_synced = data.records_synced;
//     this.created_by = data.created_by;
//     this.updated_by = data.updated_by;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }

//   // Static method to create new QmsEntityMapping
//   static async create(data) {
//     const id = uuidv4();
//     const query = `
//       INSERT INTO qms_entity_mappings (
//         id,
//         tenant_id,
//         qms_connection_id,
//         qms_entity_type,
//         qassure_entity_type,
//         mapping_direction,
//         field_mappings,
//         transformation_rules,
//         validation_rules,
//         conflict_resolution_strategy,
//         sync_enabled,
//         sync_frequency,
//         filter_criteria,
//         last_sync_at,
//         records_synced,
//         created_by,
//         updated_by,
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
//         NOW()
//       )
//       RETURNING *
//     `;

//     const values = [
//       id,
//       data.tenant_id || null,
//       data.qms_connection_id || null,
//       data.qms_entity_type || null,
//       data.qassure_entity_type || null,
//       data.mapping_direction || null,
//       data.field_mappings ? JSON.stringify(data.field_mappings) : null,
//       data.transformation_rules ? JSON.stringify(data.transformation_rules) : null,
//       data.validation_rules ? JSON.stringify(data.validation_rules) : null,
//       data.conflict_resolution_strategy || null,
//       data.sync_enabled || null,
//       data.sync_frequency || null,
//       data.filter_criteria ? JSON.stringify(data.filter_criteria) : null,
//       data.last_sync_at || null,
//       data.records_synced || null,
//       data.created_by || null,
//       data.updated_by || null,
//     ];

//     const result = await database.query(query, values);
//     return new Qmsentitymapping(result.rows[0]);
//   }

//   // Static method to get QmsEntityMapping by ID
//   static async getById(id) {
//     const query = `
//       SELECT * FROM qms_entity_mappings
//       WHERE id = $1
//     `;
//     const result = await database.query(query, [id]);
//     return result.rows.length ? new Qmsentitymapping(result.rows[0]) : null;
//   }

//   // Static method to get all QmsEntityMapping with pagination
//   static async getAll(limit = 100, offset = 0) {
//     const query = `
//       SELECT * FROM qms_entity_mappings
//       ORDER BY created_at DESC
//       LIMIT $1 OFFSET $2
//     `;
//     const result = await database.query(query, [limit, offset]);
//     return result.rows.map(row => new Qmsentitymapping(row));
//   }

//   // Instance method to update QmsEntityMapping
//   async update(updateData) {
//     const query = `
//       UPDATE qms_entity_mappings SET
//         tenant_id = COALESCE($2, tenant_id),
//         qms_connection_id = COALESCE($3, qms_connection_id),
//         qms_entity_type = COALESCE($4, qms_entity_type),
//         qassure_entity_type = COALESCE($5, qassure_entity_type),
//         mapping_direction = COALESCE($6, mapping_direction),
//         field_mappings = COALESCE($7, field_mappings),
//         transformation_rules = COALESCE($8, transformation_rules),
//         validation_rules = COALESCE($9, validation_rules),
//         conflict_resolution_strategy = COALESCE($10, conflict_resolution_strategy),
//         sync_enabled = COALESCE($11, sync_enabled),
//         sync_frequency = COALESCE($12, sync_frequency),
//         filter_criteria = COALESCE($13, filter_criteria),
//         last_sync_at = COALESCE($14, last_sync_at),
//         records_synced = COALESCE($15, records_synced),
//         created_by = COALESCE($16, created_by),
//         updated_by = COALESCE($17, updated_by),
//         updated_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;

//     const values = [
//       this.id,
//       updateData.tenant_id,
//       updateData.qms_connection_id,
//       updateData.qms_entity_type,
//       updateData.qassure_entity_type,
//       updateData.mapping_direction,
//       updateData.field_mappings !== undefined ? JSON.stringify(updateData.field_mappings) : undefined,
//       updateData.transformation_rules !== undefined ? JSON.stringify(updateData.transformation_rules) : undefined,
//       updateData.validation_rules !== undefined ? JSON.stringify(updateData.validation_rules) : undefined,
//       updateData.conflict_resolution_strategy,
//       updateData.sync_enabled,
//       updateData.sync_frequency,
//       updateData.filter_criteria !== undefined ? JSON.stringify(updateData.filter_criteria) : undefined,
//       updateData.last_sync_at,
//       updateData.records_synced,
//       updateData.created_by,
//       updateData.updated_by,
//     ];

//     const result = await database.query(query, values.filter(val => val !== undefined));
//     if (result.rows.length > 0) {
//       Object.assign(this, result.rows[0]);
//     }
//     return this;
//   }

//   // Instance method to delete QmsEntityMapping
//   async delete() {
//     const query = `
//       DELETE FROM qms_entity_mappings
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
//     if (this.tenant_id === null || this.tenant_id === undefined ) {
//       throw new Error('tenant_id is required');
//     }
//     if (this.qms_connection_id === null || this.qms_connection_id === undefined ) {
//       throw new Error('qms_connection_id is required');
//     }
//     if (this.qms_entity_type === null || this.qms_entity_type === undefined || this.qms_entity_type.trim().length === 0) {
//       throw new Error('qms_entity_type is required');
//     }
//     if (this.qms_entity_type && this.qms_entity_type.length > 100) {
//       throw new Error('qms_entity_type must be at most 100 characters');
//     }
//     if (this.qms_entity_type && this.qms_entity_type.length < 1) {
//       throw new Error('qms_entity_type must be at least 1 characters');
//     }
//     if (this.qassure_entity_type === null || this.qassure_entity_type === undefined || this.qassure_entity_type.trim().length === 0) {
//       throw new Error('qassure_entity_type is required');
//     }
//     if (this.qassure_entity_type && this.qassure_entity_type.length > 100) {
//       throw new Error('qassure_entity_type must be at most 100 characters');
//     }
//     if (this.qassure_entity_type && this.qassure_entity_type.length < 1) {
//       throw new Error('qassure_entity_type must be at least 1 characters');
//     }
//     if (this.mapping_direction === null || this.mapping_direction === undefined ) {
//       throw new Error('mapping_direction is required');
//     }
//     if (this.field_mappings === null || this.field_mappings === undefined ) {
//       throw new Error('field_mappings is required');
//     }
//     if (this.conflict_resolution_strategy === null || this.conflict_resolution_strategy === undefined ) {
//       throw new Error('conflict_resolution_strategy is required');
//     }
//     if (this.sync_enabled === null || this.sync_enabled === undefined ) {
//       throw new Error('sync_enabled is required');
//     }
//     if (this.records_synced === null || this.records_synced === undefined ) {
//       throw new Error('records_synced is required');
//     }
//     if (this.created_by === null || this.created_by === undefined ) {
//       throw new Error('created_by is required');
//     }
//     if (this.created_at === null || this.created_at === undefined ) {
//       throw new Error('created_at is required');
//     }
//     if (this.updated_at === null || this.updated_at === undefined ) {
//       throw new Error('updated_at is required');
//     }
//   }
// }

// module.exports = Qmsentitymapping;
