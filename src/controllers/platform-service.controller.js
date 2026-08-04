/**
 * Platform Services Controller - QAssure Platform
 *
 * Handles read operations for platform service registry.
 * Toggle operations flow through the existing tenant create/update endpoints.
 */

const database = require('../config/database');
const { formatError, getErrorStatusCode } = require('../utils/errorFormatter');

class PlatformServiceController {

  /**
   * GET /api/v1/platform-services
   * List all registered platform services (no tenant state).
   * Used by Create Tenant Wizard to build the checkbox list.
   * Auth: requireSuperAdmin
   */
  async listAll(req, res) {
    try {
      const result = await database.query(`
        SELECT id, key, name, description, icon, category, sort_order
        FROM platform_services
        ORDER BY sort_order ASC
      `);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({ success: false, error: errorResponse });
    }
  }

  /**
   * GET /api/v1/platform-services/tenant/:tenantId
   * List all platform services with enabled/disabled state for a specific tenant.
   * Used by Edit Tenant page to populate the Platform Services tab.
   * Auth: requireSuperAdmin
   */
  async listForTenant(req, res) {
    try {
      const { tenantId } = req.params;

      // Verify tenant exists
      const tenantCheck = await database.query(
        `SELECT id, name FROM tenants WHERE id = $1 LIMIT 1`,
        [tenantId]
      );
      if (tenantCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tenant not found' },
        });
      }

      const result = await database.query(`
        SELECT
          ps.id          AS service_id,
          ps.key,
          ps.name,
          ps.description,
          ps.icon,
          ps.category,
          ps.sort_order,
          COALESCE(tps.is_enabled, true)  AS is_enabled,
          tps.changed_by,
          tps.changed_at,
          tps.notes
        FROM platform_services ps
        LEFT JOIN tenant_platform_services tps
          ON tps.service_id = ps.id AND tps.tenant_id = $1
        ORDER BY ps.sort_order ASC
      `, [tenantId]);

      res.json({
        success: true,
        data: result.rows,
        tenant: tenantCheck.rows[0],
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({ success: false, error: errorResponse });
    }
  }

  /**
   * GET /api/v1/platform-services/my
   * Returns enabled service keys for the current user's tenant.
   * Used by the tenant-side frontend to build the sidebar and route guards.
   * Auth: any authenticated user
   */
  async listMine(req, res) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_TENANT', message: 'No tenant context found' },
        });
      }

      const result = await database.query(`
        SELECT
          ps.key,
          ps.name,
          ps.icon,
          ps.category,
          ps.sort_order,
          COALESCE(tps.is_enabled, true) AS is_enabled
        FROM platform_services ps
        LEFT JOIN tenant_platform_services tps
          ON tps.service_id = ps.id AND tps.tenant_id = $1
        ORDER BY ps.sort_order ASC
      `, [tenantId]);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({ success: false, error: errorResponse });
    }
  }
}

module.exports = new PlatformServiceController();
