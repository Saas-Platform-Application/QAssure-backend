/**
 * Department Controller - QAssure Platform
 * Handles HTTP requests for tenant-scoped hierarchical department management
 */
const { getDepartmentService } = require("../services/department.service");

class DepartmentController {
  constructor() {
    this.departmentService = getDepartmentService();
  }

  /**
   * POST /api/v1/departments
   * Create a new department
   */
  create = async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenantId;
      const userId = req.user.id;
      const department = await this.departmentService.create(
        req.body,
        tenantId,
        userId,
      );

      res.status(201).json({
        success: true,
        data: department,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/departments
   * List departments for tenant (flat list)
   */
  list = async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenantId;
      const { active_only, search } = req.query;

      const departments = await this.departmentService.list(tenantId, {
        active_only: active_only === "true",
        search,
      });

      res.status(200).json({
        success: true,
        data: departments,
        total: departments.length,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/departments/tree
   * Get department hierarchy as tree
   */
  getTree = async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenantId;
      const activeOnly = req.query.active_only === "true";

      const tree = await this.departmentService.getTree(tenantId, activeOnly);

      res.status(200).json({
        success: true,
        data: tree,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/departments/:id
   * Get single department by ID
   */
  getById = async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenantId;
      const department = await this.departmentService.getById(
        req.params.id,
        tenantId,
      );

      res.status(200).json({
        success: true,
        data: department,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * PUT /api/v1/departments/:id
   * Update department
   */
  update = async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenantId;
      const userId = req.user.id;
      const department = await this.departmentService.update(
        req.params.id,
        req.body,
        tenantId,
        userId,
      );

      res.status(200).json({
        success: true,
        data: department,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * DELETE /api/v1/departments/:id
   * Soft delete (deactivate) department
   */
  delete = async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenantId;
      const userId = req.user.id;
      const result = await this.departmentService.delete(
        req.params.id,
        tenantId,
        userId,
      );

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * Standard error handler
   */
  _handleError(res, error) {
    const statusMap = {
      VALIDATION_ERROR: 400,
      DUPLICATE_ERROR: 409,
      NOT_FOUND: 404,
      FORBIDDEN: 403,
    };

    const status = statusMap[error.code] || 500;
    const response = {
      success: false,
      error: {
        code: error.code || "INTERNAL_ERROR",
        message: status === 500 ? "An internal error occurred" : error.message,
      },
    };

    if (status === 500) {
      console.error("[DepartmentController] Error:", error);
    }

    res.status(status).json(response);
  }
}

module.exports = new DepartmentController();
