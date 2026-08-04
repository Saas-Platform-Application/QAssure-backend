/**
 * Auth Infrastructure Index - QAssure Platform
 * Central export for authentication services
 */

const { JWTService, getJWTService } = require('./jwt.service');
const { PermissionService, getPermissionService } = require('./permission.service');

module.exports = {
  JWTService,
  getJWTService,
  PermissionService,
  getPermissionService
};
