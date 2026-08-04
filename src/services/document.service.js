/**
 * Document Service
 * Manages controlled documents with versioning and workflow integration
 */

const { pool } = require('../config/database');
const { IndexingHooks } = require('../infrastructure/search/indexing.hooks');
const { getWorkflowEngineService } = require('./workflow-engine.service');
const { getAuditService } = require('./audit.service');
const { getNotificationService } = require('./notification.service');
const crypto = require('crypto');

class DocumentService {
  constructor() {
    this.pool = pool;
  }

  /**
   * Create a new document
   */
  async create(tenantId, data, createdBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Generate document number if not provided
      const documentNumber = data.document_number || await this._generateDocumentNumber(client, tenantId, data.document_type);

      // Create document
      const initialStatus = data.workflow_definition_id ? 'in_review' : 'draft';
      const docResult = await client.query(
        `INSERT INTO documents (
          tenant_id, document_number, title, description, category_id, document_type,
          status, owner_id, department, tags, custom_fields, created_by,
          source_module, source_module_id, source_record_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          tenantId,
          documentNumber,
          data.title,
          data.description,
          data.category_id,
          data.document_type,
          initialStatus,
          data.owner_id || createdBy,
          data.department,
          data.tags || [],
          JSON.stringify(data.custom_fields || {}),
          createdBy,
          data.source_module || 'platform',
          data.source_module_id || null,
          data.source_record_id || null
        ]
      );

      const document = docResult.rows[0];

      // Create initial version
      const versionResult = await client.query(
        `INSERT INTO document_versions (
          document_id, tenant_id, version_number, major_version, minor_version,
          status, file_name, file_path, file_size, mime_type, file_hash,
          content, content_html, change_summary, created_by,
          source_module, source_module_id
        ) VALUES ($1, $2, '0.1', 0, 1, 'draft', $3, $4, $5, $6, $7, $8, $9, 'Initial draft', $10, $11, $12)
        RETURNING *`,
        [
          document.id, tenantId,
          data.file_name || null,
          data.file_path || null,
          data.file_size || null,
          data.mime_type || null,
          data.file_hash || null,
          data.content,
          data.content_html,
          createdBy,
          data.source_module || 'platform',
          data.source_module_id || null
        ]
      );

      const version = versionResult.rows[0];

      // Update document with current version
      await client.query(
        'UPDATE documents SET current_version_id = $1 WHERE id = $2',
        [version.id, document.id]
      );

      // Create structured sections if provided
      if (data.sections && data.sections.length > 0) {
        for (let i = 0; i < data.sections.length; i++) {
          const sec = data.sections[i];
          await client.query(
            `INSERT INTO document_sections (
              document_id, version_id, tenant_id, section_number, title,
              content, content_html, order_index, parent_id, is_mandatory
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              document.id, version.id, tenantId,
              sec.section_number || null,
              sec.title || null,
              sec.content || null,
              sec.content_html || null,
              sec.order_index !== undefined ? sec.order_index : i,
              sec.parent_id || null,
              sec.is_mandatory !== false
            ]
          );
        }
      }

      // Auto-start workflow if workflow_definition_id provided
      let workflowInstanceId = null;
      if (data.workflow_definition_id) {
        const workflowEngine = getWorkflowEngineService();
        const instance = await workflowEngine.startWorkflow({
          tenantId,
          workflowDefinitionId: data.workflow_definition_id,
          entityType: 'document',
          entityId: document.id,
          entityName: `${documentNumber} - ${data.title}`,
          context: { document_type: data.document_type },
          startedBy: createdBy,
          sourceModule: data.source_module || 'platform',
          sourceModuleId: data.source_module_id || null
        });
        workflowInstanceId = instance.id;
        await client.query(
          `UPDATE documents SET workflow_instance_id = $1, status = 'in_review' WHERE id = $2`,
          [workflowInstanceId, document.id]
        );
        // Also update initial version status to in_review
        await client.query(
          `UPDATE document_versions SET status = 'in_review' WHERE id = $1`,
          [version.id]
        );
      }

      await client.query('COMMIT');

      const createdDoc = await this.getById(document.id, tenantId);
      IndexingHooks.indexDocument(createdDoc, tenantId);
      this._audit('CREATE', tenantId, createdBy, createdDoc.id, { document_number: createdDoc.document_number, title: createdDoc.title });
      return createdDoc;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get document by ID
   */
  async getById(id, tenantId) {
    const result = await this.pool.query(
      `SELECT d.*, 
              dc.name as category_name, dc.code as category_code,
              u.email as owner_email, u.first_name as owner_first_name, u.last_name as owner_last_name,
              cb.email as created_by_email,
              dv.version_number as current_version_number, dv.status as version_status,
              dv.content as current_version_content, dv.content_html as current_version_content_html,
              m.name as module_name
       FROM documents d
       LEFT JOIN document_categories dc ON d.category_id = dc.id
       LEFT JOIN users u ON d.owner_id = u.id
       LEFT JOIN users cb ON d.created_by = cb.id
       LEFT JOIN document_versions dv ON d.current_version_id = dv.id
       LEFT JOIN modules m ON d.source_module_id = m.id::text
       WHERE d.id = $1 AND d.tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this._formatDocument(result.rows[0]);
  }

  /**
   * List documents
   */
  async list(tenantId, options = {}) {
    const { status, category_id, document_type, owner_id, search, source_module_id, source_record_id, limit = 50, offset = 0 } = options;

    let query = `
      SELECT d.*, 
             dc.name as category_name,
             u.email as owner_email,
             dv.version_number as current_version_number,
             m.name as module_name
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      LEFT JOIN users u ON d.owner_id = u.id
      LEFT JOIN document_versions dv ON d.current_version_id = dv.id
      LEFT JOIN modules m ON d.source_module_id = m.id::text
      WHERE d.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      query += ` AND d.status = $${paramIndex++}`;
      params.push(status);
    }

    if (category_id) {
      query += ` AND d.category_id = $${paramIndex++}`;
      params.push(category_id);
    }

    if (document_type) {
      query += ` AND d.document_type = $${paramIndex++}`;
      params.push(document_type);
    }

    if (owner_id) {
      query += ` AND d.owner_id = $${paramIndex++}`;
      params.push(owner_id);
    }

    if (source_module_id) {
      query += ` AND d.source_module_id = $${paramIndex++}`;
      params.push(source_module_id);
    }

    if (source_record_id) {
      query += ` AND d.source_record_id = $${paramIndex++}`;
      params.push(source_record_id);
    }

    if (search) {
      query += ` AND (d.title ILIKE $${paramIndex} OR d.document_number ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY d.updated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    // Get total count with same filters used for list query
    let countQuery = 'SELECT COUNT(*) FROM documents d WHERE d.tenant_id = $1';
    const countParams = [tenantId];
    let countParamIndex = 2;

    if (status) {
      countQuery += ` AND d.status = $${countParamIndex++}`;
      countParams.push(status);
    }

    if (category_id) {
      countQuery += ` AND d.category_id = $${countParamIndex++}`;
      countParams.push(category_id);
    }

    if (document_type) {
      countQuery += ` AND d.document_type = $${countParamIndex++}`;
      countParams.push(document_type);
    }

    if (owner_id) {
      countQuery += ` AND d.owner_id = $${countParamIndex++}`;
      countParams.push(owner_id);
    }

    if (source_module_id) {
      countQuery += ` AND d.source_module_id = $${countParamIndex++}`;
      countParams.push(source_module_id);
    }

    if (search) {
      countQuery += ` AND (d.title ILIKE $${countParamIndex} OR d.document_number ILIKE $${countParamIndex} OR d.description ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await this.pool.query(countQuery, countParams);

    return {
      documents: result.rows.map(d => this._formatDocumentSummary(d)),
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Update document metadata
   */
  async update(id, tenantId, data, updatedBy) {
    const allowedFields = ['title', 'description', 'category_id', 'owner_id', 'department', 'tags', 'custom_fields', 'source_module', 'source_module_id'];
    const setClauses = [];
    const values = [id, tenantId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        if (key === 'tags') {
          setClauses.push(`${key} = $${paramIndex++}::text[]`);
          values.push(value);
        } else if (key === 'custom_fields') {
          setClauses.push(`${key} = $${paramIndex++}::jsonb`);
          values.push(JSON.stringify(value));
        } else {
          setClauses.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClauses.push(`updated_by = $${paramIndex++}`);
    values.push(updatedBy);
    setClauses.push('updated_at = NOW()');

    await this.pool.query(
      `UPDATE documents SET ${setClauses.join(', ')} WHERE id = $1 AND tenant_id = $2`,
      values
    );

    this._audit('UPDATE', tenantId, updatedBy, id, { updated_fields: Object.keys(data) });
  }

  /**
   * Create a new version of a document
   */
  async createVersion(documentId, tenantId, data, createdBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get document and current version
      const docResult = await client.query(
        `SELECT d.*, dv.major_version, dv.minor_version
         FROM documents d
         LEFT JOIN document_versions dv ON d.current_version_id = dv.id
         WHERE d.id = $1 AND d.tenant_id = $2`,
        [documentId, tenantId]
      );

      if (docResult.rows.length === 0) {
        throw new Error('Document not found');
      }

      const doc = docResult.rows[0];

      // Calculate new version number
      let majorVersion = doc.major_version || 0;
      let minorVersion = doc.minor_version || 0;

      if (data.is_major_version) {
        majorVersion++;
        minorVersion = 0;
      } else {
        minorVersion++;
      }

      const versionNumber = `${majorVersion}.${minorVersion}`;

      // Calculate file hash if content provided
      let fileHash = null;
      if (data.content) {
        fileHash = crypto.createHash('sha256').update(data.content).digest('hex');
      }

      // Create new version
      const versionResult = await client.query(
        `INSERT INTO document_versions (
          document_id, tenant_id, version_number, major_version, minor_version,
          status, file_name, file_path, file_size, mime_type, file_hash,
          content, content_html, change_summary, change_reason, created_by,
          source_module, source_module_id
        ) VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          documentId, tenantId, versionNumber, majorVersion, minorVersion,
          data.file_name, data.file_path, data.file_size, data.mime_type, fileHash,
          data.content, data.content_html, data.change_summary, data.change_reason, createdBy,
          data.source_module || doc.source_module || 'platform',
          data.source_module_id || doc.source_module_id || null
        ]
      );

      const version = versionResult.rows[0];

      // Update document
      await client.query(
        `UPDATE documents SET current_version_id = $1, status = 'draft', updated_by = $2, updated_at = NOW()
         WHERE id = $3`,
        [version.id, createdBy, documentId]
      );

      await client.query('COMMIT');

      return this._formatVersion(version);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get document versions
   */
  async getVersions(documentId, tenantId) {
    const result = await this.pool.query(
      `SELECT dv.*, u.email as created_by_email, ab.email as approved_by_email,
       m.name as module_name
       FROM document_versions dv
       LEFT JOIN users u ON dv.created_by = u.id
       LEFT JOIN users ab ON dv.approved_by = ab.id
       LEFT JOIN modules m ON dv.source_module_id = m.id::text
       WHERE dv.document_id = $1 AND dv.tenant_id = $2
       ORDER BY dv.major_version DESC, dv.minor_version DESC`,
      [documentId, tenantId]
    );

    return result.rows.map(v => this._formatVersion(v));
  }

  /**
   * Submit document for review (starts workflow)
   */
  async submitForReview(documentId, tenantId, submittedBy, workflowDefinitionId = null) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get document
      const docResult = await client.query(
        'SELECT * FROM documents WHERE id = $1 AND tenant_id = $2',
        [documentId, tenantId]
      );

      if (docResult.rows.length === 0) {
        throw new Error('Document not found');
      }

      const doc = docResult.rows[0];

      if (doc.status !== 'draft') {
        throw new Error('Only draft documents can be submitted for review');
      }

      // Start workflow
      const workflowEngine = getWorkflowEngineService();
      const instance = await workflowEngine.startWorkflow({
        tenantId,
        workflowDefinitionId: workflowDefinitionId,
        entityType: 'document',
        entityId: documentId,
        entityName: `${doc.document_number} - ${doc.title}`,
        context: { document_type: doc.document_type },
        startedBy: submittedBy,
        sourceModule: doc.source_module,
        sourceModuleId: doc.source_module_id
      });

      // Update document status
      await client.query(
        `UPDATE documents SET status = 'in_review', workflow_instance_id = $1, updated_by = $2, updated_at = NOW()
         WHERE id = $3`,
        [instance.id, submittedBy, documentId]
      );

      // Update version status
      await client.query(
        `UPDATE document_versions SET status = 'in_review' WHERE id = $1`,
        [doc.current_version_id]
      );

      await client.query('COMMIT');
      this._audit('UPDATE', tenantId, submittedBy, documentId, { action: 'submitted_for_review', workflow_instance_id: instance.id });

      // Notify document owner if different from submitter
      if (doc.owner_id && doc.owner_id !== submittedBy) {
        setImmediate(async () => {
          try {
            await getNotificationService().sendFromTemplate(tenantId, doc.owner_id, 'document_submitted', {
              document_number: doc.document_number,
              title: doc.title
            }, {
              entityType: 'document',
              entityId: documentId,
              entityName: `${doc.document_number} - ${doc.title}`,
              actionUrl: `/documents/${documentId}`,
              createdBy: submittedBy
            });
          } catch (e) { console.warn('[DocumentService] Notification failed:', e.message); }
        });
      }

      return this.getById(documentId, tenantId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Make document effective (after approval)
   */
  async makeEffective(documentId, tenantId, effectiveDate, approvedBy, signatureId) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const docResult = await client.query(
        'SELECT * FROM documents WHERE id = $1 AND tenant_id = $2',
        [documentId, tenantId]
      );

      if (docResult.rows.length === 0) {
        throw new Error('Document not found');
      }

      const doc = docResult.rows[0];
      if (doc.status !== 'approved') {
        throw new Error('Only approved documents can be made effective');
      }

      // Get category for review frequency
      let nextReviewDate = null;
      if (doc.category_id) {
        const catResult = await client.query(
          'SELECT review_frequency_months FROM document_categories WHERE id = $1',
          [doc.category_id]
        );
        if (catResult.rows.length > 0 && catResult.rows[0].review_frequency_months) {
          nextReviewDate = new Date(effectiveDate);
          nextReviewDate.setMonth(nextReviewDate.getMonth() + catResult.rows[0].review_frequency_months);
        }
      }

      // Update document
      await client.query(
        `UPDATE documents 
         SET status = 'effective', effective_date = $1, next_review_date = $2, updated_by = $3, updated_at = NOW()
         WHERE id = $4`,
        [effectiveDate, nextReviewDate, approvedBy, documentId]
      );

      // Update version
      await client.query(
        `UPDATE document_versions 
         SET status = 'approved', approved_by = $1, approved_at = NOW(), signature_id = $2
         WHERE id = $3`,
        [approvedBy, signatureId, doc.current_version_id]
      );

      await client.query('COMMIT');
      this._audit('UPDATE', tenantId, approvedBy, documentId, { action: 'made_effective', effective_date: effectiveDate });

      // Notify document owner
      if (doc.owner_id && doc.owner_id !== approvedBy) {
        setImmediate(async () => {
          try {
            await getNotificationService().sendFromTemplate(tenantId, doc.owner_id, 'document_effective', {
              document_number: doc.document_number,
              title: doc.title,
              effective_date: effectiveDate
            }, {
              entityType: 'document',
              entityId: documentId,
              entityName: `${doc.document_number} - ${doc.title}`,
              actionUrl: `/documents/${documentId}`,
              createdBy: approvedBy
            });
          } catch (e) { console.warn('[DocumentService] Notification failed:', e.message); }
        });
      }

      return this.getById(documentId, tenantId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Approve document (in_review → approved)
   * Called by quality manager after technical review
   */
  async approve(documentId, tenantId, approvedBy, comments) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const docResult = await client.query(
        'SELECT * FROM documents WHERE id = $1 AND tenant_id = $2',
        [documentId, tenantId]
      );

      if (docResult.rows.length === 0) {
        throw new Error('Document not found');
      }

      const doc = docResult.rows[0];

      if (doc.status !== 'in_review') {
        throw new Error('Only documents in review can be approved');
      }

      // Check if workflow is completed if exists
      if (doc.workflow_instance_id) {
        const workflowEngine = getWorkflowEngineService();
        const instance = await workflowEngine.getInstance(doc.workflow_instance_id, tenantId);
        if (instance && instance.status !== 'completed') {
          throw new Error('The workflow is not in completed status');
        }
      }

      // Update document status
      await client.query(
        `UPDATE documents SET status = 'approved', updated_by = $1, updated_at = NOW()
         WHERE id = $2`,
        [approvedBy, documentId]
      );

      // Update version status
      await client.query(
        `UPDATE document_versions SET status = 'approved'
         WHERE id = $1`,
        [doc.current_version_id]
      );

      // Record workflow history
      if (doc.workflow_instance_id) {
        await client.query(
          `INSERT INTO workflow_history (workflow_instance_id, tenant_id, event_type, action, performed_by, comments, performed_at)
           VALUES ($1, $2, 'transition', 'approve', $3, $4, NOW())`,
          [doc.workflow_instance_id, tenantId, approvedBy, comments]
        );
      }

      await client.query('COMMIT');

      this._audit('UPDATE', tenantId, approvedBy, documentId, { action: 'approved', comments });

      // Notify document owner and creator
      const notifyUsers = new Set();
      if (doc.owner_id) notifyUsers.add(doc.owner_id);
      if (doc.created_by) notifyUsers.add(doc.created_by);
      notifyUsers.delete(approvedBy);

      for (const userId of notifyUsers) {
        setImmediate(async () => {
          try {
            await getNotificationService().sendFromTemplate(tenantId, userId, 'document_approved', {
              document_number: doc.document_number,
              title: doc.title
            }, {
              entityType: 'document',
              entityId: documentId,
              entityName: `${doc.document_number} - ${doc.title}`,
              actionUrl: `/documents/${documentId}`,
              createdBy: approvedBy
            });
          } catch (e) { console.warn('[DocumentService] Notification failed:', e.message); }
        });
      }

      return this.getById(documentId, tenantId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject document (in_review → draft)
   * Called by reviewer when document needs changes
   */
  async reject(documentId, tenantId, rejectedBy, reason) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const docResult = await client.query(
        'SELECT * FROM documents WHERE id = $1 AND tenant_id = $2',
        [documentId, tenantId]
      );

      if (docResult.rows.length === 0) {
        throw new Error('Document not found');
      }

      const doc = docResult.rows[0];

      if (!['in_review', 'approved'].includes(doc.status)) {
        throw new Error('Only documents in review or approved can be rejected');
      }

      // Check if workflow is completed if exists
      // if (doc.workflow_instance_id) {
      //   const workflowEngine = getWorkflowEngineService();
      //   const instance = await workflowEngine.getInstance(doc.workflow_instance_id, tenantId);
      //   if (instance && instance.status !== 'completed') {
      //     throw new Error('The workflow is not in completed status');
      //   }
      // }

      // Update document status back to draft
      await client.query(
        `UPDATE documents SET status = 'draft', updated_by = $1, updated_at = NOW()
         WHERE id = $2`,
        [rejectedBy, documentId]
      );

      // Update version status back to draft
      await client.query(
        `UPDATE document_versions SET status = 'draft'
         WHERE id = $1`,
        [doc.current_version_id]
      );

      // Record workflow history
      if (doc.workflow_instance_id) {
        await client.query(
          `INSERT INTO workflow_history (workflow_instance_id, tenant_id, event_type, action, performed_by, comments, performed_at)
           VALUES ($1, $2, 'transition', 'reject', $3, $4, NOW())`,
          [doc.workflow_instance_id, tenantId, rejectedBy, reason]
        );
      }

      await client.query('COMMIT');

      this._audit('UPDATE', tenantId, rejectedBy, documentId, { action: 'rejected', reason });

      // Notify document owner and creator
      const notifyUsers = new Set();
      if (doc.owner_id) notifyUsers.add(doc.owner_id);
      if (doc.created_by) notifyUsers.add(doc.created_by);
      notifyUsers.delete(rejectedBy);

      for (const userId of notifyUsers) {
        setImmediate(async () => {
          try {
            await getNotificationService().sendFromTemplate(tenantId, userId, 'document_rejected', {
              document_number: doc.document_number,
              title: doc.title,
              reason: reason || 'No reason provided'
            }, {
              entityType: 'document',
              entityId: documentId,
              entityName: `${doc.document_number} - ${doc.title}`,
              actionUrl: `/documents/${documentId}`,
              createdBy: rejectedBy
            });
          } catch (e) { console.warn('[DocumentService] Notification failed:', e.message); }
        });
      }

      return this.getById(documentId, tenantId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Make document obsolete (effective → obsolete)
   * Called when a document is superseded by a newer version
   */
  async makeObsolete(documentId, tenantId, obsoletedBy, reason) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const docResult = await client.query(
        'SELECT * FROM documents WHERE id = $1 AND tenant_id = $2',
        [documentId, tenantId]
      );

      if (docResult.rows.length === 0) {
        throw new Error('Document not found');
      }

      const doc = docResult.rows[0];

      if (doc.status !== 'effective') {
        throw new Error('Only effective documents can be made obsolete');
      }

      await client.query(
        `UPDATE documents SET status = 'obsolete', obsolete_date = NOW(), updated_by = $1, updated_at = NOW()
         WHERE id = $2`,
        [obsoletedBy, documentId]
      );

      // Record workflow history
      if (doc.workflow_instance_id) {
        await client.query(
          `INSERT INTO workflow_history (workflow_instance_id, tenant_id, event_type, action, performed_by, comments, performed_at)
           VALUES ($1, $2, 'transition', 'obsolete', $3, $4, NOW())`,
          [doc.workflow_instance_id, tenantId, obsoletedBy, reason]
        );
      }

      await client.query('COMMIT');

      this._audit('UPDATE', tenantId, obsoletedBy, documentId, { action: 'made_obsolete', reason });

      return this.getById(documentId, tenantId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Checkout document for editing
   */
  async checkout(documentId, tenantId, userId, reason) {
    // Check if already checked out
    const existing = await this.pool.query(
      'SELECT * FROM document_checkouts WHERE document_id = $1',
      [documentId]
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].checked_out_by === userId) {
        return { already_checked_out: true, by_current_user: true };
      }
      throw new Error('Document is already checked out by another user');
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour checkout

    await this.pool.query(
      `INSERT INTO document_checkouts (document_id, tenant_id, checked_out_by, expires_at, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [documentId, tenantId, userId, expiresAt, reason]
    );

    await this._logAccess(documentId, null, tenantId, userId, 'checkout');
    this._audit('UPDATE', tenantId, userId, documentId, { action: 'checked_out', expires_at: expiresAt });
    return { checked_out: true, expires_at: expiresAt };
  }

  /**
   * Checkin document
   */
  async checkin(documentId, tenantId, userId) {
    const result = await this.pool.query(
      'DELETE FROM document_checkouts WHERE document_id = $1 AND checked_out_by = $2 RETURNING *',
      [documentId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Document is not checked out by you');
    }

    await this._logAccess(documentId, null, tenantId, userId, 'checkin');
    this._audit('UPDATE', tenantId, userId, documentId, { action: 'checked_in' });
    return { checked_in: true };
  }

  /**
   * Get categories
   */
  async getCategories(tenantId) {
    const result = await this.pool.query(
      `SELECT * FROM document_categories WHERE tenant_id = $1 ORDER BY name`,
      [tenantId]
    );

    return result.rows.map(c => this._formatCategory(c));
  }

  /**
   * Create category
   */
  async createCategory(tenantId, data, createdBy) {
    const result = await this.pool.query(
      `INSERT INTO document_categories (
        tenant_id, name, code, description, parent_id,
        requires_training, retention_years, review_frequency_months, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        tenantId, data.name, data.code, data.description, data.parent_id,
        data.requires_training, data.retention_years,
        data.review_frequency_months, createdBy
      ]
    );

    return this._formatCategory(result.rows[0]);
  }

  /**
   * Update category
   */
  async updateCategory(id, tenantId, data) {
    const allowedFields = [
      'name', 'code', 'description', 'parent_id',
      'requires_training', 'retention_years', 'review_frequency_months'
    ];
    const setClauses = [];
    const values = [id, tenantId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClauses.push('updated_at = NOW()');

    const result = await this.pool.query(
      `UPDATE document_categories SET ${setClauses.join(', ')}
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Category not found or access denied');
    }

    return this._formatCategory(result.rows[0]);
  }

  /**
   * Delete category
   */
  async deleteCategory(id, tenantId) {
    // Check if category has documents
    const docsCountResult = await this.pool.query(
      'SELECT COUNT(*) FROM documents WHERE category_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (parseInt(docsCountResult.rows[0].count) > 0) {
      const error = new Error('Cannot delete category as it has associated documents');
      error.code = 'CATEGORY_IN_USE';
      throw error;
    }

    // Check if category has sub-categories
    const subCatsCountResult = await this.pool.query(
      'SELECT COUNT(*) FROM document_categories WHERE parent_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (parseInt(subCatsCountResult.rows[0].count) > 0) {
      const error = new Error('Cannot delete category as it has sub-categories');
      error.code = 'CATEGORY_IN_USE';
      throw error;
    }

    // Check if category has document templates
    const templatesCountResult = await this.pool.query(
      'SELECT COUNT(*) FROM document_templates WHERE category_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (parseInt(templatesCountResult.rows[0].count) > 0) {
      const error = new Error('Cannot delete category as it is used in document templates');
      error.code = 'CATEGORY_IN_USE';
      throw error;
    }

    const result = await this.pool.query(
      'DELETE FROM document_categories WHERE id = $1 AND tenant_id = $2 RETURNING *',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error('Category not found or access denied');
    }

    return { success: true };
  }

  /**
   * Get documents due for review
   */
  async getDueForReview(tenantId, daysAhead = 30) {
    const result = await this.pool.query(
      `SELECT d.*, u.email as owner_email
       FROM documents d
       LEFT JOIN users u ON d.owner_id = u.id
       WHERE d.tenant_id = $1 
       AND d.status = 'effective'
       AND d.next_review_date <= NOW() + INTERVAL '1 day' * $2
       ORDER BY d.next_review_date`,
      [tenantId, daysAhead]
    );

    return result.rows.map(d => this._formatDocumentSummary(d));
  }

  /**
   * Log document access
   */
  async _logAccess(documentId, versionId, tenantId, userId, action, ip = null, userAgent = null) {
    await this.pool.query(
      `INSERT INTO document_access_log (document_id, version_id, tenant_id, user_id, action, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [documentId, versionId, tenantId, userId, action, ip, userAgent]
    );
  }

  _audit(action, tenantId, userId, resourceId, metadata = {}) {
    setImmediate(async () => {
      try {
        await getAuditService().log({
          action,
          user_id: userId || null,
          tenant_id: tenantId || null,
          resource_type: 'document',
          resource_id: resourceId || null,
          response_status: 200,
          metadata
        });
      } catch (e) {
        console.warn('[DocumentService] Audit log failed:', e.message);
      }
    });
  }

  // ===========================================================================
  // SECTION METHODS
  // ===========================================================================

  /**
   * Get all sections for a document (ordered by order_index)
   */
  async getSections(documentId, tenantId) {
    const result = await this.pool.query(
      `SELECT ds.*, u.email as reviewed_by_email,
              (SELECT JSON_AGG(c) FROM (
                  SELECT dc.id, dc.comment_text, dc.authored_by, dc.created_at, dc.workflow_step,
                         au.email as author_email, au.first_name, au.last_name
                  FROM document_comments dc
                  LEFT JOIN users au ON dc.authored_by = au.id
                  WHERE dc.section_id = ds.id AND dc.status = 'pending'
                  ORDER BY dc.created_at ASC
              ) c) as active_comments
       FROM document_sections ds
       LEFT JOIN users u ON ds.reviewed_by = u.id
       WHERE ds.document_id = $1 AND ds.tenant_id = $2
       ORDER BY ds.order_index, ds.section_number`,
      [documentId, tenantId]
    );
    return result.rows.map(s => this._formatSection(s));
  }

  /**
   * Update section content (only by current workflow task assignee)
   */
  async updateSection(documentId, sectionId, tenantId, data, userId) {
    const canEdit = await this._isAssignedToCurrentTask(documentId, userId, tenantId);
    if (!canEdit) {
      throw Object.assign(
        new Error('Only the current workflow step assignee can edit sections'),
        { status: 403 }
      );
    }

    const allowed = ['title', 'content', 'content_html', 'section_number', 'order_index', 'is_mandatory'];
    const setClauses = [];
    const values = [sectionId, documentId, tenantId];
    let pi = 4;
    for (const [key, val] of Object.entries(data)) {
      if (allowed.includes(key)) {
        setClauses.push(`${key} = $${pi++}`);
        values.push(val);
      }
    }
    if (setClauses.length === 0) throw new Error('No valid fields to update');
    setClauses.push('updated_at = NOW()');

    const result = await this.pool.query(
      `UPDATE document_sections SET ${setClauses.join(', ')}
       WHERE id = $1 AND document_id = $2 AND tenant_id = $3
       RETURNING *`,
      values
    );
    if (result.rows.length === 0) throw new Error('Section not found');
    this._audit('UPDATE', tenantId, userId, documentId, { action: 'section_updated', section_id: sectionId });
    return this._formatSection(result.rows[0]);
  }

  /**
   * Mark a section as reviewed or rework (only by current task assignee)
   */
  async markSectionStatus(documentId, sectionId, tenantId, status, userId) {
    const validStatuses = ['reviewed', 'rework', 'pending'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid review_status. Must be one of: ${validStatuses.join(', ')}`);
    }
    const canEdit = await this._isAssignedToCurrentTask(documentId, userId, tenantId);
    if (!canEdit) {
      throw Object.assign(
        new Error('Only the current workflow step assignee can update section review status'),
        { status: 403 }
      );
    }

    // Fetch current workflow step name for traceability
    let currentStepName = null;
    try {
      const stepRes = await this.pool.query(
        `SELECT ws.name FROM workflow_instances wi
         JOIN workflow_steps ws ON ws.id = wi.current_step_id
         WHERE wi.entity_id = $1 AND wi.tenant_id = $2 AND wi.status = 'active'
         LIMIT 1`,
        [documentId, tenantId]
      );
      if (stepRes.rows.length > 0) currentStepName = stepRes.rows[0].name;
    } catch (_) {}

    const result = await this.pool.query(
      `UPDATE document_sections
       SET review_status = $1::text,
           reviewed_by   = CASE WHEN $1::text = 'reviewed' THEN $2 ELSE reviewed_by END,
           reviewed_at   = CASE WHEN $1::text = 'reviewed' THEN NOW() ELSE reviewed_at END,
           -- Capture rework origin
           rework_requested_by = CASE 
                                   WHEN $1::text = 'rework' THEN $2 
                                   WHEN $1::text = 'reviewed' THEN NULL 
                                   ELSE rework_requested_by 
                                 END,
           rework_requested_at = CASE 
                                   WHEN $1::text = 'rework' THEN NOW() 
                                   WHEN $1::text = 'reviewed' THEN NULL 
                                   ELSE rework_requested_at 
                                 END,
           rework_requested_step = CASE 
                                     WHEN $1::text = 'rework' THEN $6 
                                     WHEN $1::text = 'reviewed' THEN NULL 
                                     ELSE rework_requested_step 
                                   END,
           updated_at    = NOW()
       WHERE id = $3 AND document_id = $4 AND tenant_id = $5
       RETURNING *`,
      [status, userId, sectionId, documentId, tenantId, currentStepName]
    );
    if (result.rows.length === 0) throw new Error('Section not found');
    this._audit('UPDATE', tenantId, userId, documentId, { action: `section_${status}`, section_id: sectionId });
    return this._formatSection(result.rows[0]);
  }

  /**
   * Count mandatory sections by a specific review status.
   */
  async countSectionsByStatus(documentId, tenantId, status) {
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM document_sections
       WHERE document_id = $1 AND tenant_id = $2
         AND is_mandatory = TRUE AND review_status = $3`,
      [documentId, tenantId, status]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Count mandatory sections marked as 'rework' by someone in a PREVIOUS step.
   * (Used to ensure current user resolves inherited issues before moving forward).
   */
  async countReworkFromPreviousSteps(documentId, tenantId, currentStepName) {
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM document_sections
       WHERE document_id = $1 AND tenant_id = $2
         AND is_mandatory = TRUE 
         AND review_status = 'rework'
         AND rework_requested_step != $3`,
      [documentId, tenantId, currentStepName]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Count unresolved comments created in a PREVIOUS step.
   */
  async countUnresolvedCommentsFromPreviousSteps(documentId, tenantId, currentStepName) {
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM document_comments
       WHERE document_id = $1 AND tenant_id = $2
         AND status = 'open'
         AND workflow_step != $3`,
      [documentId, tenantId, currentStepName]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Reset sections when a document is sent back for rework.
   * - 'reviewed' -> 'pending'
   * - 'rework' stays 'rework' (so the author sees the feedback)
   */
  async resetSectionsForRework(documentId, tenantId, userId) {
    await this.pool.query(
      `UPDATE document_sections
       SET review_status = 'pending',
           reviewed_by   = NULL,
           reviewed_at   = NULL,
           updated_at    = NOW()
       WHERE document_id = $1 AND tenant_id = $2
         AND review_status = 'reviewed'`,
      [documentId, tenantId]
    );
    this._audit('UPDATE', tenantId, userId, documentId, { action: 'sections_reset_for_rework' });
  }

  /**
   * Count unreviewed mandatory sections (used as a gate before task transition)
   */
  async countUnreviewedMandatorySections(documentId, tenantId) {
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM document_sections
       WHERE document_id = $1 AND tenant_id = $2
         AND is_mandatory = TRUE AND review_status IN ('pending', 'rework')`,
      [documentId, tenantId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Check if a document has any sections defined
   */
  async hasSections(documentId, tenantId) {
    const result = await this.pool.query(
      `SELECT 1 FROM document_sections WHERE document_id = $1 AND tenant_id = $2 LIMIT 1`,
      [documentId, tenantId]
    );
    return result.rows.length > 0;
  }

  // ===========================================================================
  // COMMENT METHODS
  // ===========================================================================

  /**
   * List comments for a document (optionally filtered by section)
   */
  async listComments(documentId, tenantId, sectionId = null) {
    let query = `
      SELECT dc.*, u.email as author_email, u.first_name, u.last_name,
             ru.email as resolved_by_email
      FROM document_comments dc
      JOIN users u ON dc.authored_by = u.id
      LEFT JOIN users ru ON dc.resolved_by = ru.id
      WHERE dc.document_id = $1 AND dc.tenant_id = $2`;
    const params = [documentId, tenantId];
    if (sectionId) {
      query += ` AND dc.section_id = $3`;
      params.push(sectionId);
    }
    query += ` ORDER BY dc.created_at`;
    const result = await this.pool.query(query, params);
    return result.rows.map(c => this._formatComment(c));
  }

  /**
   * Add a comment (document-level or section-level)
   */
  async addComment(documentId, tenantId, data, authorId) {
    if (!data.comment_text || !data.comment_text.trim()) {
      throw new Error('comment_text is required');
    }

    // Security Gate: Only the current task assignee can add comments during workflow
    const canComment = await this._isAssignedToCurrentTask(documentId, authorId, tenantId);
    if (!canComment) {
      throw Object.assign(
        new Error('Only the current workflow step assignee can add comments'),
        { status: 403 }
      );
    }

    // Fetch current workflow step name for informational context
    let workflowStepName = null;
    try {
      const stepRes = await this.pool.query(
        `SELECT ws.name FROM workflow_instances wi
         JOIN workflow_steps ws ON ws.id = wi.current_step_id
         WHERE wi.entity_id = $1 AND wi.tenant_id = $2 AND wi.status = 'active'
         LIMIT 1`,
        [documentId, tenantId]
      );
      if (stepRes.rows.length > 0) workflowStepName = stepRes.rows[0].name;
    } catch (_) { /* non-critical */ }

    const result = await this.pool.query(
      `INSERT INTO document_comments (
        document_id, section_id, tenant_id, comment_text, authored_by, workflow_step, parent_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        documentId,
        data.section_id || null,
        tenantId,
        data.comment_text.trim(),
        authorId,
        workflowStepName,
        data.parent_id || null
      ]
    );
    this._audit('CREATE', tenantId, authorId, documentId, { action: 'comment_added', section_id: data.section_id || null });
    return this._formatComment(result.rows[0]);
  }

  /**
   * Resolve a comment
   */
  async resolveComment(documentId, commentId, tenantId, userId) {
    // Security Gate: Only the current task assignee can resolve comments during workflow
    const canResolve = await this._isAssignedToCurrentTask(documentId, userId, tenantId);
    if (!canResolve) {
      throw Object.assign(
        new Error('Only the current workflow step assignee can resolve comments'),
        { status: 403 }
      );
    }

    const result = await this.pool.query(
      `UPDATE document_comments
       SET status = 'resolved', resolved_by = $1, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND document_id = $3 AND tenant_id = $4
       RETURNING *`,
      [userId, commentId, documentId, tenantId]
    );
    if (result.rows.length === 0) throw new Error('Comment not found');
    this._audit('UPDATE', tenantId, userId, documentId, { action: 'comment_resolved', comment_id: commentId });
    return this._formatComment(result.rows[0]);
  }

  /**
   * Count unresolved comments for a document (used as a gate before task transition)
   */
  async countUnresolvedComments(documentId, tenantId) {
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM document_comments
       WHERE document_id = $1 AND tenant_id = $2 AND status = 'open'`,
      [documentId, tenantId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  // ===========================================================================
  // WORKFLOW INTEGRATION HELPERS
  // ===========================================================================

  /**
   * Called by workflow-engine when terminal step reached for a document entity.
   * Automatically marks the document as approved.
   */
  async markWorkflowApproved(documentId, tenantId, approvedBy, comments) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const docRes = await client.query(
        'SELECT * FROM documents WHERE id = $1 AND tenant_id = $2',
        [documentId, tenantId]
      );
      if (docRes.rows.length === 0) throw new Error('Document not found');
      const doc = docRes.rows[0];

      await client.query(
        `UPDATE documents SET status = 'approved', updated_by = $1, updated_at = NOW()
         WHERE id = $2`,
        [approvedBy, documentId]
      );
      await client.query(
        `UPDATE document_versions SET status = 'approved', approved_by = $1, approved_at = NOW()
         WHERE document_id = $2 AND status = 'in_review'`,
        [approvedBy, documentId]
      );

      await client.query('COMMIT');
      this._audit('UPDATE', tenantId, approvedBy, documentId, { action: 'auto_approved_by_workflow', comments });

      // Notify document owner / creator
      const notifyUsers = new Set();
      if (doc.owner_id) notifyUsers.add(doc.owner_id);
      if (doc.created_by) notifyUsers.add(doc.created_by);
      notifyUsers.delete(approvedBy);
      for (const uid of notifyUsers) {
        setImmediate(async () => {
          try {
            await getNotificationService().sendFromTemplate(tenantId, uid, 'document_approved', {
              document_number: doc.document_number,
              title: doc.title
            }, {
              entityType: 'document',
              entityId: documentId,
              entityName: `${doc.document_number} - ${doc.title}`,
              actionUrl: `/documents/${documentId}`,
              createdBy: approvedBy
            });
          } catch (e) { console.warn('[DocumentService] Notification failed:', e.message); }
        });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[DocumentService] markWorkflowApproved failed:', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * Check if a user is assigned to the current pending workflow task for a document.
   * This is the single gate used for section editing permission.
   */
  async _isAssignedToCurrentTask(documentId, userId, tenantId) {
    const result = await this.pool.query(
      `SELECT wt.assigned_user_ids, wt.assigned_role_ids, wi.started_by
       FROM workflow_tasks wt
       JOIN workflow_instances wi ON wt.workflow_instance_id = wi.id
       WHERE wi.entity_id = $1 AND wi.tenant_id = $2 AND wi.status = 'active'
         AND wt.status IN ('pending', 'in_progress')
       ORDER BY wt.created_at DESC
       LIMIT 1`,
      [documentId, tenantId]
    );
    if (result.rows.length === 0) return false;

    const task = result.rows[0];

    // Direct user assignment
    if (task.assigned_user_ids && task.assigned_user_ids.includes(userId)) return true;

    // Role-based assignment
    if (task.assigned_role_ids && task.assigned_role_ids.length > 0) {
      const roleCheck = await this.pool.query(
        `SELECT 1 FROM user_roles
         WHERE user_id = $1 AND role_id = ANY($2) AND tenant_id = $3 LIMIT 1`,
        [userId, task.assigned_role_ids, tenantId]
      );
      if (roleCheck.rows.length > 0) return true;
    }

    // Originator fallback
    if (!task.assigned_user_ids?.length && !task.assigned_role_ids?.length) {
      if (task.started_by === userId) return true;
    }

    return false;
  }

  // ===========================================================================
  // FORMAT HELPERS (sections & comments)
  // ===========================================================================

  _formatSection(s) {
    return {
      id: s.id,
      document_id: s.document_id,
      version_id: s.version_id,
      section_number: s.section_number,
      title: s.title,
      content: s.content,
      content_html: s.content_html,
      order_index: s.order_index,
      parent_id: s.parent_id,
      review_status: s.review_status,
      reviewed_by: s.reviewed_by_email || s.reviewed_by,
      reviewed_at: s.reviewed_at,
      is_mandatory: s.is_mandatory,
      comments: s.active_comments || [],
      rework_requested_by: s.rework_requested_by,
      rework_requested_at: s.rework_requested_at,
      rework_requested_step: s.rework_requested_step,
      created_at: s.created_at,
      updated_at: s.updated_at
    };
  }

  _formatComment(c) {
    return {
      id: c.id,
      document_id: c.document_id,
      section_id: c.section_id,
      comment_text: c.comment_text,
      workflow_step: c.workflow_step,
      authored_by: c.author_email || c.authored_by,
      author_name: (c.first_name && c.last_name) ? `${c.first_name} ${c.last_name}` : null,
      status: c.status,
      resolved_by: c.resolved_by_email || c.resolved_by,
      resolved_at: c.resolved_at,
      parent_id: c.parent_id,
      created_at: c.created_at,
      updated_at: c.updated_at
    };
  }

  /**
   * Generate document number
   */
  async _generateDocumentNumber(client, tenantId, documentType) {


    const prefix = documentType.toUpperCase().substring(0, 3);
    const year = new Date().getFullYear();

    const result = await client.query(
      `SELECT COUNT(*) + 1 as next_num 
       FROM documents 
       WHERE tenant_id = $1 AND document_number LIKE $2`,
      [tenantId, `${prefix}-${year}-%`]
    );

    const nextNum = String(result.rows[0].next_num).padStart(4, '0');
    return `${prefix}-${year}-${nextNum}`;
  }

  // Formatting helpers
  _formatDocument(doc) {
    return {
      id: doc.id,
      document_number: doc.document_number,
      title: doc.title,
      description: doc.description,
      document_type: doc.document_type,
      category: doc.category_id ? {
        id: doc.category_id,
        name: doc.category_name,
        code: doc.category_code
      } : null,
      status: doc.status,
      current_version: doc.current_version_number,
      version_status: doc.version_status,
      owner: doc.owner_id ? {
        id: doc.owner_id,
        email: doc.owner_email,
        name: `${doc.owner_first_name} ${doc.owner_last_name}`
      } : null,
      department: doc.department,
      effective_date: doc.effective_date,
      next_review_date: doc.next_review_date,
      tags: doc.tags,
      content: doc.current_version_content,
      content_html: doc.current_version_content_html,
      custom_fields: doc.custom_fields,
      workflow_instance_id: doc.workflow_instance_id,
      created_by: doc.created_by_email,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      module_name: doc.module_name,
      source_module: doc.source_module,
      source_module_id: doc.source_module_id,
      source_record_id: doc.source_record_id
    };
  }

  _formatDocumentSummary(doc) {
    return {
      id: doc.id,
      document_number: doc.document_number,
      title: doc.title,
      document_type: doc.document_type,
      category: doc.category_name,
      status: doc.status,
      current_version: doc.current_version_number,
      owner: doc.owner_email,
      next_review_date: doc.next_review_date,
      updated_at: doc.updated_at,
      module_name: doc.module_name,
      source_module: doc.source_module,
      source_module_id: doc.source_module_id,
      source_record_id: doc.source_record_id
    };
  }

  _formatVersion(v) {
    return {
      id: v.id,
      version_number: v.version_number,
      major_version: v.major_version,
      minor_version: v.minor_version,
      status: v.status,
      file: v.file_name ? {
        name: v.file_name,
        path: v.file_path,
        size: v.file_size,
        mime_type: v.mime_type,
        hash: v.file_hash
      } : null,
      change_summary: v.change_summary,
      change_reason: v.change_reason,
      approved_by: v.approved_by_email,
      approved_at: v.approved_at,
      signature_id: v.signature_id,
      created_by: v.created_by_email,
      created_at: v.created_at,
      module_name: v.module_name
    };
  }

  _formatCategory(c) {
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      description: c.description,
      parent_id: c.parent_id,
      requires_training: c.requires_training,
      retention_years: c.retention_years,
      review_frequency_months: c.review_frequency_months,
      created_at: c.created_at,
      updated_at: c.updated_at
    };
  }
}

// Singleton
let instance = null;

const getDocumentService = () => {
  if (!instance) {
    instance = new DocumentService();
  }
  return instance;
};

module.exports = {
  DocumentService,
  getDocumentService
};
