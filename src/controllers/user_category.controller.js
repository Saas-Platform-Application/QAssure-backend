/**
 * User Category Controller - QAssure Platform
 * Handles HTTP requests for tenant-scoped user category management
 */
const { getUserCategoryService } = require('../services/user_category.service');

class UserCategoryController {
  constructor() {
    this.userCategoryService = getUserCategoryService();
  }

  create = async (req, res) => {
    try {
      const category = await this.userCategoryService.create(req.body, req.user.tenantId, req.user.id);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  list = async (req, res) => {
    try {
      const { active_only, search } = req.query;
      const categories = await this.userCategoryService.list(req.user.tenantId, {
        active_only: active_only === 'true',
        search
      });
      res.status(200).json({ success: true, data: categories, total: categories.length });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  getById = async (req, res) => {
    try {
      const category = await this.userCategoryService.getById(req.params.id, req.user.tenantId);
      res.status(200).json({ success: true, data: category });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  update = async (req, res) => {
    try {
      const category = await this.userCategoryService.update(req.params.id, req.body, req.user.tenantId, req.user.id);
      res.status(200).json({ success: true, data: category });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  delete = async (req, res) => {
    try {
      const result = await this.userCategoryService.delete(req.params.id, req.user.tenantId, req.user.id);
      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  _handleError(res, error) {
    const statusMap = {
      'VALIDATION_ERROR': 400,
      'DUPLICATE_ERROR': 409,
      'NOT_FOUND': 404,
      'FORBIDDEN': 403
    };
    const status = statusMap[error.code] || 500;
    if (status === 500) console.error('[UserCategoryController] Error:', error);
    res.status(status).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: status === 500 ? 'An internal error occurred' : error.message
      }
    });
  }
}

module.exports = new UserCategoryController();
