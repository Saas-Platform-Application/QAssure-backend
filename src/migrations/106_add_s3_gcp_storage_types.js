'use strict';

/**
 * Migration 106: Add Amazon S3 and GCP Storage Type Support
 *
 * Changes:
 *   1. Drop and recreate the chk_storage_type CHECK constraint to include 's3' and 'gcp'
 *   2. Add S3-specific columns: s3_bucket, s3_region, s3_access_key_id, s3_secret_access_key
 *   3. Add GCP-specific columns: gcs_bucket, gcs_project_id, gcs_service_account_key
 */

const q = (qi, sql) => qi.sequelize.query(sql);

module.exports = {
  async up(queryInterface) {
    // 1. Drop old CHECK constraint
    await q(queryInterface, `
      ALTER TABLE tenant_storage_buckets
        DROP CONSTRAINT IF EXISTS chk_storage_type
    `);

    // 2. Add new CHECK constraint that includes s3 and gcp
    await q(queryInterface, `
      ALTER TABLE tenant_storage_buckets
        ADD CONSTRAINT chk_storage_type
          CHECK (storage_type IN ('azure', 'local', 's3', 'gcp'))
    `);

    // 3. Add Amazon S3 columns
    await q(queryInterface, `
      ALTER TABLE tenant_storage_buckets
        ADD COLUMN IF NOT EXISTS s3_bucket          VARCHAR(255),
        ADD COLUMN IF NOT EXISTS s3_region          VARCHAR(100),
        ADD COLUMN IF NOT EXISTS s3_access_key_id   VARCHAR(255),
        ADD COLUMN IF NOT EXISTS s3_secret_access_key TEXT
    `);

    // 4. Add Google Cloud Storage columns
    await q(queryInterface, `
      ALTER TABLE tenant_storage_buckets
        ADD COLUMN IF NOT EXISTS gcs_bucket              VARCHAR(255),
        ADD COLUMN IF NOT EXISTS gcs_project_id          VARCHAR(255),
        ADD COLUMN IF NOT EXISTS gcs_service_account_key TEXT
    `);

    console.log('Migration 106: S3 and GCP storage type support added');
  },

  async down(queryInterface) {
    // Restore old CHECK constraint
    await q(queryInterface, `
      ALTER TABLE tenant_storage_buckets
        DROP CONSTRAINT IF EXISTS chk_storage_type
    `);
    await q(queryInterface, `
      ALTER TABLE tenant_storage_buckets
        ADD CONSTRAINT chk_storage_type
          CHECK (storage_type IN ('azure', 'local'))
    `);

    // Drop added columns
    await q(queryInterface, `
      ALTER TABLE tenant_storage_buckets
        DROP COLUMN IF EXISTS s3_bucket,
        DROP COLUMN IF EXISTS s3_region,
        DROP COLUMN IF EXISTS s3_access_key_id,
        DROP COLUMN IF EXISTS s3_secret_access_key,
        DROP COLUMN IF EXISTS gcs_bucket,
        DROP COLUMN IF EXISTS gcs_project_id,
        DROP COLUMN IF EXISTS gcs_service_account_key
    `);

    console.log('Migration 106: rolled back');
  }
};
