const moduleService = require('../services/module_service');
const { 
  CreateModuleSchema, 
  UpdateModuleSchema,
  ModuleParamsSchema 
} = require('../validation/module.schema');

class ModuleController {
  /**
   * Get all modules
   * GET /api/v1/modules
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, ...filters } = req.query;
      const skip = (page - 1) * limit;
      
      const result = await moduleService.findAll({
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
   * Get module by ID
   * GET /api/v1/modules/:id
   */
  async findById(req, res) {
    try {
      const { id } = ModuleParamsSchema.parse(req.params);
      
      const module = await moduleService.findById(id);

      res.json({
        success: true,
        data: module
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
   * Create new module
   * POST /api/v1/modules
   */
  async create(req, res) {
    try {
      const validatedData = CreateModuleSchema.parse(req.body);
      
      const module = await moduleService.create(validatedData);

      res.status(201).json({
        success: true,
        data: module,
        message: 'Module created successfully'
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
   * Update module
   * PUT /api/v1/modules/:id
   */
  async update(req, res) {
    try {
      const { id } = ModuleParamsSchema.parse(req.params);
      const validatedData = UpdateModuleSchema.parse(req.body);
      
      const module = await moduleService.update(id, validatedData);

      res.json({
        success: true,
        data: module,
        message: 'Module updated successfully'
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
   * Delete module
   * DELETE /api/v1/modules/:id
   */
  async delete(req, res) {
    try {
      const { id } = ModuleParamsSchema.parse(req.params);
      
      await moduleService.delete(id);

      res.json({
        success: true,
        message: 'Module deleted successfully'
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
   * Register new module
   * POST /api/v1/modules/register
   */
  async register(req, res) {
    try {

      // Validate request body
      const bodySchema = CreateModuleSchema;
      const validatedData = bodySchema.parse(req.body);
      
      // Custom endpoint handler
      // Build service method call with parameters in correct order
      const result = await moduleService.register(validatedData);
      
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
   * Get module details
   * GET /api/v1/modules/:moduleId
   */
  async findOne(req, res) {
    try {
      // Extract path parameters
      const moduleId = req.params.moduleId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await moduleService.findOne(moduleId);

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
   * Update module status
   * PUT /api/v1/modules/:moduleId/status
   */
  async updateStatus(req, res) {
    try {
      // Extract path parameters
      const moduleId = req.params.moduleId;

      // Validate request body
      const bodySchema = UpdateModuleSchema;
      const validatedData = bodySchema.parse(req.body);
      
      // Custom endpoint handler
      // Build service method call with parameters in correct order
      const result = await moduleService.updateStatus(moduleId, validatedData);
      
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
   * Get module health
   * GET /api/v1/modules/:moduleId/health
   */
  async getHealth(req, res) {
    try {
      // Extract path parameters
      const moduleId = req.params.moduleId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await moduleService.getHealth(moduleId);

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

module.exports = new ModuleController();

