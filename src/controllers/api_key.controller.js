/**
 * API Key Controller - QAssure Platform
 * Handles API key management endpoints
 */
const { getApiKeyService } = require('../services/api_key.service');

class ApiKeyController {
  constructor() {
    this.apiKeyService = getApiKeyService();
  }

  /**
   * POST /api/v1/api-keys
   * Create new API key
   */
  create = async (req, res) => {
    try {
      // req.body is already validated and transformed by validateCreate middleware
      const { name, description, permissions, expires_at } = req.body;

      const result = await this.apiKeyService.create(
        { name, description, permissions, expires_at },
        req.user.id,
        req.user.tenantId
      );

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/api-keys
   * List API keys
   */
  list = async (req, res) => {
    try {
      const { page = 1, limit = 20, status } = req.query;

      const result = await this.apiKeyService.list(req.user.tenantId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/api-keys/:id
   * Get API key by ID
   */
  getById = async (req, res) => {
    try {
      const { id } = req.params; // Already validated by validateParams middleware

      const apiKey = await this.apiKeyService.getById(id, req.user.tenantId);

      res.status(200).json({
        success: true,
        data: apiKey
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * PUT /api/v1/api-keys/:id
   * Update API key
   */
  update = async (req, res) => {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      // req.body is already validated and transformed by validateUpdate middleware
      const { name, description, status } = req.body;

      const result = await this.apiKeyService.update(id, req.user.tenantId, {
        name,
        description,
        status
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'API key updated successfully'
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/api-keys/:id/revoke
   * Revoke API key
   */
  revoke = async (req, res) => {
    try {
      const { id } = req.params; // Already validated by validateParams middleware

      const result = await this.apiKeyService.revoke(id, req.user.tenantId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * DELETE /api/v1/api-keys/:id
   * Delete API key permanently
   */
  delete = async (req, res) => {
    try {
      const { id } = req.params; // Already validated by validateParams middleware

      const result = await this.apiKeyService.delete(id, req.user.tenantId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/api-keys/:id/regenerate
   * Regenerate API key
   */
  regenerate = async (req, res) => {
    try {
      const { id } = req.params; // Already validated by validateParams middleware

      const result = await this.apiKeyService.regenerate(id, req.user.tenantId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/api-keys/validate
   * Validate an API key (for testing)
   */
  validate = async (req, res) => {
    try {
      // req.body is already validated and transformed by validateKey middleware
      const { key } = req.body;

      const result = await this.apiKeyService.validate(key);

      if (!result.valid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: result.error
          }
        });
      }

      res.status(200).json({
        success: true,
        data: {
          valid: true,
          key_id: result.apiKey.id,
          name: result.apiKey.name,
          tenant_id: result.apiKey.tenantId
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * Handle errors
   */
  _handleError(res, error) {
    console.error('[ApiKeyController] Error:', error);

    if (error.message === 'API key not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred'
      }
    });
  }
}

module.exports = new ApiKeyController();
