/**
 * Auth Controller - QAssure Platform
 * Handles authentication HTTP requests
 */
const { getAuthService, AuthError } = require('../services/auth.service');
const { formatError, getErrorStatusCode } = require('../utils/errorFormatter');

class AuthController {
  constructor() {
    this.authService = getAuthService();
  }

  /**
   * POST /auth/register
   * Register new user
   */
  register = async (req, res) => {
    try {
      const { email, password, first_name, last_name, firstName, lastName, tenant_id } = req.body;
      
      // Support both camelCase and snake_case
      const finalFirstName = first_name || firstName;
      const finalLastName = last_name || lastName;

      const result = await this.authService.register({
        email,
        password,
        first_name: finalFirstName,
        last_name: finalLastName,
        tenant_id
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /auth/verify-email
   * Verify email with token
   */
  verifyEmail = async (req, res) => {
    try {
      const { token } = req.body;

      const result = await this.authService.verifyEmail(token);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /auth/resend-verification
   * Resend verification email
   */
  resendVerification = async (req, res) => {
    try {
      const { email } = req.body;

      const result = await this.authService.resendVerification(email);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /auth/forgot-password
   * Request password reset
   */
  forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;

      const result = await this.authService.forgotPassword(email);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /auth/reset-password
   * Reset password with token
   */
  resetPassword = async (req, res) => {
    try {
      const { token, password } = req.body;

      const result = await this.authService.resetPassword(token, password);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /auth/change-password
   * Change password (authenticated)
   */
  changePassword = async (req, res) => {
    try {
      const { current_password, new_password } = req.body;

      const result = await this.authService.changePassword(
        req.user.id,
        current_password,
        new_password
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /auth/login
   * Login with email and password
   */
  login = async (req, res) => {
    try {
      const { email, password, tenant_id } = req.body;

      const result = await this.authService.login(email, password, tenant_id);

      // Handle password reset challenge
      if (result.requirePasswordReset) {
        return res.status(200).json({
          success: true,
          data: result
        });
      }

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          tenant_id: result.tenantId,
          tenant: result.tenant || null,
          roles: result.roles,
          role_module_combinations: result.role_module_combinations,
          permissions: result.permissions || [],
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          token_type: result.tokenType,
          expires_in: result.expiresIn,
          expires_at: result.expiresAt
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  refresh = async (req, res) => {
    try {
      const { refresh_token } = req.body;

      const result = await this.authService.refreshToken(refresh_token);

      res.status(200).json({
        success: true,
        data: {
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          token_type: result.tokenType,
          expires_in: result.expiresIn,
          expires_at: result.expiresAt
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /auth/logout
   * Logout current session
   */
  logout = async (req, res) => {
    try {
      await this.authService.logout(req.user.sessionId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /auth/logout-all
   * Logout from all sessions
   */
  logoutAll = async (req, res) => {
    try {
      await this.authService.logoutAll(req.user.id);

      res.status(200).json({
        success: true,
        message: 'Logged out from all sessions'
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /auth/me
   * Get current user info
   */
  me = async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            email: req.user.email,
            tenant_id: req.user.tenantId,
            roles: req.user.roles,
            permissions: req.user.permissions
          },
          session: {
            id: req.user.sessionId
          }
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /auth/sessions
   * Get user's active sessions
   */
  sessions = async (req, res) => {
    try {
      const sessions = await this.authService.getActiveSessions(req.user.id);

      res.status(200).json({
        success: true,
        data: {
          sessions,
          current_session_id: req.user.sessionId
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * DELETE /auth/sessions/:sessionId
   * Revoke a specific session
   */
  revokeSession = async (req, res) => {
    try {
      const { sessionId } = req.params;

      await this.authService.logout(sessionId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Session revoked successfully'
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /auth/validate
   * Validate current token/session
   */
  validate = async (req, res) => {
    try {
      const sessionValid = await this.authService.validateSession(
        req.user.sessionId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: {
          valid: sessionValid.valid,
          user_id: req.user.id,
          tenant_id: req.user.tenantId,
          session: sessionValid.session
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /auth/service-token
   * Generate a long-lived service token from an existing access token
   */
  createServiceToken = async (req, res) => {
    try {
      const { duration, access_token, accessToken } = req.body;
      const targetToken = access_token || accessToken || this.authService.jwtService.extractToken(req.headers.authorization);

      if (!targetToken) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_TOKEN', message: 'Access token is required in body or Authorization header' }
        });
      }

      // Verify the target token
      const verifyResult = this.authService.jwtService.verifyAccessToken(targetToken);
      if (!verifyResult.valid) {
        return res.status(401).json({
          success: false,
          error: { code: verifyResult.error.code, message: verifyResult.error.message }
        });
      }

      const { userId, email, tenantId, roles, permissions } = verifyResult.payload;

      const result = await this.authService.createServiceToken(
        userId,
        tenantId,
        { email, roles, permissions },
        duration || '24h'
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /auth/service-token/revoke
   * Revoke a service token session
   */
  revokeServiceToken = async (req, res) => {
    try {
      const { token, service_token, serviceToken } = req.body;
      const targetToken = token || service_token || serviceToken || this.authService.jwtService.extractToken(req.headers.authorization);

      if (!targetToken) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_TOKEN', message: 'Service token is required in body or Authorization header' }
        });
      }

      const result = await this.authService.revokeServiceToken(targetToken);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * Handle errors consistently
   */
  _handleError(res, error) {
    console.error('[AuthController] Error:', error);
    const errorResponse = formatError(error);
    res.status(getErrorStatusCode(errorResponse)).json({
      success: false,
      error: errorResponse,
      ...(error.errors && { details: error.errors }),
      ...(error.issues && { details: error.issues })
    });
  }
}

module.exports = new AuthController();
