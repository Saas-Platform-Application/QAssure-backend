// ============================================================================
// QAssure File Attachment Service — P0 Service Fixes
// File: src/services/file-attachment.service.js
// ============================================================================
// Apply these patches in order. Each section shows BEFORE → AFTER.
// Search for the exact BEFORE code block, replace with AFTER.
// ============================================================================


// ============================================================================
// FIX #1: Verify getFileStream exists
// ============================================================================
// Run this first:
//   grep -n "getFileStream" src/services/file-attachment.service.js
//
// If it returns nothing, add this method AFTER getFilePath():
// ----------------------------------------------------------------------------

/*
  async getFileStream(id, tenantId, userId = null, req = null) {
    const { path: filePath, attachment } = await this.getFilePath(id, tenantId, userId, req);
    const fs = require('fs');
    
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found on storage');
    }

    return {
      stream: fs.createReadStream(filePath),
      attachment,
      mimeType: attachment.mime_type,
      fileName: attachment.original_name,
      fileSize: parseInt(attachment.file_size) || 0
    };
  }
*/


// ============================================================================
// FIX #2: Orphaned file cleanup on DB INSERT failure — upload()
// ============================================================================

// ---- FIND THIS in upload() method (approximately lines 200-240): ----

// BEFORE:
/*
    // Save file using storage provider
    await this.storageProvider.save(relativePath, fileBuffer);

    // Clean up temp file if exists
    if (file.path) {
      const fs = require('fs');
      try { fs.unlinkSync(file.path); } catch (e) { }
    }

    // Insert into database
    const result = await this.pool.query(
*/

// AFTER (wrap DB insert in try/catch with file cleanup):
/*
    // Save file using storage provider
    await this.storageProvider.save(relativePath, fileBuffer);

    // Clean up temp file if exists
    if (file.path) {
      const fs = require('fs');
      try { fs.unlinkSync(file.path); } catch (e) { }
    }

    // Insert into database — clean up stored file if DB fails
    let result;
    try {
      result = await this.pool.query(
*/

// Then FIND the closing of the INSERT query result assignment and add:
// (after the query closing parenthesis and semicolon)
/*
    } catch (dbError) {
      // DB insert failed — remove the orphaned file from storage
      try {
        await this.storageProvider.delete(relativePath);
        console.error(`[FileAttachment] Cleaned up orphaned file after DB failure: ${relativePath}`);
      } catch (cleanupError) {
        console.error(`[FileAttachment] CRITICAL: Failed to clean up orphaned file: ${relativePath}`, cleanupError.message);
      }
      throw dbError;
    }
*/


// ============================================================================
// FIX #2b: Same orphan cleanup for uploadVersion()
// ============================================================================

// Apply the IDENTICAL pattern inside uploadVersion():
// 1. Find: await this.storageProvider.save(relativePath, fileBuffer);
// 2. Wrap the DB INSERT in try/catch
// 3. In catch: await this.storageProvider.delete(relativePath); then re-throw

// The exact pattern:
/*
    await this.storageProvider.save(relativePath, fileBuffer);
    
    // ... temp file cleanup ...

    let result;
    try {
      // Mark previous version as not current
      await this.pool.query(
        'UPDATE file_attachments SET is_current_version = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
        [fileId, tenantId]
      );

      result = await this.pool.query(
        'INSERT INTO file_attachments (...) VALUES (...)',
        [...]
      );
    } catch (dbError) {
      try {
        await this.storageProvider.delete(relativePath);
        console.error(`[FileAttachment] Cleaned up orphaned version file after DB failure: ${relativePath}`);
      } catch (cleanupError) {
        console.error(`[FileAttachment] CRITICAL: Failed to clean up orphaned version file: ${relativePath}`, cleanupError.message);
      }
      throw dbError;
    }
*/


// ============================================================================
// FIX #3: Fix getByEntity fragile count query
// ============================================================================

// ---- FIND THIS in getByEntity() method: ----

// BEFORE:
/*
    const countQuery = query.replace(
      'SELECT fa.*, u.email as uploaded_by_email',
      'SELECT COUNT(*) as total'
    ).replace('LEFT JOIN users u ON fa.uploaded_by = u.id\n      ', '');
*/

// AFTER (build count query from shared WHERE clause):
/*
    // Build WHERE clause parts (shared between data query and count query)
    const whereParts = ['fa.entity_type = $1', 'fa.entity_id = $2', 'fa.tenant_id = $3', 'fa.deleted_at IS NULL'];
    const params = [entityType, entityId, tenantId];

    if (options.category) {
      params.push(options.category);
      whereParts.push(`fa.category = $${params.length}`);
    }
    if (options.source_module) {
      params.push(options.source_module);
      whereParts.push(`fa.source_module = $${params.length}`);
    }

    const whereClause = whereParts.join(' AND ');

    // Count query — clean, no string manipulation
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM file_attachments fa WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total) || 0;

    // Data query
    const dataParams = [...params];
    let orderClause = 'ORDER BY fa.created_at DESC';
    
    const limit = parseInt(options.limit) || 20;
    const offset = parseInt(options.offset) || 0;
    dataParams.push(limit);
    dataParams.push(offset);

    const dataQuery = `
      SELECT fa.*, u.email as uploaded_by_email
      FROM file_attachments fa
      LEFT JOIN users u ON fa.uploaded_by = u.id
      WHERE ${whereClause}
      ${orderClause}
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const dataResult = await this.pool.query(dataQuery, dataParams);
*/

// NOTE: You'll need to remove the old query-building code that uses string concatenation
// and the old countQuery variable. Replace the entire query-building section of getByEntity.


// ============================================================================
// FIX #5: Parse file_size to integer in _formatAttachment
// ============================================================================

// ---- FIND THIS in _formatAttachment() method: ----

// BEFORE:
/*
  _formatAttachment(row) {
    return {
      ...row,
*/

// AFTER:
/*
  _formatAttachment(row) {
    if (!row) return null;
    return {
      ...row,
      file_size: parseInt(row.file_size) || 0,
      download_count: parseInt(row.download_count) || 0,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
*/

// IMPORTANT: Make sure you're not removing existing formatting logic.
// Just add the parseInt() lines BEFORE the spread or at the end of the return object.
// If _formatAttachment already has some of these fields, just add the missing parseInt() calls.


// ============================================================================
// FIX #8: getByShareToken — don't increment count for "view" permission
// ============================================================================

// ---- FIND the download count increment in getByShareToken(): ----

// BEFORE (approximately):
/*
    // Update download count and last accessed
    await this.pool.query(
      'UPDATE file_shares SET current_downloads = current_downloads + 1, last_accessed_at = NOW() WHERE id = $1',
      [share.id]
    );
*/

// AFTER:
/*
    // Only increment download count for 'download' permission, not 'view'
    if (share.permissions === 'download') {
      await this.pool.query(
        'UPDATE file_shares SET current_downloads = current_downloads + 1, last_accessed_at = NOW() WHERE id = $1',
        [share.id]
      );
    } else {
      // View-only: just update last_accessed_at, don't bump download count
      await this.pool.query(
        'UPDATE file_shares SET last_accessed_at = NOW() WHERE id = $1',
        [share.id]
      );
    }
*/
