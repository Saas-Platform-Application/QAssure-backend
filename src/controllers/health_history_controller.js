const healthhistoryService = require('../services/health_history_service');
const { 
  CreateHealthhistorySchema, 
  UpdateHealthhistorySchema,
  HealthhistoryParamsSchema 
} = require('../validation/health_history.schema');

class HealthhistoryController {
  /**
   * Get all healthhistories
   * GET /api/v1/healthhistories
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, ...filters } = req.query;
      const skip = (page - 1) * limit;
      
      const result = await healthhistoryService.findAll({
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
   * Get healthhistory by ID
   * GET /api/v1/healthhistories/:id
   */
  async findById(req, res) {
    try {
      const { id } = HealthhistoryParamsSchema.parse(req.params);
      
      const healthhistory = await healthhistoryService.findById(id);

      res.json({
        success: true,
        data: healthhistory
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
   * Create new healthhistory
   * POST /api/v1/healthhistories
   */
  async create(req, res) {
    try {
      const validatedData = CreateHealthhistorySchema.parse(req.body);
      
      const healthhistory = await healthhistoryService.create(validatedData);

      res.status(201).json({
        success: true,
        data: healthhistory,
        message: 'Healthhistory created successfully'
      });
    } catch (error) {
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
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
   * Update healthhistory
   * PUT /api/v1/healthhistories/:id
   */
  async update(req, res) {
    try {
      const { id } = HealthhistoryParamsSchema.parse(req.params);
      const validatedData = UpdateHealthhistorySchema.parse(req.body);
      
      const healthhistory = await healthhistoryService.update(id, validatedData);

      res.json({
        success: true,
        data: healthhistory,
        message: 'Healthhistory updated successfully'
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
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
   * Delete healthhistory
   * DELETE /api/v1/healthhistories/:id
   */
  async delete(req, res) {
    try {
      const { id } = HealthhistoryParamsSchema.parse(req.params);
      
      await healthhistoryService.delete(id);

      res.json({
        success: true,
        message: 'Healthhistory deleted successfully'
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

module.exports = new HealthhistoryController();

