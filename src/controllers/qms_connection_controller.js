const qmsconnectionService = require('../services/qms_connection_service');
const {
  CreateQmsconnectionSchema,
  UpdateQmsconnectionSchema,
  QmsconnectionParamsSchema
} = require('../validation/qms_connection.schema');

class QmsconnectionController {
  /**
   * Get all qmsconnections
   * GET /api/v1/qmsconnections
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, ...filters } = req.query;
      const skip = (page - 1) * limit;

      const result = await qmsconnectionService.findAll({
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
   * Get qmsconnection by ID
   * GET /api/v1/qmsconnections/:id
   */
  async findById(req, res) {
    try {
      const { id } = QmsconnectionParamsSchema.parse(req.params);

      const qmsconnection = await qmsconnectionService.findById(id);

      res.json({
        success: true,
        data: qmsconnection
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
   * Create new qmsconnection
   * POST /api/v1/qmsconnections
   */
  async create(req, res) {
    try {
      // Auto-populate created_by from authenticated user
      const dataToValidate = { ...req.body };
      if (req.user && req.user.id) {
        dataToValidate.created_by = req.user.id;
      }

      const validatedData = CreateQmsconnectionSchema.parse(dataToValidate);

      const qmsconnection = await qmsconnectionService.create(validatedData);

      res.status(201).json({
        success: true,
        data: qmsconnection,
        message: 'Qmsconnection created successfully'
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
   * Update qmsconnection
   * PUT /api/v1/qmsconnections/:id
   */
  async update(req, res) {
    try {
      const { id } = QmsconnectionParamsSchema.parse(req.params);
      const validatedData = UpdateQmsconnectionSchema.parse(req.body);

      const qmsconnection = await qmsconnectionService.update(id, validatedData);

      res.json({
        success: true,
        data: qmsconnection,
        message: 'Qmsconnection updated successfully'
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
   * Delete qmsconnection
   * DELETE /api/v1/qmsconnections/:id
   */
  async delete(req, res) {
    try {
      const { id } = QmsconnectionParamsSchema.parse(req.params);

      await qmsconnectionService.delete(id);

      res.json({
        success: true,
        message: 'Qmsconnection deleted successfully'
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
   * Create QMS connection
   * POST /api/v1/qms/connections
   */
  async createConnection(req, res) {
    try {

      // Validate request body
      const bodySchema = CreateQmsconnectionSchema;
      const validatedData = bodySchema.parse(req.body);

      // Custom endpoint handler
      // Build service method call with parameters in correct order
      const result = await qmsconnectionService.createConnection(validatedData);

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
   * List QMS connections
   * GET /api/v1/qms/connections
   */
  async listConnections(req, res) {
    try {

      // Extract query parameters
      const queryParams = {
        page: req.query.page || undefined,
        limit: req.query.limit || undefined,
        tenantId: req.query.tenantId || undefined,
        qmsType: req.query.qmsType || undefined,
      };

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await qmsconnectionService.listConnections(queryParams);

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
   * Get QMS connection
   * GET /api/v1/qms/connections/:connectionId
   */
  async getConnection(req, res) {
    try {
      // Extract path parameters
      const connectionId = req.params.connectionId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await qmsconnectionService.getConnection(connectionId);

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
   * Update QMS connection
   * PUT /api/v1/qms/connections/:connectionId
   */
  async updateConnection(req, res) {
    try {
      // Extract path parameters
      const connectionId = req.params.connectionId;

      // Validate request body
      const bodySchema = UpdateQmsconnectionSchema;
      const validatedData = bodySchema.parse(req.body);

      // Custom endpoint handler
      // Build service method call with parameters in correct order
      const result = await qmsconnectionService.updateConnection(connectionId, validatedData);

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
   * Delete QMS connection
   * DELETE /api/v1/qms/connections/:connectionId
   */
  async deleteConnection(req, res) {
    try {
      // Extract path parameters
      const connectionId = req.params.connectionId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await qmsconnectionService.deleteConnection(connectionId);

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
   * Test QMS connection
   * POST /api/v1/qms/connections/:connectionId/test
   */
  async testConnection(req, res) {
    try {
      // Extract path parameters
      const connectionId = req.params.connectionId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await qmsconnectionService.testConnection(connectionId);

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
   * Trigger sync job
   * POST /api/v1/qms/sync
   */
  async triggerSync(req, res) {
    try {

      // Validate request body
      const bodySchema = CreateQmsconnectionSchema;
      const validatedData = bodySchema.parse(req.body);

      // Custom endpoint handler
      // Build service method call with parameters in correct order
      const result = await qmsconnectionService.triggerSync(validatedData);

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
   * Get sync job status
   * GET /api/v1/qms/sync/:jobId
   */
  async getSyncJob(req, res) {
    try {
      // Extract path parameters
      const jobId = req.params.jobId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await qmsconnectionService.getSyncJob(jobId);

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
   * List sync jobs
   * GET /api/v1/qms/sync
   */
  async listSyncJobs(req, res) {
    try {

      // Extract query parameters
      const queryParams = {
        page: req.query.page || undefined,
        limit: req.query.limit || undefined,
        connectionId: req.query.connectionId || undefined,
        status: req.query.status || undefined,
      };

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await qmsconnectionService.listSyncJobs(queryParams);

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
   * Cancel sync job
   * POST /api/v1/qms/sync/:jobId/cancel
   */
  async cancelSync(req, res) {
    try {
      // Extract path parameters
      const jobId = req.params.jobId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await qmsconnectionService.cancelSync(jobId);

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
   * List sync conflicts
   * GET /api/v1/qms/conflicts
   */
  async listConflicts(req, res) {
    try {

      // Extract query parameters
      const queryParams = {
        page: req.query.page || undefined,
        limit: req.query.limit || undefined,
        connectionId: req.query.connectionId || undefined,
        status: req.query.status || undefined,
      };

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await qmsconnectionService.listConflicts(queryParams);

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
   * Get conflict details
   * GET /api/v1/qms/conflicts/:conflictId
   */
  async getConflict(req, res) {
    try {
      // Extract path parameters
      const conflictId = req.params.conflictId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await qmsconnectionService.getConflict(conflictId);

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
   * Resolve sync conflict
   * POST /api/v1/qms/conflicts/:conflictId/resolve
   */
  async resolveConflict(req, res) {
    try {
      // Extract path parameters
      const conflictId = req.params.conflictId;

      // Validate request body
      const bodySchema = CreateQmsconnectionSchema;
      const validatedData = bodySchema.parse(req.body);

      // Custom endpoint handler
      // Build service method call with parameters in correct order
      const result = await qmsconnectionService.resolveConflict(conflictId, validatedData);

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
   * Handle QMS webhook
   * POST /api/v1/qms/webhooks
   */
  async handleWebhook(req, res) {
    try {

      // Validate request body
      const bodySchema = CreateQmsconnectionSchema;
      const validatedData = bodySchema.parse(req.body);

      // Custom endpoint handler
      // Build service method call with parameters in correct order
      const result = await qmsconnectionService.handleWebhook(validatedData);

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

}

module.exports = new QmsconnectionController();

