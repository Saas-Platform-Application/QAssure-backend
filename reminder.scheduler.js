/**
 * Workflow Task Reminder Scheduler
 * Runs daily at 9:00 AM (UTC) to send reminders for due-soon and overdue tasks
 */

const cron = require('node-cron');
const { getNotificationService } = require('./src/services/notification.service');
const { pool } = require('./src/config/database');

let schedulerStarted = false;

/**
 * Resolves all user IDs assigned to a workflow task (both direct users and users holding assigned roles)
 */
async function resolveAssignees(tenantId, assignedUserIds, assignedRoleIds, startedBy) {
  const userIds = new Set();
  
  // 1. Direct user assignments
  if (assignedUserIds && assignedUserIds.length > 0) {
    assignedUserIds.forEach(id => userIds.add(id));
  }
  
  // 2. Role assignments
  if (assignedRoleIds && assignedRoleIds.length > 0) {
    try {
      const roleUsers = await pool.query(
        `SELECT DISTINCT u.id FROM users u
         JOIN user_roles ur ON u.id = ur.user_id
         JOIN user_tenants ut ON ut.user_id = u.id
         WHERE ur.role_id = ANY($1)
           AND ut.tenant_id = $2 
           AND LOWER(ut.status) = 'active' AND LOWER(u.status) = 'active'`,
        [assignedRoleIds, tenantId]
      );
      roleUsers.rows.forEach(u => userIds.add(u.id));
    } catch (err) {
      console.error(`[ReminderScheduler] Failed to resolve role assignees for role IDs ${assignedRoleIds}:`, err.message);
    }
  }

  // 3. Originator fallback if no user or role is assigned
  if (userIds.size === 0 && startedBy) {
    userIds.add(startedBy);
  }
  
  return Array.from(userIds);
}

/**
 * Runs the reminder checks for all active tenants
 */
async function runWorkflowReminders() {
  try {
    // Get all active tenants
    const tenantsResult = await pool.query(
      `SELECT id FROM tenants WHERE status = 'active'`
    );
    const tenants = tenantsResult.rows;

    if (tenants.length === 0) {
      console.log('[ReminderScheduler] No active tenants found');
      return;
    }

    console.log(`[ReminderScheduler] Processing workflow task reminders for ${tenants.length} tenant(s)`);
    const notificationService = getNotificationService();

    for (const tenant of tenants) {
      try {
        console.log(`[ReminderScheduler] Checking tenant: ${tenant.id}`);

        // --- 1. DUE SOON REMINDERS ---
        // Find tasks due in next 24 hours where warning_sent_at is null
        const dueSoonTasks = await pool.query(
          `SELECT wt.id AS task_id, wt.due_at, ws.name AS step_name,
                  wi.id AS instance_id, wi.entity_type, wi.entity_id, wi.entity_name,
                  wt.assigned_user_ids, wt.assigned_role_ids, wi.started_by
           FROM workflow_tasks wt
           JOIN workflow_steps ws ON wt.workflow_step_id = ws.id
           JOIN workflow_instances wi ON wt.workflow_instance_id = wi.id
           WHERE wt.tenant_id = $1
             AND wt.status = 'pending'
             AND wt.due_at IS NOT NULL
             AND wt.warning_sent_at IS NULL
             AND wt.due_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'`,
          [tenant.id]
        );

        console.log(`[ReminderScheduler] Tenant ${tenant.id}: Found ${dueSoonTasks.rows.length} due-soon tasks`);

        for (const task of dueSoonTasks.rows) {
          try {
            const assignees = await resolveAssignees(tenant.id, task.assigned_user_ids, task.assigned_role_ids, task.started_by);
            
            if (assignees.length > 0) {
              const formattedDate = task.due_at ? new Date(task.due_at).toISOString().split('T')[0] : '';
              
              for (const userId of assignees) {
                await notificationService.sendFromTemplate(tenant.id, userId, 'workflow_task_due_soon', {
                  task_name: task.step_name,
                  due_date: formattedDate
                }, {
                  entityType: 'workflow_task',
                  entityId: task.task_id,
                  entityName: task.step_name,
                  actionUrl: `/workflows/${task.instance_id}`
                });
              }
            }

            // Mark warning as sent to avoid redundant notifications
            await pool.query(
              `UPDATE workflow_tasks SET warning_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
              [task.task_id]
            );
          } catch (taskErr) {
            console.error(`[ReminderScheduler] Failed processing due-soon task ${task.task_id}:`, taskErr.message);
          }
        }

        // --- 2. OVERDUE REMINDERS ---
        // Find tasks that are past their due_at and have not received a reminder in the last 24 hours
        const overdueTasks = await pool.query(
          `SELECT wt.id AS task_id, wt.due_at, ws.name AS step_name,
                  wi.id AS instance_id, wi.entity_type, wi.entity_id, wi.entity_name,
                  wt.assigned_user_ids, wt.assigned_role_ids, wi.started_by
           FROM workflow_tasks wt
           JOIN workflow_steps ws ON wt.workflow_step_id = ws.id
           JOIN workflow_instances wi ON wt.workflow_instance_id = wi.id
           WHERE wt.tenant_id = $1
             AND wt.status = 'pending'
             AND wt.due_at IS NOT NULL
             AND wt.due_at < NOW()
             AND (wt.overdue_reminder_sent_at IS NULL OR wt.overdue_reminder_sent_at < NOW() - INTERVAL '24 hours')`,
          [tenant.id]
        );

        console.log(`[ReminderScheduler] Tenant ${tenant.id}: Found ${overdueTasks.rows.length} overdue tasks`);

        for (const task of overdueTasks.rows) {
          try {
            const assignees = await resolveAssignees(tenant.id, task.assigned_user_ids, task.assigned_role_ids, task.started_by);
            
            if (assignees.length > 0) {
              const daysOverdue = Math.max(1, Math.floor((new Date() - new Date(task.due_at)) / (1000 * 60 * 60 * 24)));
              
              for (const userId of assignees) {
                await notificationService.sendFromTemplate(tenant.id, userId, 'workflow_task_overdue', {
                  task_name: task.step_name,
                  days: daysOverdue.toString()
                }, {
                  entityType: 'workflow_task',
                  entityId: task.task_id,
                  entityName: task.step_name,
                  actionUrl: `/workflows/${task.instance_id}`
                });
              }
            }

            // Mark overdue reminder as sent to avoid redundant notifications
            await pool.query(
              `UPDATE workflow_tasks SET overdue_reminder_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
              [task.task_id]
            );
          } catch (taskErr) {
            console.error(`[ReminderScheduler] Failed processing overdue task ${task.task_id}:`, taskErr.message);
          }
        }

      } catch (tenantErr) {
        console.error(`[ReminderScheduler] Failed processing reminders for tenant ${tenant.id}:`, tenantErr.message);
      }
    }

    console.log('[ReminderScheduler] Workflow reminder run complete');
  } catch (err) {
    console.error('[ReminderScheduler] Fatal error in runWorkflowReminders:', err.message);
  }
}

/**
 * Initializes the reminder cron job
 */
function startReminderScheduler() {
  if (schedulerStarted) {
    console.warn('[ReminderScheduler] Already started, skipping');
    return;
  }

  // Run daily at 9:00 AM UTC: 0 9 * * *
  cron.schedule('0 9 * * *', async () => {
    console.log('[ReminderScheduler] Triggered by cron (daily at 9:00 AM UTC)');
    await runWorkflowReminders();
  }, {
    timezone: 'UTC'
  });

  // Also run once at startup after a short delay (45 seconds)
  setTimeout(async () => {
    console.log('[ReminderScheduler] Running initial workflow reminder check at startup');
    await runWorkflowReminders();
  }, 45000);

  schedulerStarted = true;
  console.log('[ReminderScheduler] Started — runs daily at 9:00 AM (UTC), next check in 45s');
}

module.exports = {
  startReminderScheduler,
  runWorkflowReminders
};
