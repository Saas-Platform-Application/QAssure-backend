'use strict';

/**
 * Migration 104: Add bucket_config_id to file_blobs
 *
 * Each blob now records WHICH bucket it was physically stored in at upload time.
 * This means changing a tenant's active bucket assignment does NOT break access
 * to previously uploaded files — the system reads the blob's own bucket_config_id
 * and constructs the correct storage provider for download/preview.
 *
 * For blobs created before this migration (pre-existing blobs), bucket_config_id
 * is NULL. The service falls back to storage_provider + env config for those.
 */

const q = (qi, sql) => qi.sequelize.query(sql);

module.exports = {
  async up(queryInterface) {
    await q(queryInterface, `
      ALTER TABLE file_blobs
        ADD COLUMN IF NOT EXISTS bucket_config_id UUID
          REFERENCES tenant_storage_buckets(id) ON DELETE SET NULL
    `);

    await q(queryInterface, `
      CREATE INDEX IF NOT EXISTS idx_file_blobs_bucket_config
        ON file_blobs(bucket_config_id)
    `);

    console.log('Migration 104: bucket_config_id added to file_blobs');
  },

  async down(queryInterface) {
    await q(queryInterface, `DROP INDEX IF EXISTS idx_file_blobs_bucket_config`);
    await q(queryInterface, `ALTER TABLE file_blobs DROP COLUMN IF EXISTS bucket_config_id`);
    console.log('Migration 104: rolled back');
  }
};
