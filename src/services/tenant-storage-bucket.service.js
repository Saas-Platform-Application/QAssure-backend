/**
 * Tenant Storage Bucket Service — QAssure Platform
 *
 * Manages per-tenant Azure Blob Storage bucket configurations.
 * SAS tokens are encrypted at rest using AES-256-GCM (shared ENCRYPTION_KEY).
 *
 * Key responsibilities:
 *   - CRUD for bucket configs (superadmin / platform users with permission)
 *   - Assign a bucket to a tenant (one active assignment at a time)
 *   - "Give my bucket" — superadmin assigns own bucket to another tenant
 *   - getActiveBucketForTenant — used by file-attachment.service to resolve upload target
 *   - getBucketForBlob — used by download/preview to resolve the correct provider for old files
 */

const { pool } = require('../config/database');
const { encrypt, decrypt, maskApiKey } = require('../utils/encryption');
const { getAuditService } = require('./audit.service');

// In-memory cache: tenantId -> { bucket, expiresAt }
const bucketCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

class TenantStorageBucketService {

  // ============================================================================
  // CRUD — BUCKET CONFIGS
  // ============================================================================

  /**
   * Create a new bucket config.
   * owner_tenant_id is always forced to the requesting user's tenant
   * (or the superadmin tenant) — never trusted from the client body.
   */
  async createBucket(data, ownerTenantId, createdBy) {
    const {
      name, description, storage_type,
      // Azure
      azure_account, azure_container, azure_sas_token, azure_url,
      // S3
      s3_bucket, s3_region, s3_access_key_id, s3_secret_access_key,
      // GCP
      gcs_bucket, gcs_project_id, gcs_service_account_key,
    } = data;

    if (!name || !name.trim()) throw new Error('Bucket name is required');
    if (!storage_type) throw new Error('storage_type is required');
    if (!['azure', 'local', 's3', 'gcp'].includes(storage_type))
      throw new Error('storage_type must be one of: azure, local, s3, gcp');

    if (storage_type === 'azure') {
      if (!azure_account) throw new Error('azure_account is required for Azure storage');
      if (!azure_container) throw new Error('azure_container is required for Azure storage');
      if (!azure_sas_token) throw new Error('azure_sas_token is required for Azure storage');
      if (!azure_url) throw new Error('azure_url is required for Azure storage');
    }

    if (storage_type === 's3') {
      if (!s3_bucket) throw new Error('s3_bucket is required for Amazon S3 storage');
      if (!s3_region) throw new Error('s3_region is required for Amazon S3 storage');
      if (!s3_access_key_id) throw new Error('s3_access_key_id is required for Amazon S3 storage');
      if (!s3_secret_access_key) throw new Error('s3_secret_access_key is required for Amazon S3 storage');
    }

    if (storage_type === 'gcp') {
      if (!gcs_bucket) throw new Error('gcs_bucket is required for GCP Cloud Storage');
      if (!gcs_project_id) throw new Error('gcs_project_id is required for GCP Cloud Storage');
      if (!gcs_service_account_key) throw new Error('gcs_service_account_key is required for GCP Cloud Storage');
    }

    // Encrypt secrets before storing
    const encryptedSas      = azure_sas_token       ? encrypt(azure_sas_token.trim())       : null;
    const encryptedS3Secret = s3_secret_access_key   ? encrypt(s3_secret_access_key.trim())   : null;
    const encryptedGcpKey   = gcs_service_account_key ? encrypt(gcs_service_account_key.trim()) : null;

    const result = await pool.query(`
      INSERT INTO tenant_storage_buckets (
        name, description, owner_tenant_id, storage_type,
        azure_account, azure_container, azure_sas_token, azure_url,
        s3_bucket, s3_region, s3_access_key_id, s3_secret_access_key,
        gcs_bucket, gcs_project_id, gcs_service_account_key,
        is_active, created_by, updated_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,TRUE,$16,$16,NOW(),NOW())
      RETURNING *
    `, [
      name.trim(),
      description || null,
      ownerTenantId,
      storage_type,
      azure_account || null,
      azure_container || null,
      encryptedSas,
      azure_url || null,
      s3_bucket || null,
      s3_region || null,
      s3_access_key_id || null,
      encryptedS3Secret,
      gcs_bucket || null,
      gcs_project_id || null,
      encryptedGcpKey,
      createdBy || null,
    ]);

    return this._formatForResponse(result.rows[0]);
  }

  /**
   * Update an existing bucket config.
   * SAS token is only re-encrypted if a new value is supplied.
   */
  async updateBucket(bucketId, data, updatedBy, ownerTenantId, isSuperAdmin) {
    const bucket = await this._getRawById(bucketId);
    if (!bucket) throw new Error('Bucket not found');

    // Non-superadmin can only edit their own tenant's buckets
    if (!isSuperAdmin && bucket.owner_tenant_id !== ownerTenantId) {
      throw new Error('You do not have permission to edit this bucket');
    }

    const {
      name, description, storage_type, is_active,
      azure_account, azure_container, azure_sas_token, azure_url,
      s3_bucket, s3_region, s3_access_key_id, s3_secret_access_key,
      gcs_bucket, gcs_project_id, gcs_service_account_key,
    } = data;

    // Keep existing encrypted value if no new value supplied
    let encryptedSas      = bucket.azure_sas_token;
    let encryptedS3Secret = bucket.s3_secret_access_key;
    let encryptedGcpKey   = bucket.gcs_service_account_key;

    if (azure_sas_token && azure_sas_token.trim() && !azure_sas_token.startsWith('****')) {
      encryptedSas = encrypt(azure_sas_token.trim());
    }
    if (s3_secret_access_key && s3_secret_access_key.trim() && !s3_secret_access_key.startsWith('****')) {
      encryptedS3Secret = encrypt(s3_secret_access_key.trim());
    }
    if (gcs_service_account_key && gcs_service_account_key.trim() && !gcs_service_account_key.startsWith('****')) {
      encryptedGcpKey = encrypt(gcs_service_account_key.trim());
    }

    const result = await pool.query(`
      UPDATE tenant_storage_buckets SET
        name                    = COALESCE($1, name),
        description             = COALESCE($2, description),
        storage_type            = COALESCE($3, storage_type),
        azure_account           = COALESCE($4, azure_account),
        azure_container         = COALESCE($5, azure_container),
        azure_sas_token         = $6,
        azure_url               = COALESCE($7, azure_url),
        s3_bucket               = COALESCE($8, s3_bucket),
        s3_region               = COALESCE($9, s3_region),
        s3_access_key_id        = COALESCE($10, s3_access_key_id),
        s3_secret_access_key    = $11,
        gcs_bucket              = COALESCE($12, gcs_bucket),
        gcs_project_id          = COALESCE($13, gcs_project_id),
        gcs_service_account_key = $14,
        is_active               = COALESCE($15, is_active),
        updated_by              = $16,
        updated_at              = NOW()
      WHERE id = $17
      RETURNING *
    `, [
      name?.trim() || null,
      description !== undefined ? description : null,
      storage_type || null,
      azure_account || null,
      azure_container || null,
      encryptedSas,
      azure_url || null,
      s3_bucket || null,
      s3_region || null,
      s3_access_key_id || null,
      encryptedS3Secret,
      gcs_bucket || null,
      gcs_project_id || null,
      encryptedGcpKey,
      is_active !== undefined ? is_active : null,
      updatedBy || null,
      bucketId,
    ]);

    if (result.rows.length === 0) throw new Error('Bucket not found');

    // Invalidate cache for all tenants assigned to this bucket
    this._invalidateCacheForBucket(bucketId);

    return this._formatForResponse(result.rows[0]);
  }

  /**
   * List buckets.
   * SuperAdmin / platform user: all active buckets
   * Tenant admin: only buckets they own or are assigned to them
   */
  async listBuckets(tenantId, isSuperAdmin) {
    let rows;
    if (isSuperAdmin) {
      const result = await pool.query(`
        SELECT b.*,
          COUNT(a.id) FILTER (WHERE a.is_active = TRUE) AS assigned_tenants_count
        FROM tenant_storage_buckets b
        LEFT JOIN tenant_bucket_assignments a ON a.bucket_id = b.id
        WHERE b.is_active = TRUE
        GROUP BY b.id
        ORDER BY b.created_at DESC
      `);
      rows = result.rows;
    } else {
      // Tenant: see their own buckets + any bucket currently assigned to them
      const result = await pool.query(`
        SELECT DISTINCT b.*,
          0::bigint AS assigned_tenants_count
        FROM tenant_storage_buckets b
        LEFT JOIN tenant_bucket_assignments a ON a.bucket_id = b.id AND a.tenant_id = $1 AND a.is_active = TRUE
        WHERE b.is_active = TRUE
          AND (b.owner_tenant_id = $1 OR a.id IS NOT NULL)
        ORDER BY b.created_at DESC
      `, [tenantId]);
      rows = result.rows;
    }

    return rows.map(r => this._formatForResponse(r));
  }

  async getBucketById(bucketId, tenantId, isSuperAdmin) {
    const bucket = await this._getRawById(bucketId);
    if (!bucket) return null;
    if (!isSuperAdmin && bucket.owner_tenant_id !== tenantId) {
      // Allow if this bucket is assigned to the requesting tenant
      const assignment = await pool.query(`
        SELECT id FROM tenant_bucket_assignments
        WHERE tenant_id = $1 AND bucket_id = $2 AND is_active = TRUE
        LIMIT 1
      `, [tenantId, bucketId]);
      if (assignment.rows.length === 0) return null;
    }
    
    const formatted = this._formatForResponse(bucket);
    
    if (isSuperAdmin) {
      const assignments = await pool.query(`
        SELECT t.id AS tenant_id, t.name AS tenant_name, a.assigned_at, a.notes
        FROM tenant_bucket_assignments a
        JOIN tenants t ON t.id = a.tenant_id
        WHERE a.bucket_id = $1 AND a.is_active = TRUE
        ORDER BY t.name ASC
      `, [bucketId]);
      formatted.assigned_tenants = assignments.rows;
    } else {
      formatted.assigned_tenants = [];
    }

    return formatted;
  }

  /**
   * Soft-delete a bucket (set is_active = false).
   * Blocked if the bucket has active tenant assignments.
   */
  async deleteBucket(bucketId, requesterId, isSuperAdmin) {
    const bucket = await this._getRawById(bucketId);
    if (!bucket) throw new Error('Bucket not found');
    if (!isSuperAdmin) throw new Error('Only super admin can delete buckets');

    const activeAssignments = await pool.query(`
      SELECT COUNT(*) FROM tenant_bucket_assignments
      WHERE bucket_id = $1 AND is_active = TRUE
    `, [bucketId]);

    if (parseInt(activeAssignments.rows[0].count) > 0) {
      throw new Error('Cannot delete a bucket that is currently assigned to one or more tenants. Reassign those tenants first.');
    }

    await pool.query(`
      UPDATE tenant_storage_buckets SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
    `, [bucketId]);

    this._invalidateCacheForBucket(bucketId);
    return true;
  }

  // ============================================================================
  // ASSIGNMENT
  // ============================================================================

  /**
   * Assign a bucket to a tenant.
   * Deactivates any existing active assignment first (history preserved).
   */
  async assignBucketToTenant(bucketId, tenantId, assignedBy, notes = null) {
    const bucket = await this._getRawById(bucketId);
    if (!bucket) throw new Error('Bucket not found');
    if (!bucket.is_active) throw new Error('Bucket is inactive');

    // Verify tenant exists
    const tenantCheck = await pool.query(`SELECT id FROM tenants WHERE id = $1`, [tenantId]);
    if (tenantCheck.rows.length === 0) throw new Error('Tenant not found');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Deactivate existing assignment
      await client.query(`
        UPDATE tenant_bucket_assignments
          SET is_active = FALSE, updated_at = NOW()
        WHERE tenant_id = $1 AND is_active = TRUE
      `, [tenantId]);

      // Create new assignment
      const result = await client.query(`
        INSERT INTO tenant_bucket_assignments (
          tenant_id, bucket_id, assigned_by, is_active, notes, created_at, updated_at
        ) VALUES ($1,$2,$3,TRUE,$4,NOW(),NOW())
        RETURNING *
      `, [tenantId, bucketId, assignedBy || null, notes]);

      await client.query('COMMIT');

      // Invalidate cache
      bucketCache.delete(tenantId);

      // Fire-and-forget audit log
      setImmediate(async () => {
        try {
          await getAuditService().log({
            action: 'UPDATE',
            user_id: assignedBy,
            tenant_id: tenantId,
            resource_type: 'tenant_storage_bucket',
            resource_id: bucketId,
            metadata: { event: 'bucket_assigned', bucket_name: bucket.name, target_tenant_id: tenantId },
          });
        } catch (e) {}
      });

      return { assignment: result.rows[0], bucket: this._formatForResponse(bucket) };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * "Give my bucket to tenant" — superadmin assigns their own bucket to another tenant.
   * Validates that the bucket's owner is the superadmin's tenant.
   */
  async assignSelfBucketToTenant(bucketId, targetTenantId, requesterId, requesterTenantId) {
    const bucket = await this._getRawById(bucketId);
    if (!bucket) throw new Error('Bucket not found');

    if (bucket.owner_tenant_id !== requesterTenantId) {
      throw new Error('You can only share buckets that you own');
    }

    return this.assignBucketToTenant(
      bucketId,
      targetTenantId,
      requesterId,
      'Assigned by platform owner (super admin shared bucket)'
    );
  }

  /**
   * Remove a bucket assignment from a tenant (tenant will have no bucket).
   */
  async unassignBucket(tenantId, assignedBy) {
    const result = await pool.query(`
      UPDATE tenant_bucket_assignments
        SET is_active = FALSE, updated_at = NOW()
      WHERE tenant_id = $1 AND is_active = TRUE
      RETURNING id
    `, [tenantId]);

    bucketCache.delete(tenantId);
    return result.rowCount > 0;
  }

  /**
   * Get ALL assignments for a tenant (history + active).
   */
  async getAssignmentHistory(tenantId) {
    const result = await pool.query(`
      SELECT a.*, b.name AS bucket_name, b.storage_type, b.azure_account, b.azure_container
      FROM tenant_bucket_assignments a
      JOIN tenant_storage_buckets b ON b.id = a.bucket_id
      WHERE a.tenant_id = $1
      ORDER BY a.assigned_at DESC
    `, [tenantId]);

    return result.rows;
  }

  // ============================================================================
  // RUNTIME — Used by file-attachment.service
  // ============================================================================

  /**
   * Get the currently active bucket config for a tenant.
   * Returns null if no bucket is configured.
   * Result is cached for 5 minutes.
   */
  async getActiveBucketForTenant(tenantId) {
    const cached = bucketCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.bucket;
    }

    const result = await pool.query(`
      SELECT b.*
      FROM tenant_bucket_assignments a
      JOIN tenant_storage_buckets b ON b.id = a.bucket_id
      WHERE a.tenant_id = $1 AND a.is_active = TRUE AND b.is_active = TRUE
      LIMIT 1
    `, [tenantId]);

    const bucket = result.rows.length > 0 ? result.rows[0] : null;
    bucketCache.set(tenantId, { bucket, expiresAt: Date.now() + CACHE_TTL_MS });
    return bucket;
  }

  /**
   * Get a bucket config by its ID — used by download/preview to resolve
   * the correct provider for blobs uploaded before any bucket change.
   * Returns null if bucket is not found.
   */
  async getBucketRawById(bucketId) {
    if (!bucketId) return null;
    return this._getRawById(bucketId);
  }

  /**
   * Decrypt the SAS token from a raw bucket row.
   */
  decryptSasToken(bucket) {
    if (!bucket || !bucket.azure_sas_token) return null;
    try {
      return decrypt(bucket.azure_sas_token);
    } catch (e) {
      console.error('[TenantStorageBucket] Failed to decrypt SAS token:', e.message);
      return null;
    }
  }

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  async _getRawById(bucketId) {
    const result = await pool.query(`
      SELECT * FROM tenant_storage_buckets WHERE id = $1
    `, [bucketId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Format a DB row for API response.
   * SAS token is masked; never returned in plaintext.
   */
  _formatForResponse(row) {
    if (!row) return null;

    // Mask Azure SAS token
    let maskedSas = null;
    if (row.azure_sas_token) {
      try { maskedSas = maskApiKey(decrypt(row.azure_sas_token)); }
      catch { maskedSas = '****'; }
    }

    // Mask S3 secret access key
    let maskedS3Secret = null;
    if (row.s3_secret_access_key) {
      try { maskedS3Secret = maskApiKey(decrypt(row.s3_secret_access_key)); }
      catch { maskedS3Secret = '****'; }
    }

    // Mask GCP service account key
    let maskedGcpKey = null;
    if (row.gcs_service_account_key) {
      try { maskedGcpKey = maskApiKey(decrypt(row.gcs_service_account_key)); }
      catch { maskedGcpKey = '****'; }
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      owner_tenant_id: row.owner_tenant_id,
      storage_type: row.storage_type,
      // Azure
      azure_account: row.azure_account,
      azure_container: row.azure_container,
      azure_sas_token_masked: maskedSas,
      azure_url: row.azure_url,
      // Amazon S3
      s3_bucket: row.s3_bucket,
      s3_region: row.s3_region,
      s3_access_key_id: row.s3_access_key_id,
      s3_secret_access_key_masked: maskedS3Secret,
      // Google Cloud Storage
      gcs_bucket: row.gcs_bucket,
      gcs_project_id: row.gcs_project_id,
      gcs_service_account_key_masked: maskedGcpKey,
      // Common
      is_active: row.is_active,
      assigned_tenants_count: row.assigned_tenants_count !== undefined
        ? parseInt(row.assigned_tenants_count)
        : undefined,
      created_by: row.created_by,
      updated_by: row.updated_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  _invalidateCacheForBucket(bucketId) {
    // Remove all cached entries that reference this bucket
    for (const [tenantId, entry] of bucketCache.entries()) {
      if (entry.bucket && entry.bucket.id === bucketId) {
        bucketCache.delete(tenantId);
      }
    }
  }

  clearCache(tenantId) {
    if (tenantId) {
      bucketCache.delete(tenantId);
    } else {
      bucketCache.clear();
    }
  }
}

// Singleton
let instance = null;
const getTenantStorageBucketService = () => {
  if (!instance) instance = new TenantStorageBucketService();
  return instance;
};

module.exports = { TenantStorageBucketService, getTenantStorageBucketService };
