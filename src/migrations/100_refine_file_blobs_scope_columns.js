'use strict';

/**
 * Migration 100: Refine file_blobs deduplication scope columns.
 *
 * Replaces:
 *   source_module  VARCHAR  → module_id  UUID  (nullable, from req.module.id / api key moduleId)
 *   supplier_key   VARCHAR  → supplier_id UUID  (nullable, from users.supplier_id of uploader)
 *
 * NULL handling in the UNIQUE index:
 *   Postgres treats NULLs as distinct in unique indexes, so two rows with
 *   module_id=NULL would NOT be considered duplicates — breaking dedup.
 *   Fix: use a functional index with COALESCE(col, zero_uuid).
 *   This means "no module" and "no supplier" each collapse to the same sentinel
 *   UUID inside the index while keeping the column value as true NULL in storage.
 *
 * NOTE: Each DDL statement is sent as a separate query because Sequelize rejects
 * multi-statement strings in query().
 */

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const q = (qi, sql) => qi.sequelize.query(sql);

module.exports = {
  async up(queryInterface) {
    // 1. Drop the old string-based unique index.
    await q(queryInterface, `DROP INDEX IF EXISTS uq_file_blobs_scope`);

    // 2. Replace source_module (VARCHAR) with module_id (UUID nullable).
    await q(queryInterface, `ALTER TABLE file_blobs DROP COLUMN IF EXISTS source_module`);
    await q(queryInterface, `ALTER TABLE file_blobs ADD COLUMN IF NOT EXISTS module_id UUID`);

    // 3. Replace supplier_key (VARCHAR / 'NONE' sentinel) with supplier_id (UUID nullable).
    await q(queryInterface, `ALTER TABLE file_blobs DROP COLUMN IF EXISTS supplier_key`);
    await q(queryInterface, `ALTER TABLE file_blobs ADD COLUMN IF NOT EXISTS supplier_id UUID`);

    // 3.5 Deduplicate existing blobs that now conflict under the new UUID-based NULL-coalesced scope.
    // Since source_module and supplier_key are dropped, all existing rows have module_id = NULL and supplier_id = NULL.
    // Any files that had different source_modules but the same checksum and tenant_id are now duplicates.
    const duplicates = await queryInterface.sequelize.query(`
      SELECT tenant_id, checksum, ARRAY_AGG(id::text) as ids
      FROM file_blobs
      GROUP BY tenant_id, checksum
      HAVING COUNT(*) > 1
    `);

    for (const group of duplicates[0]) {
      const ids = group.ids; // Array of UUID strings
      const survivorId = ids[0];
      const duplicateIds = ids.slice(1);

      // Sum reference counts of all duplicates
      const sumResult = await queryInterface.sequelize.query(
        `SELECT SUM(reference_count) as total FROM file_blobs WHERE id IN (${duplicateIds.map(id => `'${id}'`).join(',')})`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const totalDupRefs = parseInt(sumResult[0]?.total || 0, 10);

      // Update survivor's reference count
      await queryInterface.sequelize.query(
        `UPDATE file_blobs SET reference_count = reference_count + ${totalDupRefs} WHERE id = '${survivorId}'`
      );

      // Update file_attachments pointing to duplicate blobs to point to the survivor
      await queryInterface.sequelize.query(
        `UPDATE file_attachments SET blob_id = '${survivorId}' WHERE blob_id IN (${duplicateIds.map(id => `'${id}'`).join(',')})`
      );

      // Delete the duplicate blobs
      await queryInterface.sequelize.query(
        `DELETE FROM file_blobs WHERE id IN (${duplicateIds.map(id => `'${id}'`).join(',')})`
      );
    }

    // 4. New functional unique index: COALESCE so NULL==NULL is treated as the same scope.
    await q(queryInterface, `
      CREATE UNIQUE INDEX IF NOT EXISTS uq_file_blobs_scope
        ON file_blobs (
          tenant_id,
          COALESCE(module_id,   '${ZERO_UUID}'::uuid),
          COALESCE(supplier_id, '${ZERO_UUID}'::uuid),
          checksum
        )
    `);

    await q(queryInterface, `CREATE INDEX IF NOT EXISTS idx_file_blobs_module   ON file_blobs(module_id)`);
    await q(queryInterface, `CREATE INDEX IF NOT EXISTS idx_file_blobs_supplier ON file_blobs(supplier_id)`);
  },

  async down(queryInterface) {
    await q(queryInterface, `DROP INDEX IF EXISTS uq_file_blobs_scope`);
    await q(queryInterface, `DROP INDEX IF EXISTS idx_file_blobs_module`);
    await q(queryInterface, `DROP INDEX IF EXISTS idx_file_blobs_supplier`);

    await q(queryInterface, `ALTER TABLE file_blobs DROP COLUMN IF EXISTS module_id`);
    await q(queryInterface, `ALTER TABLE file_blobs DROP COLUMN IF EXISTS supplier_id`);

    await q(queryInterface, `ALTER TABLE file_blobs ADD COLUMN IF NOT EXISTS source_module VARCHAR(100) NOT NULL DEFAULT 'platform'`);
    await q(queryInterface, `ALTER TABLE file_blobs ADD COLUMN IF NOT EXISTS supplier_key  VARCHAR(255) NOT NULL DEFAULT 'NONE'`);

    await q(queryInterface, `
      CREATE UNIQUE INDEX IF NOT EXISTS uq_file_blobs_scope
        ON file_blobs (tenant_id, source_module, supplier_key, checksum)
    `);
  }
};
