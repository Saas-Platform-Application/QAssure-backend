/**
 * Escalation Scheduler
 * Runs processEscalations() for all active tenants on a schedule
 */

const cron = require('node-cron');
const { getNotificationService } = require('./src/services/notification.service');
const { pool } = require('./src/config/database');

let schedulerStarted = false;

async function runEscalations() {
  try {
    // Get all active tenants
    const result = await pool.query(
      `SELECT id FROM tenants WHERE status = 'active'`
    );

    const tenants = result.rows;

    if (tenants.length === 0) {
      console.log('[EscalationScheduler] No active tenants found');
      return;
    }

    console.log(`[EscalationScheduler] Processing escalations for ${tenants.length} tenant(s)`);

    const notificationService = getNotificationService();

    for (const tenant of tenants) {
      try {
        await notificationService.processEscalations(tenant.id);
        console.log(`[EscalationScheduler] Processed tenant: ${tenant.id}`);
      } catch (err) {
        console.error(`[EscalationScheduler] Failed for tenant ${tenant.id}:`, err.message);
      }
    }

    console.log('[EscalationScheduler] Run complete');
  } catch (err) {
    console.error('[EscalationScheduler] Fatal error:', err.message);
  }
}

function startEscalationScheduler() {
  if (schedulerStarted) {
    console.warn('[EscalationScheduler] Already started, skipping');
    return;
  }

  // Run every 6 hours: 0 */6 * * *
  // Checks all tenants for overdue CAPAs, training, workflow tasks
  cron.schedule('0 */6 * * *', async () => {
    console.log('[EscalationScheduler] Triggered by cron (every 6 hours)');
    await runEscalations();
  }, {
    timezone: 'UTC'
  });

  // Also run once at startup after a short delay (30 seconds)
  // to catch any escalations that were missed during downtime
  setTimeout(async () => {
    console.log('[EscalationScheduler] Running initial escalation check at startup');
    await runEscalations();
  }, 30000);

  schedulerStarted = true;
  console.log('[EscalationScheduler] Started — runs every 6 hours (UTC), next check in 30s');
}

module.exports = { startEscalationScheduler, runEscalations };
