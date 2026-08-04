'use strict';

/**
 * Migration 094 - Document Rework Traceability
 *
 * Adds columns to document_sections to track:
 * 1. Who requested the rework
 * 2. When it was requested
 * 3. During which workflow step it was requested
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE document_sections
        ADD COLUMN IF NOT EXISTS rework_requested_by   UUID REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS rework_requested_at   TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS rework_requested_step VARCHAR(255);
    `);

    console.log('Migration 094: Rework traceability columns added to document_sections.');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE document_sections
        DROP COLUMN IF EXISTS rework_requested_by,
        DROP COLUMN IF EXISTS rework_requested_at,
        DROP COLUMN IF EXISTS rework_requested_step;
    `);
    console.log('Migration 094: Rolled back.');
  }
};
