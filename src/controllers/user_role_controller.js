const userroleService = require('../services/user_role_service');
const { formatError, getErrorStatusCode } = require('../utils/errorFormatter');

class UserroleController {
  /**
   * Get all userroles
   * GET /api/v1/userroles
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, ...filters } = req.query;
      const skip = (page - 1) * limit;
      
      const result = await userroleService.findAll({
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
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse
      });
    }
  }

  /**
   * Get userrole by ID
   * GET /api/v1/userroles/:id
   */
  async findById(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      
      const userrole = await userroleService.findById(id);

      res.json({
        success: true,
        data: userrole
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
          success: false,
        error: errorResponse
        });
    }
  }

  /**
   * Create new userrole
   * POST /api/v1/userroles
   */
  async create(req, res) {
    try {
      // req.body is already validated and transformed by validateCreate middleware
      const userrole = await userroleService.create(req.body);

      res.status(201).json({
        success: true,
        data: userrole,
        message: 'Userrole created successfully'
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
        ...(error.errors && { details: error.errors }),
        ...(error.issues && { details: error.issues })
      });
    }
  }

  /**
   * Update userrole
   * PUT /api/v1/userroles/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      // req.body is already validated and transformed by validateUpdate middleware
      
      const userrole = await userroleService.update(id, req.body);

      res.json({
        success: true,
        data: userrole,
        message: 'Userrole updated successfully'
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
          success: false,
        error: errorResponse,
        ...(error.errors && { details: error.errors }),
        ...(error.issues && { details: error.issues })
      });
    }
  }

  /**
   * Delete userrole
   * DELETE /api/v1/userroles/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      
      await userroleService.delete(id);

      res.json({
        success: true,
        message: 'Userrole deleted successfully'
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
          success: false,
        error: errorResponse
        });
    }
  }

}

module.exports = new UserroleController();

