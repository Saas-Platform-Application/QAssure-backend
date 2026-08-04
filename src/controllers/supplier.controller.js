/**
 * Supplier Controller
 * Handles supplier quality management API endpoints
 */

const { getSupplierService } = require("../services/supplier.service");

class SupplierController {
  // ============================================================================
  // SUPPLIER CRUD
  // ============================================================================

  async create(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const createdBy = req.user.id;

      const { name } = req.body;
      if (!name) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "name is required" },
        });
      }

      const supplier = await service.create(tenantId, req.body, createdBy);
      res.status(201).json({ success: true, data: supplier });
    } catch (error) {
      console.error("[Supplier] Create error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "CREATE_ERROR", message: error.message },
      });
    }
  }

  async list(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const {
        status,
        category,
        supplier_type,
        risk_level,
        search,
        limit,
        offset,
      } = req.query;

      const result = await service.list(tenantId, {
        status,
        category,
        supplier_type,
        risk_level,
        search,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      });

      res.json({
        success: true,
        data: result.suppliers,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        },
      });
    } catch (error) {
      console.error("[Supplier] List error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "FETCH_ERROR", message: error.message },
      });
    }
  }

  async getById(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const { id } = req.params;

      const supplier = await service.getById(id, tenantId);
      if (!supplier) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Supplier not found" },
        });
      }

      res.json({ success: true, data: supplier });
    } catch (error) {
      console.error("[Supplier] Get error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "FETCH_ERROR", message: error.message },
      });
    }
  }

  async update(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const updatedBy = req.user.id;
      const { id } = req.params;

      const supplier = await service.update(id, tenantId, req.body, updatedBy);
      res.json({ success: true, data: supplier });
    } catch (error) {
      console.error("[Supplier] Update error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "UPDATE_ERROR", message: error.message },
      });
    }
  }

  // ============================================================================
  // WORKFLOW
  // ============================================================================

  async submit(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const submittedBy = req.user.id;
      const { id } = req.params;

      const supplier = await service.submitForApproval(
        id,
        tenantId,
        submittedBy,
      );
      res.json({ success: true, data: supplier });
    } catch (error) {
      console.error("[Supplier] Submit error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "SUBMIT_ERROR", message: error.message },
      });
    }
  }

  async updateStatus(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const updatedBy = req.user.id;
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "status is required" },
        });
      }

      const supplier = await service.updateStatus(
        id,
        tenantId,
        status,
        updatedBy,
      );
      res.json({ success: true, data: supplier });
    } catch (error) {
      console.error("[Supplier] Status update error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "UPDATE_ERROR", message: error.message },
      });
    }
  }

  // ============================================================================
  // CONTACTS
  // ============================================================================

  async getContacts(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const { id } = req.params;

      const contacts = await service.getContacts(id, tenantId);
      res.json({ success: true, data: contacts });
    } catch (error) {
      console.error("[Supplier] Get contacts error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "FETCH_ERROR", message: error.message },
      });
    }
  }

  async addContact(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const { id } = req.params;

      const { name } = req.body;
      if (!name) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "name is required" },
        });
      }

      const contact = await service.addContact(id, tenantId, req.body);
      res.status(201).json({ success: true, data: contact });
    } catch (error) {
      console.error("[Supplier] Add contact error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "CREATE_ERROR", message: error.message },
      });
    }
  }

  // ============================================================================
  // AUDITS
  // ============================================================================

  async getAudits(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const { id } = req.params;

      const audits = await service.getAudits(id, tenantId);
      res.json({ success: true, data: audits });
    } catch (error) {
      console.error("[Supplier] Get audits error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "FETCH_ERROR", message: error.message },
      });
    }
  }

  async createAudit(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const createdBy = req.user.id;
      const { id } = req.params;

      const { audit_type } = req.body;
      if (!audit_type) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "audit_type is required",
          },
        });
      }

      const audit = await service.createAudit(
        tenantId,
        { ...req.body, supplier_id: id },
        createdBy,
      );
      res.status(201).json({ success: true, data: audit });
    } catch (error) {
      console.error("[Supplier] Create audit error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "CREATE_ERROR", message: error.message },
      });
    }
  }

  async completeAudit(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const updatedBy = req.user.id;
      const { auditId } = req.params;

      const audit = await service.completeAudit(
        auditId,
        tenantId,
        req.body,
        updatedBy,
      );
      res.json({ success: true, data: audit });
    } catch (error) {
      console.error("[Supplier] Complete audit error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "UPDATE_ERROR", message: error.message },
      });
    }
  }

  // ============================================================================
  // SCORECARDS
  // ============================================================================

  async getScorecards(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const { id } = req.params;

      const scorecards = await service.getScorecards(id, tenantId);
      res.json({ success: true, data: scorecards });
    } catch (error) {
      console.error("[Supplier] Get scorecards error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "FETCH_ERROR", message: error.message },
      });
    }
  }

  async createScorecard(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const createdBy = req.user.id;
      const { id } = req.params;

      const { period_start, period_end } = req.body;
      if (!period_start || !period_end) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "period_start and period_end are required",
          },
        });
      }

      const scorecard = await service.createScorecard(
        id,
        tenantId,
        req.body,
        createdBy,
      );
      res.status(201).json({ success: true, data: scorecard });
    } catch (error) {
      console.error("[Supplier] Create scorecard error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "CREATE_ERROR", message: error.message },
      });
    }
  }

  // ============================================================================
  // ASL
  // ============================================================================

  async getASL(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const { material_category, status } = req.query;

      const asl = await service.getASL(tenantId, { material_category, status });
      res.json({ success: true, data: asl });
    } catch (error) {
      console.error("[Supplier] Get ASL error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "FETCH_ERROR", message: error.message },
      });
    }
  }

  async addToASL(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;
      const approvedBy = req.user.id;
      const { id } = req.params;

      const { material_category } = req.body;
      if (!material_category) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "material_category is required",
          },
        });
      }

      const asl = await service.addToASL(id, tenantId, req.body, approvedBy);
      res.status(201).json({ success: true, data: asl });
    } catch (error) {
      console.error("[Supplier] Add to ASL error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "CREATE_ERROR", message: error.message },
      });
    }
  }

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  async getDashboard(req, res) {
    try {
      const service = getSupplierService();
      const tenantId = req.query.tenantId || req.user.tenantId;

      const dashboard = await service.getDashboard(tenantId);
      res.json({ success: true, data: dashboard });
    } catch (error) {
      console.error("[Supplier] Dashboard error:", error.message);
      res.status(500).json({
        success: false,
        error: { code: "FETCH_ERROR", message: error.message },
      });
    }
  }

  // ============================================================================
  // LOOKUP DATA
  // ============================================================================

  async getTypes(req, res) {
    res.json({
      success: true,
      data: [
        { code: "manufacturer", name: "Manufacturer" },
        { code: "distributor", name: "Distributor" },
        { code: "service_provider", name: "Service Provider" },
        { code: "raw_material", name: "Raw Material Supplier" },
        { code: "contract_manufacturer", name: "Contract Manufacturer" },
        { code: "logistics", name: "Logistics Provider" },
      ],
    });
  }

  async getCategories(req, res) {
    res.json({
      success: true,
      data: [
        {
          code: "critical",
          name: "Critical",
          description: "Direct impact on product quality",
        },
        {
          code: "major",
          name: "Major",
          description: "Significant impact on operations",
        },
        { code: "minor", name: "Minor", description: "Limited impact" },
      ],
    });
  }

  async getStatuses(req, res) {
    res.json({
      success: true,
      data: [
        { code: "pending", name: "Pending" },
        { code: "qualified", name: "Qualified" },
        { code: "approved", name: "Approved" },
        { code: "conditional", name: "Conditional Approval" },
        { code: "suspended", name: "Suspended" },
        { code: "disqualified", name: "Disqualified" },
      ],
    });
  }

  async getAuditTypes(req, res) {
    res.json({
      success: true,
      data: [
        { code: "initial", name: "Initial Qualification" },
        { code: "periodic", name: "Periodic/Surveillance" },
        { code: "for_cause", name: "For Cause" },
        { code: "follow_up", name: "Follow-Up" },
        { code: "desktop", name: "Desktop Review" },
      ],
    });
  }
}

module.exports = new SupplierController();
