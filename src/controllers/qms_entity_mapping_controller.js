const qmsentitymappingService = require('../services/qms_entity_mapping_service');
const {
  CreateQmsentitymappingSchema,
  UpdateQmsentitymappingSchema,
  QmsentitymappingParamsSchema
} = require('../validation/qms_entity_mapping.schema');

class QmsentitymappingController {
  /**
   * Get all qmsentitymappings
   * GET /api/v1/qmsentitymappings
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, ...filters } = req.query;
      const skip = (page - 1) * limit;

      const result = await qmsentitymappingService.findAll({
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
   * Get qmsentitymapping by ID
   * GET /api/v1/qmsentitymappings/:id
   */
  async findById(req, res) {
    try {
      const { id } = QmsentitymappingParamsSchema.parse(req.params);

      const qmsentitymapping = await qmsentitymappingService.findById(id);

      res.json({
        success: true,
        data: qmsentitymapping
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
   * Create new qmsentitymapping
   * POST /api/v1/qmsentitymappings
   */
  async create(req, res) {
    try {
      // Auto-populate from authenticated user
      const dataToValidate = { ...req.body };
      if (req.user) {
        if (req.user.id) dataToValidate.created_by = req.user.id;
        if (req.user.tenantId) dataToValidate.tenant_id = req.user.tenantId; // Using tenantId as per prev controller patterns
      }

      const validatedData = CreateQmsentitymappingSchema.parse(dataToValidate);

      const qmsentitymapping = await qmsentitymappingService.create(validatedData);

      res.status(201).json({
        success: true,
        data: qmsentitymapping,
        message: 'Qmsentitymapping created successfully'
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
   * Update qmsentitymapping
   * PUT /api/v1/qmsentitymappings/:id
   */
  async update(req, res) {
    try {
      const { id } = QmsentitymappingParamsSchema.parse(req.params);
      const validatedData = UpdateQmsentitymappingSchema.parse(req.body);

      const qmsentitymapping = await qmsentitymappingService.update(id, validatedData);

      res.json({
        success: true,
        data: qmsentitymapping,
        message: 'Qmsentitymapping updated successfully'
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
   * Delete qmsentitymapping
   * DELETE /api/v1/qmsentitymappings/:id
   */
  async delete(req, res) {
    try {
      const { id } = QmsentitymappingParamsSchema.parse(req.params);

      await qmsentitymappingService.delete(id);

      res.json({
        success: true,
        message: 'Qmsentitymapping deleted successfully'
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

module.exports = new QmsentitymappingController();

