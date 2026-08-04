const qmssyncjobService = require('../services/qms_sync_job_service');
const {
  CreateQmssyncjobSchema,
  UpdateQmssyncjobSchema,
  QmssyncjobParamsSchema
} = require('../validation/qms_sync_job.schema');

class QmssyncjobController {
  /**
   * Get all qmssyncjobs
   * GET /api/v1/qmssyncjobs
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, ...filters } = req.query;
      const skip = (page - 1) * limit;

      const result = await qmssyncjobService.findAll({
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
   * Get qmssyncjob by ID
   * GET /api/v1/qmssyncjobs/:id
   */
  async findById(req, res) {
    try {
      const { id } = QmssyncjobParamsSchema.parse(req.params);

      const qmssyncjob = await qmssyncjobService.findById(id);

      res.json({
        success: true,
        data: qmssyncjob
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
   * Create new qmssyncjob
   * POST /api/v1/qmssyncjobs
   */
  async create(req, res) {
    try {
      // Auto-populate triggered_by from authenticated user
      const dataToValidate = { ...req.body };
      if (req.user && req.user.id) {
        dataToValidate.triggered_by = req.user.id;
      }

      const validatedData = CreateQmssyncjobSchema.parse(dataToValidate);

      const qmssyncjob = await qmssyncjobService.create(validatedData);

      res.status(201).json({
        success: true,
        data: qmssyncjob,
        message: 'Qmssyncjob created successfully'
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
   * Update qmssyncjob
   * PUT /api/v1/qmssyncjobs/:id
   */
  async update(req, res) {
    try {
      const { id } = QmssyncjobParamsSchema.parse(req.params);
      const validatedData = UpdateQmssyncjobSchema.parse(req.body);

      const qmssyncjob = await qmssyncjobService.update(id, validatedData);

      res.json({
        success: true,
        data: qmssyncjob,
        message: 'Qmssyncjob updated successfully'
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
   * Delete qmssyncjob
   * DELETE /api/v1/qmssyncjobs/:id
   */
  async delete(req, res) {
    try {
      const { id } = QmssyncjobParamsSchema.parse(req.params);

      await qmssyncjobService.delete(id);

      res.json({
        success: true,
        message: 'Qmssyncjob deleted successfully'
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

module.exports = new QmssyncjobController();

