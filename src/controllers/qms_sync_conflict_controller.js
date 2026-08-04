const qmssyncconflictService = require('../services/qms_sync_conflict_service');
const {
  CreateQmssyncconflictSchema,
  UpdateQmssyncconflictSchema,
  QmssyncconflictParamsSchema
} = require('../validation/qms_sync_conflict.schema');

class QmssyncconflictController {
  /**
   * Get all qmssyncconflicts
   * GET /api/v1/qmssyncconflicts
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, ...filters } = req.query;
      const skip = (page - 1) * limit;

      const result = await qmssyncconflictService.findAll({
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
   * Get qmssyncconflict by ID
   * GET /api/v1/qmssyncconflicts/:id
   */
  async findById(req, res) {
    try {
      const { id } = QmssyncconflictParamsSchema.parse(req.params);

      const qmssyncconflict = await qmssyncconflictService.findById(id);

      res.json({
        success: true,
        data: qmssyncconflict
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
   * Create new qmssyncconflict
   * POST /api/v1/qmssyncconflicts
   */
  async create(req, res) {
    try {
      // Auto-populate tenant_id from authenticated user
      const dataToValidate = { ...req.body };
      if (req.user && req.user.tenantId) {
        dataToValidate.tenant_id = req.user.tenantId;
      }

      const validatedData = CreateQmssyncconflictSchema.parse(dataToValidate);

      const qmssyncconflict = await qmssyncconflictService.create(validatedData);

      res.status(201).json({
        success: true,
        data: qmssyncconflict,
        message: 'Qmssyncconflict created successfully'
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
   * Update qmssyncconflict
   * PUT /api/v1/qmssyncconflicts/:id
   */
  async update(req, res) {
    try {
      const { id } = QmssyncconflictParamsSchema.parse(req.params);
      const validatedData = UpdateQmssyncconflictSchema.parse(req.body);

      const qmssyncconflict = await qmssyncconflictService.update(id, validatedData);

      res.json({
        success: true,
        data: qmssyncconflict,
        message: 'Qmssyncconflict updated successfully'
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
   * Delete qmssyncconflict
   * DELETE /api/v1/qmssyncconflicts/:id
   */
  async delete(req, res) {
    try {
      const { id } = QmssyncconflictParamsSchema.parse(req.params);

      await qmssyncconflictService.delete(id);

      res.json({
        success: true,
        message: 'Qmssyncconflict deleted successfully'
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

module.exports = new QmssyncconflictController();

