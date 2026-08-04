const apikeypermissionService = require('../services/api_key_permission_service');

class ApikeypermissionController {
  /**
   * Get all apikeypermissions
   * GET /api/v1/apikeypermissions
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, ...filters } = req.query;
      const skip = (page - 1) * limit;
      
      const result = await apikeypermissionService.findAll({
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
   * Get apikeypermission by ID
   * GET /api/v1/apikeypermissions/:id
   */
  async findById(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      
      const apikeypermission = await apikeypermissionService.findById(id);

      res.json({
        success: true,
        data: apikeypermission
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
   * Create new apikeypermission
   * POST /api/v1/apikeypermissions
   */
  async create(req, res) {
    try {
      // req.body is already validated and transformed by validateCreate middleware
      const apikeypermission = await apikeypermissionService.create(req.body);

      res.status(201).json({
        success: true,
        data: apikeypermission,
        message: 'Apikeypermission created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update apikeypermission
   * PUT /api/v1/apikeypermissions/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      // req.body is already validated and transformed by validateUpdate middleware
      
      const apikeypermission = await apikeypermissionService.update(id, req.body);

      res.json({
        success: true,
        data: apikeypermission,
        message: 'Apikeypermission updated successfully'
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
   * Delete apikeypermission
   * DELETE /api/v1/apikeypermissions/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      
      await apikeypermissionService.delete(id);

      res.json({
        success: true,
        message: 'Apikeypermission deleted successfully'
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

}

module.exports = new ApikeypermissionController();

