const { pool } = require('../config/database');
const { getEmailService } = require('../infrastructure/email/email.service');

class FailedEmailsService {
  constructor() {
    this.pool = pool;
  }

  async getFailedEmails(tenantId = null, queryOptions = {}) {
    const { limit = 50, offset = 0 } = queryOptions;
    
    let query = `
      SELECT f.*, u.first_name, u.last_name, u.email as user_email
      FROM failed_emails f
      LEFT JOIN users u ON f.user_id = u.id
    `;
    const params = [];
    
    if (tenantId) {
      query += ` WHERE f.tenant_id = $1`;
      params.push(tenantId);
    } else {
      query += ` WHERE f.tenant_id IS NULL`;
    }

    query += ` ORDER BY f.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    
    // Count total
    let countQuery = `SELECT COUNT(*) FROM failed_emails`;
    if (tenantId) {
      countQuery += ` WHERE tenant_id = $1`;
    } else {
      countQuery += ` WHERE tenant_id IS NULL`;
    }
    const countResult = await this.pool.query(countQuery, tenantId ? [tenantId] : []);
    
    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10)
    };
  }

  async resendEmail(id, tenantId = null) {
    let query = `SELECT * FROM failed_emails WHERE id = $1`;
    const params = [id];
    
    if (tenantId) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    } else {
      query += ` AND tenant_id IS NULL`;
    }
    
    const result = await this.pool.query(query, params);
    if (!result.rows.length) {
      throw new Error("Failed email not found.");
    }
    
    const failedEmail = result.rows[0];
    const emailService = getEmailService();
    
    // Attempt sending again, skipping duplicate failure logs
    await emailService.send(failedEmail.to_email, failedEmail.subject, failedEmail.body, null, tenantId, { skipFailureLog: true });
    
    // update status
    await this.pool.query(
      `UPDATE failed_emails SET status = 'resent', updated_at = NOW() WHERE id = $1`,
      [id]
    );
    
    return { success: true };
  }

  async resendAll(tenantId = null) {
    let query = `SELECT * FROM failed_emails WHERE status = 'failed'`;
    const params = [];
    
    if (tenantId) {
      query += ` AND tenant_id = $1`;
      params.push(tenantId);
    } else {
      query += ` AND tenant_id IS NULL`;
    }
    
    const result = await this.pool.query(query, params);
    const emailService = getEmailService();
    
    let sentCount = 0;
    let failCount = 0;
    
    for (const email of result.rows) {
      try {
        await emailService.send(email.to_email, email.subject, email.body, null, email.tenant_id, { skipFailureLog: true });
        await this.pool.query(`UPDATE failed_emails SET status = 'resent', updated_at = NOW() WHERE id = $1`, [email.id]);
        sentCount++;
      } catch (e) {
        failCount++;
      }
    }
    
    return { sentCount, failCount };
  }

  async deleteFailedEmail(id, tenantId = null) {
    let query = `DELETE FROM failed_emails WHERE id = $1`;
    const params = [id];
    
    if (tenantId) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    } else {
      query += ` AND tenant_id IS NULL`;
    }
    
    await this.pool.query(query, params);
    return { success: true };
  }
}

let instance = null;
const getFailedEmailsService = () => {
  if (!instance) instance = new FailedEmailsService();
  return instance;
};

module.exports = { FailedEmailsService, getFailedEmailsService };
