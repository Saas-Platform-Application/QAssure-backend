'use strict';

/**
 * Migration 099: Backfill blobs for pre-existing file_attachments.
 * Groups existing (non-deleted) attachments by tenant + source_module + checksum
 * (supplier unknown for legacy rows, so supplier_key = 'NONE'), creates one blob
 * per group, links the attachments, and sets reference_count to the live count.
 *
 * Legacy rows with NULL checksum cannot be grouped safely: each gets its own blob.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sql = `
      DO $$
      DECLARE
        grp RECORD;
        new_blob_id UUID;
      BEGIN
        -- Groups of identical content (checksum present).
        FOR grp IN
          SELECT tenant_id, source_module, checksum,
                 COUNT(*) AS ref_count,
                 (ARRAY_AGG(id ORDER BY created_at))[1] AS sample_id
          FROM file_attachments
          WHERE deleted_at IS NULL AND blob_id IS NULL AND checksum IS NOT NULL
          GROUP BY tenant_id, source_module, checksum
        LOOP
          INSERT INTO file_blobs (
            tenant_id, checksum, source_module, supplier_key,
            storage_provider, storage_path, stored_name, mime_type, file_size, reference_count
          )
          SELECT fa.tenant_id, fa.checksum, COALESCE(fa.source_module,'platform'), 'NONE',
                 COALESCE(fa.storage_provider,'local'), fa.file_path, fa.stored_name, fa.mime_type, fa.file_size,
                 grp.ref_count
          FROM file_attachments fa
          WHERE fa.id = grp.sample_id
          RETURNING id INTO new_blob_id;

          UPDATE file_attachments
            SET blob_id = new_blob_id
          WHERE deleted_at IS NULL AND blob_id IS NULL
            AND tenant_id = grp.tenant_id
            AND COALESCE(source_module,'platform') = COALESCE(grp.source_module,'platform')
            AND checksum = grp.checksum;
        END LOOP;

        -- Legacy rows with NULL checksum: one blob each.
        FOR grp IN
          SELECT id, tenant_id, source_module, storage_provider, file_path, stored_name, mime_type, file_size
          FROM file_attachments
          WHERE deleted_at IS NULL AND blob_id IS NULL AND checksum IS NULL
        LOOP
          INSERT INTO file_blobs (
            tenant_id, checksum, source_module, supplier_key,
            storage_provider, storage_path, stored_name, mime_type, file_size, reference_count
          ) VALUES (
            grp.tenant_id, 'LEGACY_NO_CHECKSUM_' || grp.id, COALESCE(grp.source_module,'platform'), 'NONE',
            COALESCE(grp.storage_provider,'local'), grp.file_path, grp.stored_name, grp.mime_type, grp.file_size, 1
          ) RETURNING id INTO new_blob_id;

          UPDATE file_attachments SET blob_id = new_blob_id WHERE id = grp.id;
        END LOOP;
      END $$;
    `;
    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface, Sequelize) {
    // Non-destructive: just unlink. Blobs are cleaned by migration 097 down.
    await queryInterface.sequelize.query(`UPDATE file_attachments SET blob_id = NULL;`);
  }
};
