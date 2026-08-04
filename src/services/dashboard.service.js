/**
 * Dashboard Service - QAssure Platform
 * Provides statistics for the superadmin dashboard
 */
const Tenant = require("../sequelize-models/tenant");
const User = require("../sequelize-models/user");
const Session = require("../sequelize-models/session");
const Module = require("../sequelize-models/module");
const Document = require("../sequelize-models/document");
const WorkflowTask = require("../sequelize-models/workflow_task");
const Usertenant = require("../sequelize-models/user_tenant");
const Notification = require("../sequelize-models/notification");
const TenantModule = require("../sequelize-models/tenant_module");
const { getWorkflowTaskService } = require("./workflow-task.service");
const { getModuleLaunchService } = require("./module_launch.service");
const { Op } = require("sequelize");
const database = require("../config/database");

class DashboardService {
  /**
   * Get dashboard statistics (Super Admin)
   * Returns counts of tenants, users, sessions, and modules
   */
  async getStatistics(tenantId = null) {
    try {
      const tenantWhere = {
        slug: {
          [Op.notIn]: ['superadmin', 'super-admin', 'system', 'qassure-demo']
        }
      };

      // Get total tenants count
      const totalTenants = await Tenant.count({
        where: tenantWhere
      });

      // Get active tenants count (status = 'active')
      const activeTenants = await Tenant.count({
        where: {
          ...tenantWhere,
          status: "active",
        },
      });

      // Get total users count excluding super_admin credential
      // const totalUsersQuery = await database.query(`
      //   SELECT COUNT(*) as count 
      //   FROM users u 
      //   WHERE NOT EXISTS (
      //     SELECT 1 FROM user_roles ur 
      //     JOIN roles r ON ur.role_id = r.id 
      //     WHERE ur.user_id = u.id AND r.code = 'super_admin'
      //   )
      // `);
      // const totalUsers = parseInt(totalUsersQuery.rows[0].count);

      // Get active sessions count (not expired and not revoked)
      // const now = new Date();
      // const activeSessions = await Session.count({
      //   where: {
      //     expires_at: {
      //       [Op.gt]: now,
      //     },
      //     revoked_at: {
      //       [Op.is]: null,
      //     },
      //   },
      // });

      const moduleWhere = tenantId ? { tenant_id: tenantId } : {};

      // Get registered modules count
      const registeredModules = await Module.count({
        where: moduleWhere
      });

      // Get healthy modules count (health_status = 'healthy')
      const healthyModules = await Module.count({
        where: {
          ...moduleWhere,
          health_status: "healthy",
        },
      });

      return {
        totalTenants,
        activeTenants,
        // totalUsers,
        // activeSessions,
        registeredModules,
        healthyModules,
      };
    } catch (error) {
      throw new Error(`Failed to fetch dashboard statistics: ${error.message}`);
    }
  }

  /**
   * Get tenant-specific dashboard statistics
   * @param {Object} user - Authenticated user object from req.user
   */
  async getTenantStatistics(user) {
    try {
      const { tenantId, roles = [], permissions = [] } = user;
      const stats = {
        permissions: roles.includes("tenant_admin") ? ["*"] : permissions,
      };

      // Helper to check permission
      const hasPermission = (perm) =>
        permissions.includes(perm) ||
        roles.includes("tenant_admin") ||
        roles.includes("super_admin");

      // 1. Documents Count
      if (hasPermission("document:read") || hasPermission("document:*")) {
        stats.documentsCount = await Document.count({
          where: { tenant_id: tenantId },
        });
      }

      // // 2. Pending Tasks Count (for the user)
      // if (hasPermission('workflow:read')|| hasPermission('workflow:*')) {
      const workflowTaskService = getWorkflowTaskService();
      const counts = await workflowTaskService.getTaskCounts(user.id, tenantId);
      stats.pendingTasks = counts.pending;
      // }

      // 3. Total Users Count (tenant-wide, excluding tenant admins)
      if (hasPermission("users:read") || hasPermission("users:*")) {
        const userCountResult = await database.query(
          `SELECT COUNT(*) as count 
           FROM user_tenants ut
           WHERE ut.tenant_id = $1 AND ut.status = 'active'
           AND NOT EXISTS (
             SELECT 1 FROM user_roles ur 
             JOIN roles r ON ur.role_id = r.id 
             WHERE ur.user_id = ut.user_id 
             AND ur.tenant_id = ut.tenant_id 
             AND r.code = 'tenant_admin'
           )`,
          [tenantId]
        );
        stats.usersCount = parseInt(userCountResult.rows[0].count || 0);
      }

      // 4. Notifications (unseen for the user)
      stats.unreadNotificationsCount = await Notification.count({
        where: {
          tenant_id: tenantId,
          user_id: user.id,
          is_read: false,
        },
      });

      // 5. Active Modules - we always show this as the service handles filtering internally
      const moduleLaunchService = getModuleLaunchService();
      const accessCheck = await moduleLaunchService.getAccessibleModules(
        user,
        tenantId,
      );

      if (accessCheck.success) {
        stats.activeModulesCount = accessCheck.data.length;
      } else {
        stats.activeModulesCount = 0;
      }

      return stats;
    } catch (error) {
      console.error("[DashboardService] getTenantStatistics error:", error);
      throw new Error(`Failed to fetch tenant statistics: ${error.message}`);
    }
  }
}

module.exports = new DashboardService();
