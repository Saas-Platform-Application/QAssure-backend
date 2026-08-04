'use strict';

/**
 * Migration 103: Tenant-Wise Storage Bucket Configuration
 *
 * Creates two tables:
 *   1. tenant_storage_buckets — stores bucket credentials (SAS token encrypted AES-256-GCM)
 *   2. tenant_bucket_assignments — tracks which bucket is active for each tenant
 *
 * Design:
 *   - SuperAdmin creates buckets under their tenant (owner_tenant_id = superadmin_tenant)
 *   - Buckets can be assigned to ANY tenant via tenant_bucket_assignments
 *   - Only ONE active assignment per tenant (enforced by partial unique index)
 *   - Changing assignment does NOT affect old blobs (blob-level snapshot in migration 104)
 */

const q = (qi, sql) => qi.sequelize.query(sql);

module.exports = {
  async up(queryInterface) {
    // 1. Main bucket config table
    await q(queryInterface, `
      CREATE TABLE IF NOT EXISTS tenant_storage_buckets (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name             VARCHAR(200) NOT NULL,
        description      TEXT,
        owner_tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        storage_type     VARCHAR(20) NOT NULL DEFAULT 'azure',

        -- Azure Blob Storage fields (SAS token encrypted AES-256-GCM)
        azure_account        VARCHAR(200),
        azure_container      VARCHAR(200),
        azure_sas_token      TEXT,
        azure_url            TEXT,

        is_active        BOOLEAN NOT NULL DEFAULT TRUE,
        created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by       UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT chk_storage_type CHECK (storage_type IN ('azure', 'local'))
      )
    `);

    await q(queryInterface, `CREATE INDEX IF NOT EXISTS idx_tsb_owner ON tenant_storage_buckets(owner_tenant_id)`);
    await q(queryInterface, `CREATE INDEX IF NOT EXISTS idx_tsb_active ON tenant_storage_buckets(is_active)`);

    // 2. Assignment table — which bucket is active for which tenant
    await q(queryInterface, `
      CREATE TABLE IF NOT EXISTS tenant_bucket_assignments (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        bucket_id    UUID NOT NULL REFERENCES tenant_storage_buckets(id) ON DELETE CASCADE,
        assigned_by  UUID REFERENCES users(id) ON DELETE SET NULL,
        assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_active    BOOLEAN NOT NULL DEFAULT TRUE,
        notes        TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Only ONE active assignment per tenant
    await q(queryInterface, `
      CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_bucket_active
        ON tenant_bucket_assignments(tenant_id)
        WHERE is_active = TRUE
    `);

    await q(queryInterface, `CREATE INDEX IF NOT EXISTS idx_tba_tenant ON tenant_bucket_assignments(tenant_id)`);
    await q(queryInterface, `CREATE INDEX IF NOT EXISTS idx_tba_bucket ON tenant_bucket_assignments(bucket_id)`);

    console.log('Migration 103: tenant_storage_buckets and tenant_bucket_assignments created');
  },

  async down(queryInterface) {
    await q(queryInterface, `DROP TABLE IF EXISTS tenant_bucket_assignments CASCADE`);
    await q(queryInterface, `DROP TABLE IF EXISTS tenant_storage_buckets CASCADE`);
    console.log('Migration 103: rolled back');
  }
};
