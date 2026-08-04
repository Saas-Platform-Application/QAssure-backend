const AuditLogResourceTypeService = require('../services/audit_log_resource_type_service');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class AuditLogResourceTypeController {
  async getAll(req, res) {
    try {
      const { page = 1, limit = 50, search, type, module_id, sort = 'asc' } = req.query;
      const skip = (page - 1) * limit;
      const where = {};

      if (search) {
        where.name = { [Op.iLike]: `%${search}%` };
      }
      if (type) {
        where.type = type;
      }
      if (module_id) {
        where.module_id = module_id;
      }

      // Handle custom sorting logic case-insensitively and with trimming for names
      let orderBy;
      switch (sort) {
        case 'asc':
          orderBy = [sequelize.fn('lower', sequelize.fn('trim', sequelize.col('AuditLogResourceType.name'))), 'ASC'];
          break;
        case 'desc':
          orderBy = [sequelize.fn('lower', sequelize.fn('trim', sequelize.col('AuditLogResourceType.name'))), 'DESC'];
          break;
        case 'oldest':
          orderBy = ['created_at', 'ASC'];
          break;
        case 'newest':
        default:
          orderBy = ['created_at', 'DESC'];
          break;
      }

      const result = await AuditLogResourceTypeService.getAll({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: [orderBy]
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(result.total / limit),
          hasMore: result.hasMore
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getDropdown(req, res) {
    try {
      // If tenant_id provided via query, use it (for super_admin to view for a specific tenant)
      // Otherwise, use the acting user's tenantId
      const tenantId = req.query.tenant_id || req.user?.tenantId;
      const data = await AuditLogResourceTypeService.getDropdownOptions(tenantId, req.user, req.module);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async create(req, res) {
    try {
      const data = await AuditLogResourceTypeService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async update(req, res) {
    try {
      const data = await AuditLogResourceTypeService.update(req.params.id, req.body);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async delete(req, res) {
    try {
      await AuditLogResourceTypeService.delete(req.params.id);
      res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
      // Propagate typed status codes (409 RESOURCE_IN_USE, 404 not found, etc.)
      const status = err.statusCode || 400;
      res.status(status).json({ success: false, error: err.message, code: err.code });
    }
  }
}

module.exports = new AuditLogResourceTypeController();
