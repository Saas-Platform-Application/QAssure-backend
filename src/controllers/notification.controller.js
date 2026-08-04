/**
 * Notification Controller
 * Handles notification API endpoints
 */

const { getNotificationService } = require('../services/notification.service');

class NotificationController {

  // ============================================================================
  // USER NOTIFICATIONS
  // ============================================================================

  async getMyNotifications(req, res) {
    try {
      const service = getNotificationService();
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const { is_read, category, limit, offset } = req.query;

      const notifications = await service.getForUser(userId, tenantId, {
        is_read: is_read !== undefined ? is_read === 'true' : undefined,
        category,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        isSuperAdmin: !!req.user.isSuperAdmin
      });

      res.json({ success: true, data: notifications });
    } catch (error) {
      console.error('[Notification] Get error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async getUnreadCount(req, res) {
    try {
      const service = getNotificationService();
      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      const count = await service.getUnreadCount(userId, tenantId, { isSuperAdmin: !!req.user.isSuperAdmin });
      res.json({ success: true, data: { unread_count: count } });
    } catch (error) {
      console.error('[Notification] Count error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async markAsRead(req, res) {
    try {
      const service = getNotificationService();
      const userId = req.user.id;
      const { id } = req.params;

      const notification = await service.markAsRead(id, userId);
      if (!notification) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } });
      }

      res.json({ success: true, data: notification });
    } catch (error) {
      console.error('[Notification] Mark read error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  async markAllAsRead(req, res) {
    try {
      const service = getNotificationService();
      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      const count = await service.markAllAsRead(userId, tenantId, { isSuperAdmin: !!req.user.isSuperAdmin });
      res.json({ success: true, data: { marked_count: count } });
    } catch (error) {
      console.error('[Notification] Mark all read error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  async dismiss(req, res) {
    try {
      const service = getNotificationService();
      const userId = req.user.id;
      const { id } = req.params;

      const notification = await service.dismiss(id, userId);
      if (!notification) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } });
      }

      res.json({ success: true, data: notification });
    } catch (error) {
      console.error('[Notification] Dismiss error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  async dismissAll(req, res) {
    try {
      const service = getNotificationService();
      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      const count = await service.dismissAll(userId, tenantId, { isSuperAdmin: !!req.user.isSuperAdmin });
      res.json({ success: true, data: { dismissed_count: count } });
    } catch (error) {
      console.error('[Notification] Dismiss all error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // PREFERENCES
  // ============================================================================

  async getPreferences(req, res) {
    try {
      const service = getNotificationService();
      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      const preferences = await service.getPreferences(userId, tenantId);
      res.json({ success: true, data: preferences });
    } catch (error) {
      console.error('[Notification] Get preferences error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async updatePreferences(req, res) {
    try {
      const service = getNotificationService();
      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      const preferences = await service.updatePreferences(userId, tenantId, req.body);
      res.json({ success: true, data: preferences });
    } catch (error) {
      console.error('[Notification] Update preferences error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // TEMPLATES (Admin)
  // ============================================================================

  // ============================================================================
  // TEMPLATES (Admin)
  // ============================================================================

  async getTemplates(req, res) {
    try {
      const service = getNotificationService();
      const tenantId = req.user.tenantId;
      const { limit, offset, module_id } = req.query;

      const result = await service.getTemplates(tenantId, {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        module_id: module_id || null
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('[Notification] Get templates error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async getSuperAdminTemplates(req, res) {
    try {
      const service = getNotificationService();
      const { limit, offset, search, module_id } = req.query;
      const result = await service.getTemplatesForSuperAdmin({
        limit: parseInt(limit) || 10,
        offset: parseInt(offset) || 0,
        search: search || '',
        module_id: module_id || null
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('[Notification] Get Super Admin templates error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async createTemplate(req, res) {
    try {
      const service = getNotificationService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;

      const template = await service.createTemplate(tenantId, req.body);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      console.error('[Notification] Create template error:', error.message);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
    }
  }

  async updateTemplate(req, res) {
    try {
      const service = getNotificationService();
      const { id } = req.params;
      
      if (!req.user.isSuperAdmin) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only Super Admins can update global templates' } });
      }

      const template = await service.updateGlobalTemplate(id, req.body);
      res.json({ success: true, data: template });
    } catch (error) {
      console.error('[Notification] Update template error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  /**
   * Tenant Admin updates/overrides a template
   */
  async upsertTenantTemplate(req, res) {
    try {
      const service = getNotificationService();
      const tenantId = req.user.tenantId;
      const { code } = req.params;

      const template = await service.upsertTenantTemplate(tenantId, code, req.body, req.user.id);
      res.json({ success: true, data: template });
    } catch (error) {
      console.error('[Notification] Upsert tenant template error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  /**
   * Reset tenant override to global default
   */
  async resetTemplate(req, res) {
    try {
      const service = getNotificationService();
      const tenantId = req.user.tenantId;
      const { code } = req.params;

      const result = await service.resetTenantTemplate(tenantId, code);
      res.json(result);
    } catch (error) {
      console.error('[Notification] Reset template error:', error.message);
      res.status(error.message.includes('not found') ? 404 : 500)
         .json({ success: false, error: { code: 'RESET_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // ALERT RULES (Admin)
  // ============================================================================

  async getAlertRules(req, res) {
    try {
      const service = getNotificationService();
      const tenantId = req.user.tenantId;

      const rules = await service.getAlertRules(tenantId);
      res.json({ success: true, data: rules });
    } catch (error) {
      console.error('[Notification] Get alert rules error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async createAlertRule(req, res) {
    try {
      const service = getNotificationService();
      const tenantId = req.user.tenantId;

      const rule = await service.createAlertRule(tenantId, req.body);
      res.status(201).json({ success: true, data: rule });
    } catch (error) {
      console.error('[Notification] Create alert rule error:', error.message);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // ESCALATION RULES (Admin)
  // ============================================================================

  async getEscalationRules(req, res) {
    try {
      const service = getNotificationService();
      const tenantId = req.user.tenantId;

      const rules = await service.getEscalationRules(tenantId);
      res.json({ success: true, data: rules });
    } catch (error) {
      console.error('[Notification] Get escalation rules error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async createEscalationRule(req, res) {
    try {
      const service = getNotificationService();
      const tenantId = req.user.tenantId;

      const rule = await service.createEscalationRule(tenantId, req.body);
      res.status(201).json({ success: true, data: rule });
    } catch (error) {
      console.error('[Notification] Create escalation rule error:', error.message);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
    }
  }

  async processEscalations(req, res) {
    try {
      const service = getNotificationService();
      const tenantId = req.user.tenantId;

      await service.processEscalations(tenantId);
      res.json({ success: true, data: { message: 'Escalations processed' } });
    } catch (error) {
      console.error('[Notification] Process escalations error:', error.message);
      res.status(500).json({ success: false, error: { code: 'PROCESS_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // SEND NOTIFICATION (Admin/System)
  // ============================================================================

  async sendNotification(req, res) {
    try {
      const service = getNotificationService();
      const tenantId = req.user.tenantId;
      const { user_id, user_ids, role, template_code, variables, ...otherData } = req.body;

      // Extract template variables if provided in the 'variables' block, otherwise use top-level data
      // This ensures we support both { variables: { ... } } and direct properties in the body
      const finalVariables = { ...otherData, ...(variables || {}) };
      
      const options = { 
        createdBy: req.user.id,
        entityType: otherData.entity_type,
        entityId: otherData.entity_id,
        entityName: otherData.entity_name,
        actionUrl: otherData.action_url
      };

      // Ensure data for manual send also has created_by
      const manualData = { ...otherData, created_by: req.user.id };

      let result;

      if (template_code) {
        if (user_id) {
          result = await service.sendFromTemplate(tenantId, user_id, template_code, finalVariables, options);
        } else if (user_ids && user_ids.length > 0) {
          result = await service.sendFromTemplateToMany(tenantId, user_ids, template_code, finalVariables, options);
        } else if (role) {
          result = await service.sendFromTemplateByRole(tenantId, role, template_code, finalVariables, options);
        } else {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Template send requires user_id, user_ids, or role' }
          });
        }
      } else {
        // Manual (raw) sending
        if (user_ids && user_ids.length > 0) {
          result = await service.sendToMultiple(tenantId, user_ids, manualData);
        } else if (role) {
          result = await service.sendByRole(tenantId, role, manualData);
        } else if (user_id) {
          result = await service.send(tenantId, user_id, manualData);
        } else {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Must specify user_id, user_ids, or role' }
          });
        }
      }

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      console.error('[Notification] Send error:', error.message);
      res.status(500).json({ success: false, error: { code: 'SEND_ERROR', message: error.message } });
    }
  }
}

module.exports = new NotificationController();
