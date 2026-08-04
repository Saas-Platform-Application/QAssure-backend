const eventlogService = require('../services/event_log_service');

class EventlogController {
  /**
   * Get all eventlogs
   * GET /api/v1/eventlogs
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, ...filters } = req.query;
      const skip = (page - 1) * limit;
      
      const result = await eventlogService.findAll({
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
   * Get eventlog by ID
   * GET /api/v1/eventlogs/:id
   */
  async findById(req, res) {
    try {
      const eventlog = await eventlogService.findById(req.params.id);

      res.json({
        success: true,
        data: eventlog
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
   * Create new eventlog
   * POST /api/v1/eventlogs
   */
  async create(req, res) {
    try {
      // Auto-populate correlation_id from request context if not provided
      if (!req.body.correlation_id && req.correlationId) {
        req.body.correlation_id = req.correlationId;
      }
      
      const eventlog = await eventlogService.create(req.body);

      res.status(201).json({
        success: true,
        data: eventlog,
        message: 'Eventlog created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update eventlog
   * PUT /api/v1/eventlogs/:id
   */
  async update(req, res) {
    try {
      const eventlog = await eventlogService.update(req.params.id, req.body);

      res.json({
        success: true,
        data: eventlog,
        message: 'Eventlog updated successfully'
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
   * Delete eventlog
   * DELETE /api/v1/eventlogs/:id
   */
  async delete(req, res) {
    try {
      await eventlogService.delete(req.params.id);

      res.json({
        success: true,
        message: 'Eventlog deleted successfully'
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
   * Get event details
   * GET /api/v1/events/:eventId
   */
  async findOne(req, res) {
    try {
      const result = await eventlogService.findOne(req.params.eventId);

      res.status(200).json({
        success: true,
        data: result
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
   * Publish event
   * POST /api/v1/events/publish
   */
  async publish(req, res) {
    try {
      const result = await eventlogService.publish(req.body);
      
      res.status(201).json({
        success: true,
        data: result
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

module.exports = new EventlogController();

