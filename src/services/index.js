/**
 * Services Index - QAssure Platform
 * Central export for all business services
 */

const { AuthService, AuthError, getAuthService } = require('./auth.service');

module.exports = {
  AuthService,
  AuthError,
  getAuthService
};
