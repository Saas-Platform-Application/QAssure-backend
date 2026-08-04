const healthcheckService = require('../services/health_check_service');
const { 
  CreateHealthcheckSchema, 
  UpdateHealthcheckSchema,
  HealthcheckParamsSchema 
} = require('../validation/health_check.schema');

class HealthcheckController {
  /**
   * Get all healthchecks
   * GET /api/v1/healthchecks
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, ...filters } = req.query;
      const skip = (page - 1) * limit;
      
      const result = await healthcheckService.findAll({
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
   * Get healthcheck by ID
   * GET /api/v1/healthchecks/:id
   */
  async findById(req, res) {
    try {
      const { id } = HealthcheckParamsSchema.parse(req.params);
      
      const healthcheck = await healthcheckService.findById(id);

      res.json({
        success: true,
        data: healthcheck
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
   * Create new healthcheck
   * POST /api/v1/healthchecks
   */
  async create(req, res) {
    try {
      const validatedData = CreateHealthcheckSchema.parse(req.body);
      
      const healthcheck = await healthcheckService.create(validatedData);

      res.status(201).json({
        success: true,
        data: healthcheck,
        message: 'Healthcheck created successfully'
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
   * Update healthcheck
   * PUT /api/v1/healthchecks/:id
   */
  async update(req, res) {
    try {
      const { id } = HealthcheckParamsSchema.parse(req.params);
      const validatedData = UpdateHealthcheckSchema.parse(req.body);
      
      const healthcheck = await healthcheckService.update(id, validatedData);

      res.json({
        success: true,
        data: healthcheck,
        message: 'Healthcheck updated successfully'
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
   * Delete healthcheck
   * DELETE /api/v1/healthchecks/:id
   */
  async delete(req, res) {
    try {
      const { id } = HealthcheckParamsSchema.parse(req.params);
      
      await healthcheckService.delete(id);

      res.json({
        success: true,
        message: 'Healthcheck deleted successfully'
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
   * Get system health
   * GET /api/v1/health
   */
  async getSystemHealth(req, res) {
    try {

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await healthcheckService.getSystemHealth();

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

  /**
   * Get all modules health
   * GET /api/v1/health/modules
   */
  async getModulesHealth(req, res) {
    try {
      
      // Extract query parameters
      const queryParams = {
        status: req.query.status || undefined,
      };

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await healthcheckService.getModulesHealth(queryParams);

      res.status(200).json({
        success: true,
        data: Array.isArray(result) ? result : [result]
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

  /**
   * Get module health
   * GET /api/v1/health/modules/:moduleId
   */
  async getModuleHealth(req, res) {
    try {
      // Extract path parameters
      const moduleId = req.params.moduleId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await healthcheckService.getModuleHealth(moduleId);

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

  /**
   * Get module health history
   * GET /api/v1/health/modules/:moduleId/history
   */
  async getHealthHistory(req, res) {
    try {
      // Extract path parameters
      const moduleId = req.params.moduleId;
      
      // Extract query parameters
      const queryParams = {
        startDate: req.query.startDate || undefined,
        endDate: req.query.endDate || undefined,
        limit: req.query.limit || undefined,
      };

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await healthcheckService.getHealthHistory(moduleId, queryParams);

      res.status(200).json({
        success: true,
        data: Array.isArray(result) ? result : [result]
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

  /**
   * Trigger health check
   * POST /api/v1/health/modules/:moduleId/check
   */
  async triggerHealthCheck(req, res) {
    try {
      // Extract path parameters
      const moduleId = req.params.moduleId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await healthcheckService.triggerHealthCheck(moduleId);

      res.status(201).json({
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

  /**
   * Get platform components health
   * GET /api/v1/health/components
   */
  async getComponentsHealth(req, res) {
    try {

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await healthcheckService.getComponentsHealth();

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

module.exports = new HealthcheckController();

