/**
 * CAPA Controller
 * Handles CAPA management API endpoints
 */

const { getCapaService } = require('../services/capa.service');

class CapaController {

  // ============================================================================
  // CAPA CRUD
  // ============================================================================

  async create(req, res) {
    try {
      const service = getCapaService();
      const tenantId = req.user.tenantId;
      const createdBy = req.user.id;

      const { title, capa_type } = req.body;
      if (!title || !capa_type) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'title and capa_type are required' }
        });
      }

      const capa = await service.create(tenantId, req.body, createdBy);
      res.status(201).json({ success: true, data: capa });
    } catch (error) {
      console.error('[CAPA] Create error:', error.message);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
    }
  }

  async list(req, res) {
    try {
      const service = getCapaService();
      const tenantId = req.user.tenantId;
      const { status, capa_type, priority, owner_id, source, search, limit, offset } = req.query;

      const result = await service.list(tenantId, {
        status, capa_type, priority, owner_id, source, search,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });

      res.json({
        success: true,
        data: result.capas,
        pagination: { total: result.total, limit: result.limit, offset: result.offset }
      });
    } catch (error) {
      console.error('[CAPA] List error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async getById(req, res) {
    try {
      const service = getCapaService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const capa = await service.getById(id, tenantId);
      if (!capa) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'CAPA not found' } });
      }

      res.json({ success: true, data: capa });
    } catch (error) {
      console.error('[CAPA] Get error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async update(req, res) {
    try {
      const service = getCapaService();
      const tenantId = req.user.tenantId;
      const updatedBy = req.user.id;
      const { id } = req.params;

      const capa = await service.update(id, tenantId, req.body, updatedBy);
      res.json({ success: true, data: capa });
    } catch (error) {
      console.error('[CAPA] Update error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // WORKFLOW ACTIONS
  // ============================================================================

  async submit(req, res) {
    try {
      const service = getCapaService();
      const tenantId = req.user.tenantId;
      const submittedBy = req.user.id;
      const { id } = req.params;

      const capa = await service.submitForInvestigation(id, tenantId, submittedBy);
      res.json({ success: true, data: capa });
    } catch (error) {
      console.error('[CAPA] Submit error:', error.message);
      res.status(500).json({ success: false, error: { code: 'SUBMIT_ERROR', message: error.message } });
    }
  }

  async updateStatus(req, res) {
    try {
      const service = getCapaService();
      const tenantId = req.user.tenantId;
      const updatedBy = req.user.id;
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'status is required' }
        });
      }

      const capa = await service.updateStatus(id, tenantId, status, updatedBy);
      res.json({ success: true, data: capa });
    } catch (error) {
      console.error('[CAPA] Status update error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // CAPA ACTIONS
  // ============================================================================

  async getActions(req, res) {
    try {
      const service = getCapaService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const actions = await service.getActions(id, tenantId);
      res.json({ success: true, data: actions });
    } catch (error) {
      console.error('[CAPA] Get actions error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async addAction(req, res) {
    try {
      const service = getCapaService();
      const tenantId = req.user.tenantId;
      const createdBy = req.user.id;
      const { id } = req.params;

      const { description, action_type } = req.body;
      if (!description || !action_type) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'description and action_type are required' }
        });
      }

      const action = await service.addAction(id, tenantId, req.body, createdBy);
      res.status(201).json({ success: true, data: action });
    } catch (error) {
      console.error('[CAPA] Add action error:', error.message);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
    }
  }

  async updateAction(req, res) {
    try {
      const service = getCapaService();
      const tenantId = req.user.tenantId;
      const updatedBy = req.user.id;
      const { id, actionId } = req.params;

      const action = await service.updateAction(actionId, tenantId, req.body, updatedBy);
      res.json({ success: true, data: action });
    } catch (error) {
      console.error('[CAPA] Update action error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // 8D REPORT
  // ============================================================================

  async get8DReport(req, res) {
    try {
      const service = getCapaService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const report = await service.get8DReport(id, tenantId);
      if (!report) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '8D Report not found' } });
      }

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('[CAPA] Get 8D error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async update8DSection(req, res) {
    try {
      const service = getCapaService();
      const tenantId = req.user.tenantId;
      const updatedBy = req.user.id;
      const { id, section } = req.params;

      const report = await service.update8DSection(id, tenantId, section, req.body, updatedBy);
      res.json({ success: true, data: report });
    } catch (error) {
      console.error('[CAPA] Update 8D section error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  async getDashboard(req, res) {
    try {
      const service = getCapaService();
      const tenantId = req.user.tenantId;

      const dashboard = await service.getDashboard(tenantId);
      res.json({ success: true, data: dashboard });
    } catch (error) {
      console.error('[CAPA] Dashboard error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // STATIC DATA
  // ============================================================================

  async getTypes(req, res) {
    res.json({
      success: true,
      data: [
        { code: 'corrective', name: 'Corrective Action' },
        { code: 'preventive', name: 'Preventive Action' },
        { code: 'both', name: 'Corrective & Preventive' }
      ]
    });
  }

  async getSources(req, res) {
    res.json({
      success: true,
      data: [
        { code: 'customer_complaint', name: 'Customer Complaint' },
        { code: 'audit', name: 'Internal/External Audit' },
        { code: 'deviation', name: 'Deviation/NCR' },
        { code: 'internal', name: 'Internal Observation' },
        { code: 'supplier', name: 'Supplier Issue' },
        { code: 'regulatory', name: 'Regulatory Finding' },
        { code: 'management_review', name: 'Management Review' }
      ]
    });
  }

  async getPriorities(req, res) {
    res.json({
      success: true,
      data: [
        { code: 'critical', name: 'Critical', sla_days: 7 },
        { code: 'high', name: 'High', sla_days: 14 },
        { code: 'medium', name: 'Medium', sla_days: 30 },
        { code: 'low', name: 'Low', sla_days: 60 }
      ]
    });
  }

  async getStatuses(req, res) {
    res.json({
      success: true,
      data: [
        { code: 'draft', name: 'Draft' },
        { code: 'open', name: 'Open' },
        { code: 'investigation', name: 'Investigation' },
        { code: 'action', name: 'Action Implementation' },
        { code: 'verification', name: 'Effectiveness Verification' },
        { code: 'closed', name: 'Closed' },
        { code: 'cancelled', name: 'Cancelled' }
      ]
    });
  }

  async getRootCauseMethods(req, res) {
    res.json({
      success: true,
      data: [
        { code: '5_why', name: '5 Whys Analysis' },
        { code: 'fishbone', name: 'Fishbone (Ishikawa) Diagram' },
        { code: 'fmea', name: 'FMEA' },
        { code: 'fault_tree', name: 'Fault Tree Analysis' },
        { code: 'pareto', name: 'Pareto Analysis' },
        { code: 'other', name: 'Other' }
      ]
    });
  }
}

module.exports = new CapaController();
