const apikeyService = require('../services/api_key_service');
const { 
  CreateApikeySchema, 
  UpdateApikeySchema,
  ApikeyParamsSchema 
} = require('../validation/api_key.schema');

class ApikeyController {
  /**
   * Get all apikeies
   * GET /api/v1/apikeies
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, ...filters } = req.query;
      const skip = (page - 1) * limit;
      
      const result = await apikeyService.findAll({
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
   * Get apikey by ID
   * GET /api/v1/apikeies/:id
   */
  async findById(req, res) {
    try {
      const { id } = ApikeyParamsSchema.parse(req.params);
      
      const apikey = await apikeyService.findById(id);

      res.json({
        success: true,
        data: apikey
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
   * Create new apikey
   * POST /api/v1/apikeies
   */
  async create(req, res) {
    try {
      const validatedData = CreateApikeySchema.parse(req.body);
      
      const apikey = await apikeyService.create(validatedData);

      res.status(201).json({
        success: true,
        data: apikey,
        message: 'Apikey created successfully'
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
   * Update apikey
   * PUT /api/v1/apikeies/:id
   */
  async update(req, res) {
    try {
      const { id } = ApikeyParamsSchema.parse(req.params);
      const validatedData = UpdateApikeySchema.parse(req.body);
      
      const apikey = await apikeyService.update(id, validatedData);

      res.json({
        success: true,
        data: apikey,
        message: 'Apikey updated successfully'
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
   * Delete apikey
   * DELETE /api/v1/apikeies/:id
   */
  async delete(req, res) {
    try {
      const { id } = ApikeyParamsSchema.parse(req.params);
      
      await apikeyService.delete(id);

      res.json({
        success: true,
        message: 'Apikey deleted successfully'
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
   * Get API key details
   * GET /api/v1/api-keys/:keyId
   */
  async findOne(req, res) {
    try {
      // Extract path parameters
      const keyId = req.params.keyId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await apikeyService.findOne(keyId);

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
   * Revoke API key
   * POST /api/v1/api-keys/:keyId/revoke
   */
  async revoke(req, res) {
    try {
      // Extract path parameters
      const keyId = req.params.keyId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await apikeyService.revoke(keyId);

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
   * Rotate API key
   * POST /api/v1/api-keys/:keyId/rotate
   */
  async rotate(req, res) {
    try {
      // Extract path parameters
      const keyId = req.params.keyId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await apikeyService.rotate(keyId);

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
   * Get API key usage stats
   * GET /api/v1/api-keys/:keyId/usage
   */
  async getUsage(req, res) {
    try {
      // Extract path parameters
      const keyId = req.params.keyId;
      
      // Extract query parameters
      const queryParams = {
        startDate: req.query.startDate || undefined,
        endDate: req.query.endDate || undefined,
      };

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await apikeyService.getUsage(keyId, queryParams);

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

module.exports = new ApikeyController();

