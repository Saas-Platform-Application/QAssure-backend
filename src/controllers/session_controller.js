const sessionService = require('../services/session_service');

class SessionController {
  /**
   * Get all sessions
   * GET /api/v1/sessions
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, ...filters } = req.query;
      const skip = (page - 1) * limit;
      
      const result = await sessionService.findAll({
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
   * Get session by ID
   * GET /api/v1/sessions/:id
   */
  async findById(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      
      const session = await sessionService.findById(id);

      res.json({
        success: true,
        data: session
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
   * Create new session
   * POST /api/v1/sessions
   */
  async create(req, res) {
    try {
      // req.body is already validated and transformed by validateCreate middleware
      const data = { ...req.body };
      
      // If user_id is not provided, use the authenticated user's ID
      if (!data.user_id && req.user?.id) {
        data.user_id = req.user.id;
      }
      
      // If tenant_id is not provided, use the authenticated user's tenant_id
      if (!data.tenant_id && req.user?.tenantId) {
        data.tenant_id = req.user.tenantId;
      }
      
      const session = await sessionService.create(data);

      res.status(201).json({
        success: true,
        data: session,
        message: 'Session created successfully'
      });
    } catch (error) {
      if (error.message.includes('does not exist')) {
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
   * Update session
   * PUT /api/v1/sessions/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      // req.body is already validated and transformed by validateUpdate middleware
      
      const session = await sessionService.update(id, req.body);

      res.json({
        success: true,
        data: session,
        message: 'Session updated successfully'
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
   * Delete session
   * DELETE /api/v1/sessions/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      
      await sessionService.delete(id);

      res.json({
        success: true,
        message: 'Session deleted successfully'
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
   * Get session details
   * GET /api/v1/sessions/:sessionId
   */
  async findOne(req, res) {
    try {
      // Extract path parameters
      const sessionId = req.params.sessionId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await sessionService.findOne(sessionId);

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
   * Revoke session
   * DELETE /api/v1/sessions/:sessionId
   */
  async revoke(req, res) {
    try {
      // Extract path parameters
      const sessionId = req.params.sessionId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await sessionService.revoke(sessionId);

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
   * Revoke all user sessions
   * DELETE /api/v1/sessions/user/:userId
   */
  async revokeUserSessions(req, res) {
    try {
      // Extract path parameters
      const userId = req.params.userId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await sessionService.revokeUserSessions(userId);

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

}

module.exports = new SessionController();

