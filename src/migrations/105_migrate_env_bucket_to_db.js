'use strict';

/**
 * Migration 105: Seed existing .env Azure bucket into DB and assign to all tenants
 *
 * ONE-TIME migration that:
 *   1. Reads current Azure config from environment variables
 *   2. Finds the SuperAdmin tenant (or first tenant alphabetically as fallback)
 *   3. Creates a bucket record under the SuperAdmin tenant
 *   4. Assigns that bucket to ALL existing tenants
 *   5. Backfills file_blobs.bucket_config_id for all existing blobs
 *
 * Run ONCE per environment (dev / staging / prod).
 * Safe to re-run — idempotent by name check.
 */

const { encrypt } = require('../utils/encryption');
const q = (qi, sql, opts) => qi.sequelize.query(sql, opts);

module.exports = {
  async up(queryInterface) {
    const storageType = process.env.STORAGE_TYPE || 'azure';

    // Skip if no Azure config present
    if (storageType !== 'azure' || !process.env.AZURE_STORAGE_ACCOUNT) {
      console.log('Migration 105: No Azure config in .env — skipping bucket seed.');
      return;
    }

    // 1. Check if already seeded (idempotent)
    const existing = await q(queryInterface, `
      SELECT id FROM tenant_storage_buckets WHERE name = 'QAssure Platform Bucket (Migrated)' LIMIT 1
    `, { type: queryInterface.sequelize.QueryTypes.SELECT });

    if (existing.length > 0) {
      console.log('Migration 105: Bucket already seeded — skipping.');
      return;
    }

    // 2. Find the SuperAdmin tenant
    let superAdminTenant = await q(queryInterface, `
      SELECT t.id FROM tenants t
      JOIN user_tenants ut ON ut.tenant_id = t.id
      JOIN user_roles ur ON ur.user_id = ut.user_id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.code = 'super_admin'
      LIMIT 1
    `, { type: queryInterface.sequelize.QueryTypes.SELECT });

    // Fallback: first tenant alphabetically
    if (!superAdminTenant || superAdminTenant.length === 0) {
      superAdminTenant = await q(queryInterface, `
        SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1
      `, { type: queryInterface.sequelize.QueryTypes.SELECT });
    }

    if (!superAdminTenant || superAdminTenant.length === 0) {
      console.warn('Migration 105: No tenants found — skipping bucket seed.');
      return;
    }

    const ownerTenantId = superAdminTenant[0].id;

    // 3. Encrypt the SAS token
    const rawSasToken = (process.env.AZURE_STORAGE_SAS_TOKEN || '').replace(/^"(.*)"$/, '$1');
    const encryptedSas = rawSasToken ? encrypt(rawSasToken) : null;

    // 4. Insert bucket record
    const bucketResult = await q(queryInterface, `
      INSERT INTO tenant_storage_buckets (
        id, name, description, owner_tenant_id, storage_type,
        azure_account, azure_container, azure_sas_token, azure_url,
        is_active, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        'QAssure Platform Bucket (Migrated)',
        'Auto-migrated from .env configuration',
        '${ownerTenantId}',
        'azure',
        ${process.env.AZURE_STORAGE_ACCOUNT ? `'${process.env.AZURE_STORAGE_ACCOUNT}'` : 'NULL'},
        ${process.env.AZURE_STORAGE_CONTAINER ? `'${process.env.AZURE_STORAGE_CONTAINER}'` : 'NULL'},
        ${encryptedSas ? `'${encryptedSas}'` : 'NULL'},
        ${process.env.AZURE_STORAGE_URL ? `'${(process.env.AZURE_STORAGE_URL || '').replace(/^"(.*)"$/, '$1')}'` : 'NULL'},
        TRUE, NOW(), NOW()
      )
      RETURNING id
    `, { type: queryInterface.sequelize.QueryTypes.INSERT });

    const bucketId = Array.isArray(bucketResult) ? bucketResult[0]?.[0]?.id : bucketResult?.rows?.[0]?.id;

    if (!bucketId) {
      console.error('Migration 105: Failed to insert bucket record');
      return;
    }

    // 5. Get all tenants
    const tenants = await q(queryInterface, `
      SELECT id FROM tenants
    `, { type: queryInterface.sequelize.QueryTypes.SELECT });

    // 6. Assign bucket to all tenants (skip if already has one)
    for (const tenant of tenants) {
      const alreadyAssigned = await q(queryInterface, `
        SELECT id FROM tenant_bucket_assignments
        WHERE tenant_id = '${tenant.id}' AND is_active = TRUE LIMIT 1
      `, { type: queryInterface.sequelize.QueryTypes.SELECT });

      if (alreadyAssigned.length === 0) {
        await q(queryInterface, `
          INSERT INTO tenant_bucket_assignments (
            id, tenant_id, bucket_id, is_active, notes, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), '${tenant.id}', '${bucketId}', TRUE,
            'Auto-assigned during .env migration', NOW(), NOW()
          )
        `);
      }
    }

    // 7. Backfill file_blobs that have no bucket_config_id
    await q(queryInterface, `
      UPDATE file_blobs
        SET bucket_config_id = '${bucketId}', updated_at = NOW()
      WHERE bucket_config_id IS NULL
        AND storage_provider = 'azure'
    `);

    console.log(`Migration 105: Seeded bucket ${bucketId} and assigned to ${tenants.length} tenants. Backfilled azure blobs.`);
  },

  async down(queryInterface) {
    // Soft rollback: deactivate all auto-assigned assignments and deactivate migrated bucket
    await q(queryInterface, `
      UPDATE tenant_bucket_assignments
        SET is_active = FALSE, updated_at = NOW()
      WHERE notes = 'Auto-assigned during .env migration'
    `);

    await q(queryInterface, `
      UPDATE tenant_storage_buckets
        SET is_active = FALSE, updated_at = NOW()
      WHERE name = 'QAssure Platform Bucket (Migrated)'
    `);

    await q(queryInterface, `
      UPDATE file_blobs SET bucket_config_id = NULL, updated_at = NOW()
      WHERE bucket_config_id IN (
        SELECT id FROM tenant_storage_buckets WHERE name = 'QAssure Platform Bucket (Migrated)'
      )
    `);

    console.log('Migration 105: rolled back (buckets deactivated)');
  }
};
