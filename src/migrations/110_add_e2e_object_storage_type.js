'use strict';

/**
 * Migration 110: Add E2E Networks Object Storage (EOS / Vyoma) Support
 *
 * E2E Object Store (EOS) is an S3-compatible object storage service.
 * It is driven through the same AWS SDK used for Amazon S3, the only
 * difference being a custom endpoint (e.g. https://objectstore.e2enetworks.net)
 * and path-style bucket addressing.
 *
 * Changes:
 *   1. Extend the chk_storage_type CHECK constraint to include 'e2e'
 *   2. Add E2E-specific columns:
 *        e2e_bucket            — bucket name created in MyAccount → Object Storage
 *        e2e_endpoint          — S3 API endpoint (region specific, e.g. mum-objectstore...)
 *        e2e_region            — region label used for SigV4 signing
 *        e2e_access_key        — EOS access key (not a secret, stored plaintext like s3_access_key_id)
 *        e2e_secret_key        — EOS secret key (encrypted AES-256-GCM)
 *        e2e_force_path_style  — path-style vs DNS/virtual-hosted-style addressing
 */

const q = (qi, sql) => qi.sequelize.query(sql);

module.exports = {
  async up(queryInterface) {
    // 1. Replace the CHECK constraint so 'e2e' becomes a valid storage_type
    await q(queryInterface, `
      ALTER TABLE tenant_storage_buckets
        DROP CONSTRAINT IF EXISTS chk_storage_type
    `);

    await q(queryInterface, `
      ALTER TABLE tenant_storage_buckets
        ADD CONSTRAINT chk_storage_type
          CHECK (storage_type IN ('azure', 'local', 's3', 'gcp', 'e2e'))
    `);

    // 2. Add E2E Networks Object Storage columns
    await q(queryInterface, `
      ALTER TABLE tenant_storage_buckets
        ADD COLUMN IF NOT EXISTS e2e_bucket           VARCHAR(255),
        ADD COLUMN IF NOT EXISTS e2e_endpoint         TEXT,
        ADD COLUMN IF NOT EXISTS e2e_region           VARCHAR(100),
        ADD COLUMN IF NOT EXISTS e2e_access_key       VARCHAR(255),
        ADD COLUMN IF NOT EXISTS e2e_secret_key       TEXT,
        ADD COLUMN IF NOT EXISTS e2e_force_path_style BOOLEAN NOT NULL DEFAULT TRUE
    `);

    console.log('Migration 110: E2E Networks Object Storage (EOS) support added');
  },

  async down(queryInterface) {
    // Any bucket already using 'e2e' would violate the restored constraint —
    // deactivate + convert them to 'local' so the rollback stays safe.
    await q(queryInterface, `
      UPDATE tenant_storage_buckets
        SET storage_type = 'local', is_active = FALSE, updated_at = NOW()
      WHERE storage_type = 'e2e'
    `);

    await q(queryInterface, `
      ALTER TABLE tenant_storage_buckets
        DROP CONSTRAINT IF EXISTS chk_storage_type
    `);

    await q(queryInterface, `
      ALTER TABLE tenant_storage_buckets
        ADD CONSTRAINT chk_storage_type
          CHECK (storage_type IN ('azure', 'local', 's3', 'gcp'))
    `);

    await q(queryInterface, `
      ALTER TABLE tenant_storage_buckets
        DROP COLUMN IF EXISTS e2e_bucket,
        DROP COLUMN IF EXISTS e2e_endpoint,
        DROP COLUMN IF EXISTS e2e_region,
        DROP COLUMN IF EXISTS e2e_access_key,
        DROP COLUMN IF EXISTS e2e_secret_key,
        DROP COLUMN IF EXISTS e2e_force_path_style
    `);

    console.log('Migration 110: rolled back');
  }
};
