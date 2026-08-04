/**
 * Notification Category Controller
 * Handles both notification_categories and notification_codes
 */

const { getNotificationCategoryService } = require('../services/notification_category.service');

const resolveModuleId = (context = {}) => {
  const moduleId = (
    context.moduleId ||
    context.module_id ||
    context.req?.module?.id ||
    context.req?.user?.moduleId ||
    context.request?.module?.id ||
    context.request?.user?.moduleId ||
    context.user?.moduleId ||
    null
  );

  if (typeof moduleId !== 'string') return moduleId;
  const normalized = moduleId.trim();
  return normalized || null;
};

class NotificationCategoryController {

  // ── Categories ──────────────────────────────────────────────────────────────

  async getAllCategories(req, res) {
    try {
      const service = getNotificationCategoryService();
      const { limit, offset, search, include_inactive, module_id } = req.query;
      const result = await service.getAllCategories({
        includeInactive: include_inactive === 'true',
        limit: parseInt(limit) || 10,
        offset: parseInt(offset) || 0,
        search: search || '',
        module_id: module_id || null
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message } });
    }
  }

  async getCategoryById(req, res) {
    try {
      const service = getNotificationCategoryService();
      const category = await service.getCategoryById(req.params.id);
      if (!category) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
      res.json({ success: true, data: category });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message } });
    }
  }

  async createCategory(req, res) {
    try {
      const service = getNotificationCategoryService();
      const category = await service.createCategory(req.body, req.user.id);
      res.status(201).json({ success: true, data: category });
    } catch (err) {
      const status = err.message.includes('already exists') ? 409 : 500;
      res.status(status).json({ success: false, error: { code: 'CREATE_ERROR', message: err.message } });
    }
  }

  async updateCategory(req, res) {
    try {
      const service = getNotificationCategoryService();
      const category = await service.updateCategory(req.params.id, req.body, req.user.id);
      res.json({ success: true, data: category });
    } catch (err) {
      const status = err.message === 'Category not found' ? 404 : 500;
      res.status(status).json({ success: false, error: { code: 'UPDATE_ERROR', message: err.message } });
    }
  }

  async deleteCategory(req, res) {
    try {
      const service = getNotificationCategoryService();
      await service.deleteCategory(req.params.id);
      res.json({ success: true, data: { message: 'Category deleted' } });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, error: { code: 'DELETE_ERROR', message: err.message } });
    }
  }

  // Categories accessible to a tenant (platform + their modules)
  async getCategoriesForTenant(req, res) {
    try {
      const service = getNotificationCategoryService();
      const moduleId = resolveModuleId({
        module_id: req.query?.module_id,
        req
      });
      const categories = await service.getCategoriesForTenant(req.user.tenantId, req.user.id, moduleId);
      res.json({ success: true, data: categories });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message } });
    }
  }

  // ── Codes ───────────────────────────────────────────────────────────────────

  async getCodesByCategory(req, res) {
    try {
      const service = getNotificationCategoryService();
      // Accept both category UUID and category code as param
      let codes;
      const { categoryId } = req.params;
      const { limit, offset } = req.query;
      const options = { limit: parseInt(limit) || 10, offset: parseInt(offset) || 0 };
      if (categoryId.length === 36) {            // UUID
        codes = await service.getCodesByCategory(categoryId, options);
      } else {                                   // code string
        codes = await service.getCodesByCategoryCode(categoryId);
      }
      res.json({ success: true, ...(codes.data ? codes : { data: codes }) });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message } });
    }
  }

  async createCode(req, res) {
    try {
      const service = getNotificationCategoryService();
      const code = await service.createCode(req.params.categoryId, req.body, req.user.id);
      res.status(201).json({ success: true, data: code });
    } catch (err) {
      const status = err.message.includes('already exists') ? 409
        : err.message.includes('not found') ? 404
        : 500;
      res.status(status).json({ success: false, error: { code: 'CREATE_ERROR', message: err.message } });
    }
  }

  async updateCode(req, res) {
    try {
      const service = getNotificationCategoryService();
      const code = await service.updateCode(req.params.codeId, req.body);
      res.json({ success: true, data: code });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ success: false, error: { code: 'UPDATE_ERROR', message: err.message } });
    }
  }

  async deleteCode(req, res) {
    try {
      const service = getNotificationCategoryService();
      await service.deleteCode(req.params.codeId);
      res.json({ success: true, data: { message: 'Code deleted' } });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, error: { code: 'DELETE_ERROR', message: err.message } });
    }
  }
}

module.exports = new NotificationCategoryController();
