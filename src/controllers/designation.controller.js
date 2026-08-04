/**
 * Designation Controller - QAssure Platform
 * Handles HTTP requests for tenant-scoped designation management
 */
const { getDesignationService } = require("../services/designation.service");

class DesignationController {
  constructor() {
    this.designationService = getDesignationService();
  }

  create = async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenantId;
      const designation = await this.designationService.create(
        req.body,
        tenantId,
        req.user.id,
      );
      res.status(201).json({ success: true, data: designation });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  list = async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenantId;
      const { active_only, search } = req.query;
      const designations = await this.designationService.list(tenantId, {
        active_only: active_only === "true",
        search,
      });
      res
        .status(200)
        .json({
          success: true,
          data: designations,
          total: designations.length,
        });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  getById = async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenantId;
      const designation = await this.designationService.getById(
        req.params.id,
        tenantId,
      );
      res.status(200).json({ success: true, data: designation });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  update = async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenantId;
      const designation = await this.designationService.update(
        req.params.id,
        req.body,
        tenantId,
        req.user.id,
      );
      res.status(200).json({ success: true, data: designation });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  delete = async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenantId;
      const result = await this.designationService.delete(
        req.params.id,
        tenantId,
        req.user.id,
      );
      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  _handleError(res, error) {
    const statusMap = {
      VALIDATION_ERROR: 400,
      DUPLICATE_ERROR: 409,
      NOT_FOUND: 404,
      FORBIDDEN: 403,
    };
    const status = statusMap[error.code] || 500;
    if (status === 500) console.error("[DesignationController] Error:", error);
    res.status(status).json({
      success: false,
      error: {
        code: error.code || "INTERNAL_ERROR",
        message: status === 500 ? "An internal error occurred" : error.message,
      },
    });
  }
}

module.exports = new DesignationController();
