const permissionService = require('../services/permission_service');

class PermissionController {
  /**
   * Get all permissions
   * GET /api/v1/permissions
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, ...filters } = req.query;
      const skip = (page - 1) * limit;
      
      const result = await permissionService.findAll({
        skip: parseInt(skip),
        take: parseInt(limit),
        where: filters,
        orderBy: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasMore: result.hasMore
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get permission by ID
   * GET /api/v1/permissions/:id
   */
  async findById(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      
      const permission = await permissionService.findById(id);

      res.json({
        success: true,
        data: permission
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Create new permission
   * POST /api/v1/permissions
   */
  async create(req, res) {
    try {
      // req.body is already validated and transformed by validateCreate middleware
      const permission = await permissionService.create(req.body);

      res.status(201).json({
        success: true,
        data: permission,
        message: 'Permission created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update permission
   * PUT /api/v1/permissions/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      // req.body is already validated and transformed by validateUpdate middleware
      
      const permission = await permissionService.update(id, req.body);

      res.json({
        success: true,
        data: permission,
        message: 'Permission updated successfully'
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Delete permission
   * DELETE /api/v1/permissions/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      
      await permissionService.delete(id);

      res.json({
        success: true,
        message: 'Permission deleted successfully'
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Get permission details
   * GET /api/v1/permissions/:permissionId
   */
  async findOne(req, res) {
    try {
      // Extract path parameters
      const permissionId = req.params.permissionId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await permissionService.findOne(permissionId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      } else if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

}

module.exports = new PermissionController();

