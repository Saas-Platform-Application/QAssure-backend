const usertenantService = require('../services/user_tenant_service');

class UsertenantController {
  /**
   * Get all usertenants
   * GET /api/v1/usertenants
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, ...filters } = req.query;
      const skip = (page - 1) * limit;
      
      const result = await usertenantService.findAll({
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
   * Get usertenant by ID
   * GET /api/v1/usertenants/:id
   */
  async findById(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      
      const usertenant = await usertenantService.findById(id);

      res.json({
        success: true,
        data: usertenant
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
   * Create new usertenant
   * POST /api/v1/usertenants
   */
  async create(req, res) {
    try {
      // req.body is already validated and transformed by validateCreate middleware
      const usertenant = await usertenantService.create(req.body);

      res.status(201).json({
        success: true,
        data: usertenant,
        message: 'Usertenant created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update usertenant
   * PUT /api/v1/usertenants/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      // req.body is already validated and transformed by validateUpdate middleware
      
      const usertenant = await usertenantService.update(id, req.body);

      res.json({
        success: true,
        data: usertenant,
        message: 'Usertenant updated successfully'
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
   * Delete usertenant
   * DELETE /api/v1/usertenants/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      
      await usertenantService.delete(id);

      res.json({
        success: true,
        message: 'Usertenant deleted successfully'
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

module.exports = new UsertenantController();

