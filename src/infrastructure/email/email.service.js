const nodemailer = require("nodemailer");
const { pool } = require("../../config/database");
const { decrypt } = require("../../utils/encryption");
const { formatDateTime } = require("../../utils/dateFormatter");

class EmailService {
  constructor() {
    this.transporters = new Map(); // Cache for transporters: tenantId -> transporter
    this.initialized = false;
    this.defaultFrom = process.env.EMAIL_FROM || "noreply@qassure.ai";
  }

  /**
   * Get transporter for a specific tenant or global
   */
  async _getTransporter(tenantId = null) {
    const cacheKey = tenantId || "global";

    // Check cache
    if (this.transporters.has(cacheKey)) {
      return this.transporters.get(cacheKey);
    }

    try {
      let config = null;

      // 1. Try to find Tenant SMTP config if tenantId is provided
      if (tenantId) {
        const tenantResult = await pool.query(
          `SELECT * FROM notification_smtp_configs WHERE tenant_id = $1 AND is_active = true AND scope = 'tenant' LIMIT 1`,
          [tenantId],
        );
        if (tenantResult.rows.length > 0) {
          config = tenantResult.rows[0];
        } else {
          throw new Error("No active SMTP configuration found for this tenant.");
        }
      }

      // 2. If tenantId is not provided, try Global Super Admin config
      if (!tenantId) {
        const globalResult = await pool.query(
          `SELECT * FROM notification_smtp_configs WHERE scope = 'super_admin' AND is_active = true LIMIT 1`,
        );
        if (globalResult.rows.length > 0) {
          config = globalResult.rows[0];
        } else {
          throw new Error("No active Global Super Admin SMTP configuration found.");
        }
      }

      let transporter;
      let fromEmail = this.defaultFrom;

      if (config) {
        // Use DB configuration
        const password = decrypt(config.password);
        transporter = nodemailer.createTransport({
          host: config.host,
          port: parseInt(config.port),
          secure: config.secure,
          auth: {
            user: config.username,
            pass: password,
          },
        });

        if (config.from_email) {
          fromEmail = config.from_name
            ? `"${config.from_name}" <${config.from_email}>`
            : config.from_email;
        }

        console.log(
          `[EmailService] Created dynamic transporter for ${cacheKey} (${config.host})`,
        );
      } else {
        throw new Error("SMTP Configuration is missing or invalid.");
      }

      const transporterData = { instance: transporter, from: fromEmail };
      this.transporters.set(cacheKey, transporterData);
      return transporterData;
    } catch (err) {
      console.error(`[EmailService] Failed to create transporter for ${cacheKey}:`, err.message);
      // If everything fails, return null or throw?
      // For now, let's try to return the console fallback if not already in one
      return {
        instance: {
          sendMail: async () => {
            throw new Error(`Email configuration failed: ${err.message}`);
          },
        },
        from: this.defaultFrom,
      };
    }
  }

  /**
   * Invalidate transporter cache for a tenant or global
   */
  invalidateCache(tenantId = null) {
    const cacheKey = tenantId || "global";
    this.transporters.delete(cacheKey);
    console.log(`[EmailService] Invalidated email transporter cache for ${cacheKey}`);
  }

  /**
   * Send email
   */
  async send(to, subject, html, text = null, tenantId = null, options = {}) {
    // options support: skipFailureLog, userId, notificationId
    const { instance: transporter, from } = await this._getTransporter(tenantId);

    const mailOptions = {
      from,
      to,
      subject,
      html,
      text: text || this._stripHtml(html),
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log(`[EmailService] Email sent to ${to}: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (err) {
      console.error(
        `[EmailService] Failed to send email to ${to}:`,
        err.message,
      );
      
      // Always track failures at the global gateway, unless explicitly skipped
      if (options.skipFailureLog !== true) {
        try {
          await pool.query(`
            INSERT INTO failed_emails (tenant_id, user_id, notification_id, to_email, subject, body, error_message, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'failed')
          `, [tenantId, options.userId || null, options.notificationId || null, to, subject, html, err.message]);
          console.log(`[EmailService] System logged failed email for ${to} to database.`);
        } catch (dbErr) {
          console.error(`[EmailService] Could not log failed email to DB:`, dbErr.message);
        }
      }

      throw err;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email, firstName, verificationToken, tenantId = null) {
    const verifyUrl = `${process.env.APP_URL || "http://localhost:5173"}/verify-email?token=${verificationToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to QAssure!</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <p style="margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verifyUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          If you didn't create an account, please ignore this email.
        </p>
      </div>
    `;

    return this.send(email, "Verify your QAssure account", html, null, tenantId);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, firstName, resetToken, tenantId = null) {
    const resetUrl = `${process.env.APP_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hi ${firstName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          If you didn't request a password reset, please ignore this email or contact support if you have concerns.
        </p>
      </div>
    `;

    return this.send(email, "Reset your QAssure password", html, null, tenantId);
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email, firstName, tenantName, tenantId = null) {
    const loginUrl = `${process.env.APP_URL || "http://localhost:5173"}/login`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to QAssure! 🎉</h2>
        <p>Hi ${firstName},</p>
        <p>Your email has been verified and your account is now active.</p>
        <p>You've been added to <strong>${tenantName}</strong>.</p>
        <p style="margin: 30px 0;">
          <a href="${loginUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Log In to QAssure
          </a>
        </p>
        <p>Need help getting started? Check out our documentation or contact support.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          © ${new Date().getFullYear()} QAssure. All rights reserved.
        </p>
      </div>
    `;

    return this.send(email, "Welcome to QAssure!", html, null, tenantId);
  }

  /**
   * Send password changed notification
   */
  async sendPasswordChangedEmail(email, firstName, tenantId = null) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Changed</h2>
        <p>Hi ${firstName},</p>
        <p>Your password was successfully changed on ${formatDateTime(new Date())}.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          This is an automated security notification from QAssure.
        </p>
      </div>
    `;

    return this.send(email, "Your QAssure password was changed", html, null, tenantId);
  }

  /**
   * Send system-generated password to new user
   */
  async sendGeneratedPasswordEmail(email, firstName, password, tenantId = null) {
    const loginUrl = `${process.env.APP_URL || "http://localhost:5173"}/login`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2563eb;">Welcome to QAssure</h2>
        <p>Hi ${firstName},</p>
        <p>An account has been created for you. Below are your temporary login credentials:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #fff; padding: 2px 5px; border: 1px solid #ddd;">${password}</code></p>
        </div>
        <p><strong>Note:</strong> You will be required to change this password upon your first login for security purposes.</p>
        <p style="margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login Now</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          This is an automated security notification from QAssure.
        </p>
      </div>
    `;
    return this.send(email, "Your QAssure Account Credentials", html, null, tenantId);
  }

  /**
   * Strip HTML tags for plain text version
   */
  _stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

// Singleton
let instance = null;
const getEmailService = () => {
  if (!instance) {
    instance = new EmailService();
  }
  return instance;
};

module.exports = { EmailService, getEmailService };
