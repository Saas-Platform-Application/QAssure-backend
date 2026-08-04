/**
 * Dashboard Controller - QAssure Platform
 * Handles dashboard API requests
 */
const dashboardService = require('../services/dashboard.service');
const { formatError, getErrorStatusCode } = require('../utils/errorFormatter');

class DashboardController {
  /**
   * Get dashboard statistics
   * GET /api/v1/dashboard/statistics
   * Super admin only
   */
  async getStatistics(req, res) {
    try {
      const statistics = await dashboardService.getStatistics(req.user?.tenantId);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse
      });
    }
  }

  /**
   * Get tenant dashboard statistics
   * GET /api/v1/dashboard/tenant
   */
  async getTenantStatistics(req, res) {
    try {
      const stats = await dashboardService.getTenantStatistics(req.user);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse
      });
    }
  }
}

module.exports = new DashboardController();
