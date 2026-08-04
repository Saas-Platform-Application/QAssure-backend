'use strict';

/**
 * Migration 097: Reference-based deduplication.
 * - Creates file_blobs: one row per unique physical file, with a reference_count.
 * - Adds blob_id to file_attachments so each attachment row is a REFERENCE to a blob.
 *
 * Dedup scope is enforced on file_blobs via a UNIQUE index on
 * (tenant_id, source_module, supplier_key, checksum).
 * supplier_key is a normalized text column (never NULL) so the unique index
 * behaves deterministically. When no supplier applies we store the literal
 * string 'NONE'. (Postgres treats NULLs as distinct in unique indexes, which
 * would let duplicates slip through. Using a non-null sentinel avoids that.)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS file_blobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

        checksum VARCHAR(64) NOT NULL,
        source_module VARCHAR(100) NOT NULL DEFAULT 'platform',
        supplier_key VARCHAR(255) NOT NULL DEFAULT 'NONE',

        storage_provider VARCHAR(50) NOT NULL DEFAULT 'local',
        storage_path VARCHAR(1000) NOT NULL,
        stored_name VARCHAR(500) NOT NULL,
        mime_type VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,

        reference_count INTEGER NOT NULL DEFAULT 0,

        is_soft_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        soft_deleted_at TIMESTAMPTZ,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- The deduplication scope. One physical blob per (tenant + module + supplier + checksum).
      CREATE UNIQUE INDEX IF NOT EXISTS uq_file_blobs_scope
        ON file_blobs (tenant_id, source_module, supplier_key, checksum);

      CREATE INDEX IF NOT EXISTS idx_file_blobs_tenant ON file_blobs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_file_blobs_refcount ON file_blobs(reference_count);

      -- Link each attachment (reference) to its blob.
      ALTER TABLE file_attachments
        ADD COLUMN IF NOT EXISTS blob_id UUID REFERENCES file_blobs(id);

      CREATE INDEX IF NOT EXISTS idx_file_attachments_blob ON file_attachments(blob_id);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_file_attachments_blob;
      ALTER TABLE file_attachments DROP COLUMN IF EXISTS blob_id;
      DROP TABLE IF EXISTS file_blobs CASCADE;
    `);
  }
};
