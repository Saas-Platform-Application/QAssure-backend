/**
 * Billing Service
 * Manages invoices, payments, and pricing plans
 * Manual/Invoice-based billing (no Stripe integration)
 */

const { pool } = require('../config/database');
const { getAuditService } = require('./audit.service');

class BillingService {
  constructor() {
    this.pool = pool;
  }

  // =====================================================
  // PRICING PLANS
  // =====================================================

  async getPricingPlans(options = {}) {
    const { application, tier, is_active = true, is_public } = options;

    let query = 'SELECT * FROM pricing_plans WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (application) {
      query += ` AND application = $${paramIndex++}`;
      params.push(application);
    }
    if (tier) {
      query += ` AND license_tier = $${paramIndex++}`;
      params.push(tier);
    }
    if (is_active !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(is_active);
    }
    if (is_public !== undefined) {
      query += ` AND is_public = $${paramIndex++}`;
      params.push(is_public);
    }

    query += ' ORDER BY application, license_tier, billing_cycle';
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getPricingPlanById(id) {
    const result = await this.pool.query('SELECT * FROM pricing_plans WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getPricingPlanByCode(code) {
    const result = await this.pool.query('SELECT * FROM pricing_plans WHERE code = $1', [code]);
    return result.rows[0] || null;
  }

  async createPricingPlan(data) {
    // Handle both formats: application (singular) or applications (plural array - take first)
    let application = data.application;
    if (!application && data.applications && Array.isArray(data.applications) && data.applications.length > 0) {
      application = data.applications[0];
    }
    
    // Handle price_monthly/price_yearly format
    let base_price = data.base_price;
    let billing_cycle = data.billing_cycle || 'annual';
    
    if (!base_price) {
      if (data.price_yearly) {
        base_price = data.price_yearly;
        billing_cycle = 'annual';
      } else if (data.price_monthly) {
        base_price = data.price_monthly;
        billing_cycle = 'monthly';
      }
    }
    
    // Validate required fields
    if (!data.code) {
      throw new Error('code is required');
    }
    if (!data.name) {
      throw new Error('name is required');
    }
    if (!application) {
      throw new Error('application is required (or provide applications array)');
    }
    if (!base_price) {
      throw new Error('base_price is required (or provide price_monthly/price_yearly)');
    }
    
    // Convert features object to array if needed
    let features = data.features || [];
    if (typeof features === 'object' && !Array.isArray(features)) {
      // Convert object like {"ai_enabled": true} to array of keys where value is true
      features = Object.keys(features).filter(key => features[key] === true);
    }
    
    // Handle limits - can be object or use features object for limits
    let limits = data.limits || {};
    if (typeof data.features === 'object' && !Array.isArray(data.features)) {
      // If features is an object with numeric values, treat those as limits
      const numericLimits = {};
      Object.keys(data.features).forEach(key => {
        if (typeof data.features[key] === 'number') {
          numericLimits[key] = data.features[key];
        }
      });
      if (Object.keys(numericLimits).length > 0) {
        limits = { ...limits, ...numericLimits };
      }
    }
    
    const {
      code, name, description, license_tier,
      currency = 'USD',
      is_active = true, is_public = true
    } = data;

    const result = await this.pool.query(
      `INSERT INTO pricing_plans (code, name, description, license_tier, application, base_price, currency, billing_cycle, features, limits, is_active, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [code, name, description, license_tier, application, base_price, currency, billing_cycle, JSON.stringify(features), JSON.stringify(limits), is_active, is_public]
    );
    return result.rows[0];
  }

  async updatePricingPlan(id, data) {
    const updates = [];
    const params = [id];
    let paramIndex = 2;

    const allowedFields = ['name', 'description', 'base_price', 'currency', 'billing_cycle', 'features', 'limits', 'is_active', 'is_public'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (field === 'features' || field === 'limits') {
          updates.push(`${field} = $${paramIndex++}`);
          params.push(JSON.stringify(data[field]));
        } else {
          updates.push(`${field} = $${paramIndex++}`);
          params.push(data[field]);
        }
      }
    }

    if (updates.length === 0) throw new Error('No fields to update');
    updates.push('updated_at = NOW()');

    const result = await this.pool.query(
      `UPDATE pricing_plans SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    return result.rows[0];
  }

  // =====================================================
  // INVOICES
  // =====================================================

  async createInvoice(data, createdBy) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const {
        tenant_id, license_id, due_date, period_start, period_end, line_items = [],
        tax_rate = 0, discount_amount = 0, discount_reason, notes, terms,
        billing_name, billing_email, billing_address
      } = data;

      const numberResult = await client.query('SELECT generate_invoice_number() as invoice_number');
      const invoice_number = numberResult.rows[0].invoice_number;

      let subtotal = 0;
      for (const item of line_items) {
        subtotal += parseFloat(item.amount) || (item.quantity * item.unit_price);
      }

      const tax_amount = subtotal * (tax_rate / 100);
      const total = subtotal + tax_amount - discount_amount;
      const amount_due = total;

      const invoiceResult = await client.query(
        `INSERT INTO invoices (tenant_id, license_id, invoice_number, status, invoice_date, due_date, period_start, period_end, subtotal, tax_rate, tax_amount, discount_amount, discount_reason, total, amount_due, currency, billing_name, billing_email, billing_address, notes, terms, created_by)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING *`,
        [tenant_id, license_id, invoice_number, 'draft', due_date, period_start, period_end, subtotal, tax_rate, tax_amount, discount_amount, discount_reason, total, amount_due, 'USD', billing_name, billing_email, JSON.stringify(billing_address), notes, terms, createdBy]
      );

      const invoice = invoiceResult.rows[0];

      for (let i = 0; i < line_items.length; i++) {
        const item = line_items[i];
        const itemAmount = parseFloat(item.amount) || (item.quantity * item.unit_price);
        await client.query(
          `INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, amount, period_start, period_end, pricing_plan_id, license_id, item_type, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [invoice.id, item.description, item.quantity || 1, item.unit_price, itemAmount, item.period_start, item.period_end, item.pricing_plan_id, item.license_id, item.item_type || 'license', i]
        );
      }

      await client.query('COMMIT');
      setImmediate(async () => { try { await getAuditService().log({ action: 'CREATE', user_id: createdBy, tenant_id: tenant_id, resource_type: 'billing', resource_id: invoice.id, response_status: 201, metadata: { invoice_number, total, status: 'draft' } }); } catch(e){} });
      return this.getInvoiceById(invoice.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getInvoiceById(id) {
    const invoiceResult = await this.pool.query(
      `SELECT i.*, t.name as tenant_name, l.license_key FROM invoices i
       LEFT JOIN tenants t ON i.tenant_id = t.id
       LEFT JOIN licenses l ON i.license_id = l.id WHERE i.id = $1`,
      [id]
    );

    if (invoiceResult.rows.length === 0) return null;

    const invoice = invoiceResult.rows[0];
    const itemsResult = await this.pool.query('SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY sort_order', [id]);
    invoice.line_items = itemsResult.rows;

    const paymentsResult = await this.pool.query('SELECT * FROM payments WHERE invoice_id = $1 ORDER BY created_at', [id]);
    invoice.payments = paymentsResult.rows;

    return invoice;
  }

  async listInvoices(options = {}) {
    const { tenant_id, license_id, status, from_date, to_date, page = 1, limit = 20 } = options;

    let query = `SELECT i.*, t.name as tenant_name FROM invoices i LEFT JOIN tenants t ON i.tenant_id = t.id WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (tenant_id) { query += ` AND i.tenant_id = $${paramIndex++}`; params.push(tenant_id); }
    if (license_id) { query += ` AND i.license_id = $${paramIndex++}`; params.push(license_id); }
    if (status) { query += ` AND i.status = $${paramIndex++}`; params.push(status); }
    if (from_date) { query += ` AND i.invoice_date >= $${paramIndex++}`; params.push(from_date); }
    if (to_date) { query += ` AND i.invoice_date <= $${paramIndex++}`; params.push(to_date); }

    const countResult = await this.pool.query(query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM'), params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY i.invoice_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, (page - 1) * limit);

    const result = await this.pool.query(query, params);
    return { invoices: result.rows, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  async sendInvoice(id, updatedBy) {
    const result = await this.pool.query(
      `UPDATE invoices SET status = 'sent', sent_at = NOW(), updated_by = $2, updated_at = NOW() WHERE id = $1 AND status = 'draft' RETURNING *`,
      [id, updatedBy]
    );
    if (result.rows.length === 0) throw new Error('Invoice not found or already sent');
    setImmediate(async () => { try { await getAuditService().log({ action: 'UPDATE', user_id: updatedBy, tenant_id: null, resource_type: 'billing', resource_id: id, response_status: 200, metadata: { action: 'invoice_sent' } }); } catch(e){} });
    return this.getInvoiceById(id);
  }

  async voidInvoice(id, updatedBy) {
    const result = await this.pool.query(
      `UPDATE invoices SET status = 'void', voided_at = NOW(), updated_by = $2, updated_at = NOW() WHERE id = $1 AND status IN ('draft', 'sent') RETURNING *`,
      [id, updatedBy]
    );
    if (result.rows.length === 0) throw new Error('Invoice not found or cannot be voided');
    setImmediate(async () => { try { await getAuditService().log({ action: 'DELETE', user_id: updatedBy, tenant_id: null, resource_type: 'billing', resource_id: id, response_status: 200, metadata: { action: 'invoice_voided' } }); } catch(e){} });
    return result.rows[0];
  }

  async markOverdueInvoices() {
    const result = await this.pool.query(`UPDATE invoices SET status = 'overdue', updated_at = NOW() WHERE status = 'sent' AND due_date < NOW() RETURNING id`);
    return result.rows.length;
  }

  // =====================================================
  // PAYMENTS
  // =====================================================

  async recordPayment(data, recordedBy, tenantId = null) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { invoice_id, amount, currency = 'USD', payment_method, reference_number, bank_name, transaction_date, payment_date, notes } = data;
      
      // Get tenant_id from invoice if not provided
      let tenant_id = data.tenant_id || tenantId;
      if (!tenant_id && invoice_id) {
        const invoiceResult = await client.query('SELECT tenant_id FROM invoices WHERE id = $1', [invoice_id]);
        if (invoiceResult.rows.length > 0) {
          tenant_id = invoiceResult.rows[0].tenant_id;
        }
      }
      
      if (!tenant_id) {
        throw new Error('tenant_id is required (provide directly or via invoice_id)');
      }

      // Generate payment number
      const numberResult = await client.query('SELECT generate_payment_number() as payment_number');
      const payment_number = numberResult.rows[0].payment_number;

      // Format values properly
      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('amount must be a positive number');
      }
      
      // Use payment_date if provided, otherwise transaction_date, otherwise now
      const txDate = payment_date 
        ? new Date(payment_date) 
        : (transaction_date ? new Date(transaction_date) : new Date());
      
      // Use transaction_id as reference_number if provided
      const refNum = data.transaction_id || reference_number || null;
      const bankNm = bank_name || null;
      const notesTxt = notes || null;

      // Use parameterized query to avoid SQL injection
      const paymentResult = await client.query(
        `INSERT INTO payments (tenant_id, invoice_id, payment_number, amount, currency, status, payment_method, reference_number, bank_name, transaction_date, notes, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          tenant_id, 
          invoice_id || null, 
          payment_number, 
          amountNum, 
          currency, 
          'completed', 
          payment_method, 
          refNum, 
          bankNm, 
          txDate, 
          notesTxt, 
          recordedBy
        ]
      );
      const payment = paymentResult.rows[0];

      // Update invoice if linked
      if (invoice_id) {
        const invoiceResult = await client.query('SELECT * FROM invoices WHERE id = $1', [invoice_id]);

        if (invoiceResult.rows.length > 0) {
          const invoice = invoiceResult.rows[0];
          const newAmountPaid = parseFloat(invoice.amount_paid) + amountNum;
          const newAmountDue = parseFloat(invoice.total) - newAmountPaid;
          let newStatus = invoice.status;
          if (newAmountDue <= 0) newStatus = 'paid';

          await client.query(
            // `UPDATE invoices SET amount_paid = $2, amount_due = $3, status = $4, paid_at = CASE WHEN $4 = 'paid' THEN NOW() ELSE paid_at END, updated_at = NOW() WHERE id = $1`,
            // [invoice_id, newAmountPaid, Math.max(0, newAmountDue), newStatus]
            `UPDATE invoices SET amount_paid = ${newAmountPaid}, amount_due = ${Math.max(0, newAmountDue)}, status = '${newStatus}', paid_at = CASE WHEN '${newStatus}' = 'paid' THEN NOW() ELSE paid_at END, updated_at = NOW() WHERE id = '${invoice_id}'`
          );
        }
      }

      await client.query('COMMIT');
      setImmediate(async () => { try { await getAuditService().log({ action: 'CREATE', user_id: recordedBy, tenant_id: tenant_id, resource_type: 'billing', resource_id: payment.id, response_status: 201, metadata: { payment_number: payment.payment_number, amount: amountNum, payment_method, invoice_id: invoice_id || null } }); } catch(e){} });
      return payment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPaymentById(id) {
    const result = await this.pool.query(
      `SELECT p.*, t.name as tenant_name, i.invoice_number FROM payments p
       LEFT JOIN tenants t ON p.tenant_id = t.id LEFT JOIN invoices i ON p.invoice_id = i.id WHERE p.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async listPayments(options = {}) {
    const { tenant_id, invoice_id, status, from_date, to_date, page = 1, limit = 20 } = options;

    let query = `SELECT p.*, t.name as tenant_name, i.invoice_number FROM payments p
                 LEFT JOIN tenants t ON p.tenant_id = t.id LEFT JOIN invoices i ON p.invoice_id = i.id WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (tenant_id) { query += ` AND p.tenant_id = $${paramIndex++}`; params.push(tenant_id); }
    if (invoice_id) { query += ` AND p.invoice_id = $${paramIndex++}`; params.push(invoice_id); }
    if (status) { query += ` AND p.status = $${paramIndex++}`; params.push(status); }
    if (from_date) { query += ` AND p.created_at >= $${paramIndex++}`; params.push(from_date); }
    if (to_date) { query += ` AND p.created_at <= $${paramIndex++}`; params.push(to_date); }

    const countResult = await this.pool.query(query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM'), params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, (page - 1) * limit);

    const result = await this.pool.query(query, params);
    return { payments: result.rows, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  // =====================================================
  // BILLING SUMMARY & REPORTS
  // =====================================================

  async getTenantBillingSummary(tenantId) {
    const openInvoicesResult = await this.pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount_due), 0) as total_due FROM invoices WHERE tenant_id = $1 AND status IN ('sent', 'overdue')`,
      [tenantId]
    );

    const paidThisYearResult = await this.pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE tenant_id = $1 AND status = 'completed' AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())`,
      [tenantId]
    );

    const recentInvoicesResult = await this.pool.query(
      `SELECT id, invoice_number, status, total, amount_due, due_date FROM invoices WHERE tenant_id = $1 ORDER BY invoice_date DESC LIMIT 5`,
      [tenantId]
    );

    const recentPaymentsResult = await this.pool.query(
      `SELECT id, payment_number, amount, payment_method, created_at FROM payments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [tenantId]
    );

    return {
      open_invoices: { count: parseInt(openInvoicesResult.rows[0].count), total_due: parseFloat(openInvoicesResult.rows[0].total_due) },
      paid_this_year: parseFloat(paidThisYearResult.rows[0].total_paid),
      recent_invoices: recentInvoicesResult.rows,
      recent_payments: recentPaymentsResult.rows
    };
  }

  async getRevenueSummary(options = {}) {
    const { from_date, to_date, group_by = 'month' } = options;

    let dateFilter = '';
    const params = [];

    if (from_date) { dateFilter += ' AND p.created_at >= $1'; params.push(from_date); }
    if (to_date) { dateFilter += ` AND p.created_at <= $${params.length + 1}`; params.push(to_date); }

    const groupFormat = group_by === 'day' ? 'YYYY-MM-DD' : group_by === 'week' ? 'IYYY-IW' : 'YYYY-MM';

    const result = await this.pool.query(
      `SELECT TO_CHAR(p.created_at, '${groupFormat}') as period, COUNT(*) as payment_count, SUM(p.amount) as total_revenue
       FROM payments p WHERE p.status = 'completed' ${dateFilter} GROUP BY period ORDER BY period DESC`,
      params
    );

    const totalResult = await this.pool.query(
      `SELECT COUNT(*) as total_payments, COALESCE(SUM(amount), 0) as total_revenue FROM payments WHERE status = 'completed' ${dateFilter}`,
      params
    );

    return { by_period: result.rows, totals: totalResult.rows[0] };
  }
}

// Export fresh instance each time to avoid caching issues
function getBillingService() {
  return new BillingService();
}

module.exports = { BillingService, getBillingService };