/**
 * Supplier Service
 * Manages supplier qualification, audits, scorecards, and ASL
 */

const { pool } = require('../config/database');
const { IndexingHooks } = require('../infrastructure/search/indexing.hooks');
const { getWorkflowEngineService } = require('./workflow-engine.service');
const { getAuditService } = require('./audit.service');
const { getNotificationService } = require('./notification.service');

class SupplierService {
  constructor() {
    this.pool = pool;
  }

  // ============================================================================
  // SUPPLIER CRUD
  // ============================================================================

  async create(tenantId, data, createdBy) {
    const supplierCode = data.supplier_code || await this._generateSupplierCode(tenantId);

    const result = await this.pool.query(
      `INSERT INTO suppliers (
        tenant_id, supplier_code, name, legal_name, supplier_type, category, risk_level,
        primary_contact_name, primary_contact_email, primary_contact_phone, website,
        address_line1, address_line2, city, state, country, postal_code,
        tax_id, duns_number, products_services, certifications, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'pending', $22)
      RETURNING *`,
      [
        tenantId, supplierCode, data.name, data.legal_name, data.supplier_type, data.category,
        data.risk_level, data.primary_contact_name, data.primary_contact_email,
        data.primary_contact_phone, data.website, data.address_line1, data.address_line2,
        data.city, data.state, data.country, data.postal_code, data.tax_id, data.duns_number,
        data.products_services || [], data.certifications || [], createdBy
      ]
    );

    const createdSupplier = await this.getById(result.rows[0].id, tenantId);
    IndexingHooks.indexSupplier(createdSupplier, tenantId);
    setImmediate(async () => { try { await getAuditService().log({ action: 'CREATE', user_id: createdBy, tenant_id: tenantId, resource_type: 'supplier', resource_id: createdSupplier.id, response_status: 201, metadata: { supplier_code: createdSupplier.supplier_code, name: createdSupplier.name } }); } catch(e){} });

    // Notify quality managers of new supplier
    setImmediate(async () => {
      try {
        await getNotificationService().sendByRole(tenantId, 'quality_manager', {
          title: `New Supplier Added: ${createdSupplier.name}`,
          message: `Supplier ${createdSupplier.supplier_code} - ${createdSupplier.name} has been added and is pending qualification`,
          notification_type: 'info',
          category: 'supplier',
          priority: 'normal',
          entity_type: 'supplier',
          entity_id: createdSupplier.id,
          entity_name: createdSupplier.name,
          action_url: `/suppliers/${createdSupplier.id}`
        });
      } catch (e) { console.warn('[SupplierService] Notification failed:', e.message); }
    });

    try {
      const { getModuleService } = require('./module.service');
      getModuleService().sendIdentityUpdate('create', 'supplier', createdSupplier.id, createdBy);
    } catch (e) {
      console.error('Failed to send identity update for supplier create', e);
    }

    return createdSupplier;
  }

  async getById(id, tenantId) {
    const result = await this.pool.query(
      `SELECT s.*, u.email as created_by_email
       FROM suppliers s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rows.length === 0) return null;

    // Get contacts
    const contacts = await this.pool.query(
      'SELECT * FROM supplier_contacts WHERE supplier_id = $1 ORDER BY is_primary DESC',
      [id]
    );

    // Get latest scorecard
    const scorecard = await this.pool.query(
      'SELECT * FROM supplier_scorecards WHERE supplier_id = $1 ORDER BY period_end DESC LIMIT 1',
      [id]
    );

    return this._formatSupplier(result.rows[0], contacts.rows, scorecard.rows[0]);
  }

  async list(tenantId, options = {}) {
    const { status, category, supplier_type, risk_level, search, limit = 50, offset = 0 } = options;

    let query = 'SELECT * FROM suppliers WHERE tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }
    if (supplier_type) {
      query += ` AND supplier_type = $${paramIndex++}`;
      params.push(supplier_type);
    }
    if (risk_level) {
      query += ` AND risk_level = $${paramIndex++}`;
      params.push(risk_level);
    }
    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR supplier_code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY name LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    const countResult = await this.pool.query(
      'SELECT COUNT(*) FROM suppliers WHERE tenant_id = $1',
      [tenantId]
    );

    return {
      suppliers: result.rows.map(s => this._formatSupplierSummary(s)),
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  async update(id, tenantId, data, updatedBy) {
    const allowedFields = [
      'name', 'legal_name', 'supplier_type', 'category', 'risk_level',
      'primary_contact_name', 'primary_contact_email', 'primary_contact_phone', 'website',
      'address_line1', 'address_line2', 'city', 'state', 'country', 'postal_code',
      'tax_id', 'duns_number', 'products_services', 'certifications',
      'quality_agreement_signed', 'quality_agreement_date'
    ];

    const setClauses = [];
    const values = [id, tenantId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        if (key === 'certifications') {
          setClauses.push(`${key} = $${paramIndex++}::jsonb`);
          values.push(value);
        } else if (key === 'products_services') {
          setClauses.push(`${key} = $${paramIndex++}::text[]`);
          values.push(value);
        } else {
          setClauses.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }
    }

    if (setClauses.length === 0) return this.getById(id, tenantId);

    setClauses.push(`updated_by = $${paramIndex++}`, 'updated_at = NOW()');
    values.push(updatedBy);

    await this.pool.query(
      `UPDATE suppliers SET ${setClauses.join(', ')} WHERE id = $1 AND tenant_id = $2`,
      values
    );
    setImmediate(async () => { try { await getAuditService().log({ action: 'UPDATE', user_id: updatedBy, tenant_id: tenantId, resource_type: 'supplier', resource_id: id, response_status: 200, metadata: { updated_fields: Object.keys(data) } }); } catch(e){} });

    const updatedSupplier = await this.getById(id, tenantId);

    try {
      const { getModuleService } = require('./module.service');
      getModuleService().sendIdentityUpdate('update', 'supplier', id, updatedBy);
    } catch (e) {
      console.error('Failed to send identity update for supplier update', e);
    }

    return updatedSupplier;
  }

  // ============================================================================
  // WORKFLOW
  // ============================================================================

  async submitForApproval(supplierId, tenantId, submittedBy) {
    const supplier = await this.getById(supplierId, tenantId);
    if (!supplier) throw new Error('Supplier not found');
    if (supplier.status !== 'pending') throw new Error('Only pending suppliers can be submitted');

    const workflowEngine = getWorkflowEngineService();
    const instance = await workflowEngine.startWorkflow({
      tenantId,
      workflowCode: 'supplier_approval',
      entityType: 'supplier',
      entityId: supplierId,
      entityName: `${supplier.supplier_code} - ${supplier.name}`,
      context: { category: supplier.category, risk_level: supplier.risk_level },
      startedBy: submittedBy
    });

    await this.pool.query(
      `UPDATE suppliers SET status = 'qualified', workflow_instance_id = $1, updated_by = $2, updated_at = NOW()
       WHERE id = $3`,
      [instance.id, submittedBy, supplierId]
    );

    setImmediate(async () => { try { await getAuditService().log({ action: 'UPDATE', user_id: submittedBy, tenant_id: tenantId, resource_type: 'supplier', resource_id: supplierId, response_status: 200, metadata: { action: 'submitted_for_approval' } }); } catch(e){} });

    return this.getById(supplierId, tenantId);
  }

  async updateStatus(supplierId, tenantId, newStatus, updatedBy) {
    const validStatuses = ['pending', 'qualified', 'approved', 'conditional', 'suspended', 'disqualified'];
    if (!validStatuses.includes(newStatus)) throw new Error('Invalid status');

    const updates = { status: newStatus };
    if (newStatus === 'approved') {
      updates.approved_date = new Date();
      // Set expiry 1 year from now
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      updates.expiry_date = expiry;
    }

    await this.pool.query(
      `UPDATE suppliers SET status = $1, approved_date = $2, expiry_date = $3, updated_by = $4, updated_at = NOW()
       WHERE id = $5 AND tenant_id = $6`,
      [newStatus, updates.approved_date || null, updates.expiry_date || null, updatedBy, supplierId, tenantId]
    );

    setImmediate(async () => { try { await getAuditService().log({ action: 'UPDATE', user_id: updatedBy, tenant_id: tenantId, resource_type: 'supplier', resource_id: supplierId, response_status: 200, metadata: { action: 'status_changed', new_status: newStatus } }); } catch(e){} });

    // Notify quality managers of status change
    const supplier = await this.getById(supplierId, tenantId);
    if (supplier) {
      setImmediate(async () => {
        try {
          await getNotificationService().sendByRole(tenantId, 'quality_manager', {
            title: `Supplier Status Changed: ${supplier.name}`,
            message: `Supplier ${supplier.supplier_code} - ${supplier.name} status changed to: ${newStatus}`,
            notification_type: newStatus === 'approved' ? 'success' : newStatus === 'disqualified' || newStatus === 'suspended' ? 'warning' : 'info',
            category: 'supplier',
            priority: newStatus === 'disqualified' || newStatus === 'suspended' ? 'high' : 'normal',
            entity_type: 'supplier',
            entity_id: supplierId,
            entity_name: supplier.name,
            action_url: `/suppliers/${supplierId}`
          });
        } catch (e) { console.warn('[SupplierService] Notification failed:', e.message); }
      });
    }

    return supplier;
  }

  // ============================================================================
  // CONTACTS
  // ============================================================================

  async addContact(supplierId, tenantId, data) {
    const result = await this.pool.query(
      `INSERT INTO supplier_contacts (supplier_id, tenant_id, name, title, email, phone, mobile, contact_type, is_primary, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [supplierId, tenantId, data.name, data.title, data.email, data.phone, data.mobile, data.contact_type, data.is_primary || false, data.notes]
    );
    return result.rows[0];
  }

  async getContacts(supplierId, tenantId) {
    const result = await this.pool.query(
      'SELECT * FROM supplier_contacts WHERE supplier_id = $1 AND tenant_id = $2 ORDER BY is_primary DESC, name',
      [supplierId, tenantId]
    );
    return result.rows;
  }

  // ============================================================================
  // AUDITS
  // ============================================================================

  async createAudit(tenantId, data, createdBy) {
    const auditNumber = await this._generateAuditNumber(tenantId);

    const result = await this.pool.query(
      `INSERT INTO supplier_audits (
        supplier_id, tenant_id, audit_number, audit_type, audit_scope,
        scheduled_date, lead_auditor_id, audit_team, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'planned', $9)
      RETURNING *`,
      [
        data.supplier_id, tenantId, auditNumber, data.audit_type, data.audit_scope,
        data.scheduled_date, data.lead_auditor_id, JSON.stringify(data.audit_team || []), createdBy
      ]
    );

    return this._formatAudit(result.rows[0]);
  }

  async getAudits(supplierId, tenantId) {
    const result = await this.pool.query(
      `SELECT sa.*, u.email as lead_auditor_email
       FROM supplier_audits sa
       LEFT JOIN users u ON sa.lead_auditor_id = u.id
       WHERE sa.supplier_id = $1 AND sa.tenant_id = $2
       ORDER BY sa.scheduled_date DESC`,
      [supplierId, tenantId]
    );
    return result.rows.map(a => this._formatAudit(a));
  }

  async completeAudit(auditId, tenantId, data, updatedBy) {
    await this.pool.query(
      `UPDATE supplier_audits SET
         status = 'completed', actual_date = $1, findings_count = $2, major_findings = $3,
         minor_findings = $4, observations = $5, overall_rating = $6, score = $7,
         executive_summary = $8, strengths = $9, weaknesses = $10, recommendations = $11,
         capa_required = $12, next_audit_date = $13, updated_at = NOW()
       WHERE id = $14 AND tenant_id = $15`,
      [
        data.actual_date || new Date(), data.findings_count || 0, data.major_findings || 0,
        data.minor_findings || 0, data.observations || 0, data.overall_rating, data.score,
        data.executive_summary, data.strengths, data.weaknesses, data.recommendations,
        data.capa_required || false, data.next_audit_date, auditId, tenantId
      ]
    );

    // Update supplier's last audit date
    const auditResult = await this.pool.query('SELECT supplier_id FROM supplier_audits WHERE id = $1', [auditId]);
    if (auditResult.rows.length > 0) {
      await this.pool.query(
        'UPDATE suppliers SET last_audit_date = $1, next_audit_date = $2, updated_at = NOW() WHERE id = $3',
        [data.actual_date || new Date(), data.next_audit_date, auditResult.rows[0].supplier_id]
      );
    }

    setImmediate(async () => { try { await getAuditService().log({ action: 'UPDATE', user_id: null, tenant_id: tenantId, resource_type: 'supplier', resource_id: auditId, response_status: 200, metadata: { action: 'supplier_audit_completed', overall_rating: data.overall_rating } }); } catch(e){} });

    const result = await this.pool.query('SELECT * FROM supplier_audits WHERE id = $1', [auditId]);
    return this._formatAudit(result.rows[0]);
  }

  // ============================================================================
  // SCORECARDS
  // ============================================================================

  async createScorecard(supplierId, tenantId, data, createdBy) {
    // Calculate overall score
    const weights = { quality: 0.4, delivery: 0.3, service: 0.2, cost: 0.1 };
    const overallScore = (
      (data.quality_score || 0) * weights.quality +
      (data.delivery_score || 0) * weights.delivery +
      (data.service_score || 0) * weights.service +
      (data.cost_score || 0) * weights.cost
    );

    const grade = this._calculateGrade(overallScore);

    const result = await this.pool.query(
      `INSERT INTO supplier_scorecards (
        supplier_id, tenant_id, period_start, period_end,
        quality_score, defect_rate, lot_acceptance_rate, complaints_count,
        delivery_score, on_time_delivery_rate, lead_time_adherence,
        service_score, responsiveness_score, documentation_score,
        cost_score, price_competitiveness,
        overall_score, grade, notes, calculated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        supplierId, tenantId, data.period_start, data.period_end,
        data.quality_score, data.defect_rate, data.lot_acceptance_rate, data.complaints_count || 0,
        data.delivery_score, data.on_time_delivery_rate, data.lead_time_adherence,
        data.service_score, data.responsiveness_score, data.documentation_score,
        data.cost_score, data.price_competitiveness,
        overallScore, grade, data.notes, createdBy
      ]
    );

    // Update supplier's current score
    await this.pool.query(
      'UPDATE suppliers SET current_score = $1, score_grade = $2, updated_at = NOW() WHERE id = $3',
      [overallScore, grade, supplierId]
    );

    return this._formatScorecard(result.rows[0]);
  }

  async getScorecards(supplierId, tenantId) {
    const result = await this.pool.query(
      'SELECT * FROM supplier_scorecards WHERE supplier_id = $1 AND tenant_id = $2 ORDER BY period_end DESC',
      [supplierId, tenantId]
    );
    return result.rows.map(s => this._formatScorecard(s));
  }

  // ============================================================================
  // APPROVED SUPPLIER LIST
  // ============================================================================

  async addToASL(supplierId, tenantId, data, approvedBy) {
    const result = await this.pool.query(
      `INSERT INTO approved_supplier_list (
        supplier_id, tenant_id, material_category, material_codes, approval_scope,
        restrictions, approved_date, expiry_date, review_date, approved_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        supplierId, tenantId, data.material_category, data.material_codes || [],
        data.approval_scope, data.restrictions, data.approved_date || new Date(),
        data.expiry_date, data.review_date, approvedBy, data.notes
      ]
    );
    return result.rows[0];
  }

  async getASL(tenantId, options = {}) {
    const { material_category, status = 'active' } = options;

    let query = `
      SELECT asl.*, s.supplier_code, s.name as supplier_name, s.current_score, s.score_grade
      FROM approved_supplier_list asl
      JOIN suppliers s ON asl.supplier_id = s.id
      WHERE asl.tenant_id = $1 AND asl.status = $2
    `;
    const params = [tenantId, status];

    if (material_category) {
      query += ' AND asl.material_category = $3';
      params.push(material_category);
    }

    query += ' ORDER BY asl.material_category, s.name';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  async getDashboard(tenantId) {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
         COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
         COUNT(*) FILTER (WHERE status = 'qualified') as qualification_count,
         COUNT(*) FILTER (WHERE status = 'suspended') as suspended_count,
         COUNT(*) FILTER (WHERE status = 'approved' AND expiry_date < NOW() + INTERVAL '30 days') as expiring_soon,
         COUNT(*) FILTER (WHERE category = 'critical') as critical_suppliers,
         AVG(current_score) FILTER (WHERE current_score IS NOT NULL) as avg_score
       FROM suppliers WHERE tenant_id = $1`,
      [tenantId]
    );

    const byGrade = await this.pool.query(
      `SELECT score_grade, COUNT(*) as count FROM suppliers 
       WHERE tenant_id = $1 AND score_grade IS NOT NULL GROUP BY score_grade`,
      [tenantId]
    );

    return {
      summary: {
        approved: parseInt(result.rows[0].approved_count),
        pending: parseInt(result.rows[0].pending_count),
        in_qualification: parseInt(result.rows[0].qualification_count),
        suspended: parseInt(result.rows[0].suspended_count),
        expiring_soon: parseInt(result.rows[0].expiring_soon),
        critical: parseInt(result.rows[0].critical_suppliers),
        average_score: parseFloat(result.rows[0].avg_score) || 0
      },
      by_grade: byGrade.rows.reduce((acc, r) => { acc[r.score_grade] = parseInt(r.count); return acc; }, {})
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  async _generateSupplierCode(tenantId) {
    const result = await this.pool.query(
      'SELECT COUNT(*) + 1 as next_num FROM suppliers WHERE tenant_id = $1',
      [tenantId]
    );
    return `SUP-${String(result.rows[0].next_num).padStart(5, '0')}`;
  }

  async _generateAuditNumber(tenantId) {
    const year = new Date().getFullYear();
    const result = await this.pool.query(
      `SELECT COUNT(*) + 1 as next_num FROM supplier_audits WHERE tenant_id = $1 AND audit_number LIKE $2`,
      [tenantId, `SA-${year}-%`]
    );
    return `SA-${year}-${String(result.rows[0].next_num).padStart(4, '0')}`;
  }

  _calculateGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  _formatSupplier(s, contacts = [], scorecard = null) {
    return {
      id: s.id,
      supplier_code: s.supplier_code,
      name: s.name,
      legal_name: s.legal_name,
      supplier_type: s.supplier_type,
      category: s.category,
      risk_level: s.risk_level,
      status: s.status,
      contact: {
        name: s.primary_contact_name,
        email: s.primary_contact_email,
        phone: s.primary_contact_phone
      },
      address: {
        line1: s.address_line1,
        line2: s.address_line2,
        city: s.city,
        state: s.state,
        country: s.country,
        postal_code: s.postal_code
      },
      website: s.website,
      tax_id: s.tax_id,
      duns_number: s.duns_number,
      quality_agreement: {
        signed: s.quality_agreement_signed,
        date: s.quality_agreement_date
      },
      dates: {
        approved: s.approved_date,
        expiry: s.expiry_date,
        last_audit: s.last_audit_date,
        next_audit: s.next_audit_date
      },
      certifications: s.certifications,
      products_services: s.products_services,
      score: {
        current: s.current_score ? parseFloat(s.current_score) : null,
        grade: s.score_grade
      },
      contacts: contacts,
      latest_scorecard: scorecard ? this._formatScorecard(scorecard) : null,
      workflow_instance_id: s.workflow_instance_id,
      created_by: s.created_by_email,
      created_at: s.created_at,
      updated_at: s.updated_at
    };
  }

  _formatSupplierSummary(s) {
    return {
      id: s.id,
      supplier_code: s.supplier_code,
      name: s.name,
      supplier_type: s.supplier_type,
      category: s.category,
      risk_level: s.risk_level,
      status: s.status,
      score: s.current_score ? parseFloat(s.current_score) : null,
      grade: s.score_grade,
      expiry_date: s.expiry_date,
      is_expiring: s.expiry_date && new Date(s.expiry_date) < new Date(Date.now() + 30*24*60*60*1000)
    };
  }

  _formatAudit(a) {
    return {
      id: a.id,
      audit_number: a.audit_number,
      audit_type: a.audit_type,
      audit_scope: a.audit_scope,
      scheduled_date: a.scheduled_date,
      actual_date: a.actual_date,
      lead_auditor: a.lead_auditor_email || a.lead_auditor_id,
      audit_team: a.audit_team,
      status: a.status,
      findings: {
        total: a.findings_count,
        major: a.major_findings,
        minor: a.minor_findings,
        observations: a.observations
      },
      overall_rating: a.overall_rating,
      score: a.score ? parseFloat(a.score) : null,
      summary: a.executive_summary,
      capa_required: a.capa_required,
      next_audit_date: a.next_audit_date
    };
  }

  _formatScorecard(s) {
    return {
      id: s.id,
      period: { start: s.period_start, end: s.period_end },
      quality: { score: parseFloat(s.quality_score || 0), defect_rate: s.defect_rate, lot_acceptance: s.lot_acceptance_rate },
      delivery: { score: parseFloat(s.delivery_score || 0), on_time: s.on_time_delivery_rate, lead_time: s.lead_time_adherence },
      service: { score: parseFloat(s.service_score || 0), responsiveness: s.responsiveness_score, documentation: s.documentation_score },
      cost: { score: parseFloat(s.cost_score || 0), competitiveness: s.price_competitiveness },
      overall: { score: parseFloat(s.overall_score || 0), grade: s.grade, trend: s.trend },
      notes: s.notes
    };
  }
}

// Singleton
let instance = null;
const getSupplierService = () => {
  if (!instance) instance = new SupplierService();
  return instance;
};

module.exports = { SupplierService, getSupplierService };
