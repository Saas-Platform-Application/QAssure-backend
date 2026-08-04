/**
 * SMTP Connection Scheduler
 * Runs daily at 9:00 AM to check tenant SMTP connections.
 */

const cron = require('node-cron');
const { getNotificationService } = require('./src/services/notification.service');
const { getSmtpConfigService } = require('./src/services/smtp_config.service');
const { getEmailService } = require('./src/infrastructure/email/email.service');
const { pool } = require('./src/config/database');

let schedulerStarted = false;

async function checkSmtpConnections() {
  try {
    const result = await pool.query(
      `SELECT * FROM notification_smtp_configs WHERE scope = 'tenant' AND is_active = true`
    );

    const configs = result.rows;
    if (configs.length === 0) {
      console.log('[SmtpScheduler] No active tenant SMTP configs found');
      return;
    }

    console.log(`[SmtpScheduler] Checking SMTP configs for ${configs.length} tenant(s)`);

    const smtpService = getSmtpConfigService();
    const notificationService = getNotificationService();

    for (const config of configs) {
      try {
        const testData = {
          id: config.id,
          host: config.host,
          port: config.port,
          secure: config.secure,
          username: config.username,
          password: '********' // _testConnection will fetch real password because data.id is passed
        };

        const testResult = await smtpService._testConnection(testData, config.tenant_id);

        if (!testResult.success) {
          console.warn(`[SmtpScheduler] SMTP connection failed for tenant ${config.tenant_id}. Triggering notification.`);
          
          const adminsRes = await pool.query(`
            SELECT DISTINCT u.id, u.email, u.first_name 
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            JOIN user_tenants ut ON ut.user_id = u.id
            WHERE r.code = 'tenant_admin' AND ut.tenant_id = $1
              AND LOWER(ut.status) = 'active' AND u.status = 'active'
          `, [config.tenant_id]);

          const admins = adminsRes.rows;

          const title = '⚠️ SMTP Connection Failed';
          const message = 'Your customized SMTP connection is failing. Please check the SMTP settings.';
          const errorDetail = testResult.message;

          for (const admin of admins) {
            // Send In-App notification
            await notificationService.send(config.tenant_id, admin.id, {
              title: title,
              message: message,
              notification_type: 'alert',
              category: 'system',
              priority: 'high',
              action_url: '/settings/smtp'
            });

            // Send Email using SuperAdmin config (tenantId = null)
            const subject = 'QAssure - SMTP Connection Failed';
            const htmlBody = `
              <div style="font-family: Arial, sans-serif;">
                <h2 style="color: red;">SMTP Connection Failing</h2>
                <p>Hi ${admin.first_name},</p>
                <p>We detected that the SMTP configuration for your account is currently failing. Emails from your tenant will not be delivered.</p>
                <p><strong>Error details:</strong> ${errorDetail}</p>
                <p>Please log in and update your SMTP settings immediately.</p>
              </div>
            `;
            const emailService = getEmailService();
            await emailService.send(admin.email, subject, htmlBody, null, null);
          }
        } else {
          console.log(`[SmtpScheduler] SMTP OK for tenant: ${config.tenant_id}`);
        }
      } catch (err) {
        console.error(`[SmtpScheduler] Failed to check for tenant ${config.tenant_id}:`, err.message);
      }
    }

    console.log('[SmtpScheduler] Run complete');
  } catch (err) {
    console.error('[SmtpScheduler] Fatal error:', err.message);
  }
}

function startSmtpScheduler() {
  if (schedulerStarted) {
    console.warn('[SmtpScheduler] Already started, skipping');
    return;
  }

  // Run at 09:00 AM everyday
  cron.schedule('0 9 * * *', async () => {
    console.log('[SmtpScheduler] Triggered by cron (everyday at 09:00 AM)');
    await checkSmtpConnections();
  });

  schedulerStarted = true;
  console.log('[SmtpScheduler] Started — runs everyday at 09:00 AM');
}

module.exports = { startSmtpScheduler, checkSmtpConnections };
