/**
 * File Category Controller - QAssure Platform
 * Handles API endpoints for file categories
 */
const { getFileCategoryService } = require('../services/file-category.service');

class FileCategoryController {
  /**
   * GET /api/v1/files/categories
   */
  async list(req, res) {
    try {
      const service = getFileCategoryService();
      const tenantId = req.user.tenantId;

      const categories = await service.list(tenantId);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('[FileCategory] List error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/files/categories
   */
  async create(req, res) {
    try {
      const service = getFileCategoryService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;

      const category = await service.create(req.body, tenantId, userId);

      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('[FileCategory] Create error:', error.message);
      const status = error.code === 'DUPLICATE_ERROR' ? 409 : (error.code === 'VALIDATION_ERROR' ? 400 : 500);
      res.status(status).json({
        success: false,
        error: { code: error.code || 'CREATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/files/categories/:id
   */
  async getById(req, res) {
    try {
      const service = getFileCategoryService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const category = await service.getById(id, tenantId);

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('[FileCategory] Get error:', error.message);
      const status = error.code === 'NOT_FOUND' ? 404 : 500;
      res.status(status).json({
        success: false,
        error: { code: error.code || 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * PUT /api/v1/files/categories/:id
   */
  async update(req, res) {
    try {
      const service = getFileCategoryService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { id } = req.params;

      const category = await service.update(id, req.body, tenantId, userId);

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('[FileCategory] Update error:', error.message);
      const status = error.code === 'NOT_FOUND' ? 404 : (error.code === 'VALIDATION_ERROR' ? 400 : 500);
      res.status(status).json({
        success: false,
        error: { code: error.code || 'UPDATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * DELETE /api/v1/files/categories/:id
   */
  async delete(req, res) {
    try {
      const service = getFileCategoryService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const result = await service.delete(id, tenantId);

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      console.error('[FileCategory] Delete error:', error.message);
      const status = error.code === 'VALIDATION_ERROR' ? 400 : 500;
      res.status(status).json({
        success: false,
        error: { code: error.code || 'DELETE_ERROR', message: error.message }
      });
    }
  }
}

module.exports = new FileCategoryController();
