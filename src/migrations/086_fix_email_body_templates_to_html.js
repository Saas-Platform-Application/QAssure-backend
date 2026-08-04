'use strict';

/**
 * Migration 086: Convert all plain-text email_body_template values to proper
 * branded HTML. Also ensures every platform notification template has a
 * well-formed, styled HTML email body.
 *
 * Pattern used:  a centered 600px card, QAssure blue header bar, readable
 * typography – matching the existing password-reset/welcome email format.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrap a content block in the standard QAssure email chrome */
function wrap(title, bodyHtml, footerNote = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:24px 32px;">
              <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:-0.5px;">QAssure</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                ${footerNote || 'This is an automated notification from QAssure. Please do not reply to this email.'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Render a "detail row" inside the card */
function detail(label, value) {
  return `<tr>
    <td style="padding:6px 0;color:#64748b;font-size:13px;width:120px;font-weight:600;">${label}</td>
    <td style="padding:6px 0;color:#0f172a;font-size:13px;">{{${value}}}</td>
  </tr>`;
}

/** Standard greeting */
const greeting = `<p style="margin:0 0 16px;color:#0f172a;font-size:15px;">Hi <strong>{{user_name}}</strong>,</p>`;

/** Standard sign-off */
const signoff = `<p style="margin:24px 0 0;color:#64748b;font-size:13px;">If you have any questions, please contact your QAssure administrator.</p>`;

// ---------------------------------------------------------------------------
// Template definitions  (code → { subject, html })
// ---------------------------------------------------------------------------
const TEMPLATES = {

  // ── CAPA ──────────────────────────────────────────────────────────────────

  capa_assigned: wrap('CAPA Assigned', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      You have been assigned as the owner of a Corrective and Preventive Action (CAPA). Please review the details below and take the necessary actions.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('CAPA Number', 'capa_number')}
        ${detail('Title', 'title')}
        ${detail('Priority', 'priority')}
        ${detail('Due Date', 'target_date')}
        ${detail('Status', 'status')}
      </tbody>
    </table>
    <p style="margin:0 0 24px;color:#0f172a;font-size:13px;">Please log in to QAssure to view the full CAPA record and complete any required actions.</p>
    ${signoff}
  `),

  capa_closed: wrap('CAPA Closed', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      We are pleased to inform you that the following CAPA has been successfully closed.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('CAPA Number', 'capa_number')}
        ${detail('Title', 'title')}
        ${detail('Priority', 'priority')}
        ${detail('Due Date', 'target_date')}
        ${detail('Status', 'status')}
      </tbody>
    </table>
    ${signoff}
  `),

  capa_overdue: wrap('CAPA Overdue', `
    ${greeting}
    <p style="margin:0 0 12px;color:#dc2626;font-size:15px;font-weight:600;">
      ⚠️ Action Required: A CAPA assigned to you is now overdue.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7f7;border:1px solid #fecaca;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('CAPA Number', 'capa_number')}
        ${detail('Title', 'title')}
        ${detail('Priority', 'priority')}
        ${detail('Due Date', 'target_date')}
      </tbody>
    </table>
    <p style="margin:0 0 24px;color:#0f172a;font-size:13px;">Please log in immediately to update the status or request an extension.</p>
    ${signoff}
  `),

  // ── Document ──────────────────────────────────────────────────────────────

  document_submitted: wrap('Document Submitted for Review', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      The following document has been submitted for review.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Document No.', 'document_number')}
        ${detail('Title', 'title')}
      </tbody>
    </table>
    <p style="margin:0 0 24px;color:#0f172a;font-size:13px;">Please log in to QAssure to review and approve or reject this document.</p>
    ${signoff}
  `),

  document_approved: wrap('Document Approved', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      Your document has been approved. Great work!
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Document No.', 'document_number')}
        ${detail('Title', 'title')}
      </tbody>
    </table>
    ${signoff}
  `),

  document_rejected: wrap('Document Rejected', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      Your document has been reviewed and returned for revisions. Please review the feedback below.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7f7;border:1px solid #fecaca;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Document No.', 'document_number')}
        ${detail('Title', 'title')}
        ${detail('Reason', 'reason')}
      </tbody>
    </table>
    <p style="margin:0 0 24px;color:#0f172a;font-size:13px;">Please log in to QAssure, address the feedback, and resubmit when ready.</p>
    ${signoff}
  `),

  document_effective: wrap('Document Now Effective', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      The following document has been marked as effective and is now the active, controlled version.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Document No.', 'document_number')}
        ${detail('Title', 'title')}
        ${detail('Effective Date', 'effective_date')}
      </tbody>
    </table>
    ${signoff}
  `),

  document_review_due: wrap('Document Review Due', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      A document assigned to you is due for its periodic review. Please log in to QAssure to complete the review on time.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Document No.', 'document_number')}
        ${detail('Title', 'title')}
        ${detail('Review Date', 'next_review_date')}
      </tbody>
    </table>
    ${signoff}
  `),

  // ── Training ──────────────────────────────────────────────────────────────

  training_assigned: wrap('New Training Assignment', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      A new training course has been assigned to you. Please complete it by the due date shown below.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Course', 'course_title')}
        ${detail('Due Date', 'due_date')}
      </tbody>
    </table>
    <p style="margin:0 0 24px;color:#0f172a;font-size:13px;">Please log in to QAssure to start your training.</p>
    ${signoff}
  `),

  training_completed: wrap('Training Completed', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      The following training assignment has been completed successfully.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('User', 'user_name')}
        ${detail('Course', 'course_title')}
      </tbody>
    </table>
    ${signoff}
  `),

  training_due_soon: wrap('Training Due Soon', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      Your training assignment is coming up soon. Please complete it before the deadline.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Course', 'course_title')}
        ${detail('Due Date', 'due_date')}
      </tbody>
    </table>
    ${signoff}
  `),

  training_overdue: wrap('Training Overdue', `
    ${greeting}
    <p style="margin:0 0 12px;color:#dc2626;font-size:15px;font-weight:600;">⚠️ Action Required: Your training is overdue.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7f7;border:1px solid #fecaca;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Course', 'course_title')}
        ${detail('Due Date', 'due_date')}
      </tbody>
    </table>
    <p style="margin:0 0 24px;color:#0f172a;font-size:13px;">Please log in to QAssure immediately to complete your overdue training.</p>
    ${signoff}
  `),

  // ── Workflow ──────────────────────────────────────────────────────────────

  workflow_task_assigned: wrap('New Workflow Task Assigned', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      A new workflow step has been assigned and is awaiting action from your role.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Step', 'step_name')}
        ${detail('Role', 'role')}
      </tbody>
    </table>
    <p style="margin:0 0 24px;color:#0f172a;font-size:13px;">Please log in to QAssure to review and complete this workflow step.</p>
    ${signoff}
  `),

  task_assigned: wrap('New Workflow Task Assigned', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      A new workflow step has been assigned and is awaiting action from your role.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Step', 'step_name')}
        ${detail('Role', 'role')}
      </tbody>
    </table>
    <p style="margin:0 0 24px;color:#0f172a;font-size:13px;">Please log in to QAssure to review and complete this workflow step.</p>
    ${signoff}
  `),

  role_task_assigned: wrap('New Workflow Task Assigned', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      A new workflow step has been assigned and is awaiting action from your role.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Step', 'step_name')}
        ${detail('Role', 'role')}
      </tbody>
    </table>
    <p style="margin:0 0 24px;color:#0f172a;font-size:13px;">Please log in to QAssure to review and complete this workflow step.</p>
    ${signoff}
  `),

  workflow_task_overdue: wrap('Workflow Task Overdue', `
    ${greeting}
    <p style="margin:0 0 12px;color:#dc2626;font-size:15px;font-weight:600;">⚠️ A workflow task assigned to your role is overdue.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7f7;border:1px solid #fecaca;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Step', 'step_name')}
        ${detail('Due Date', 'due_date')}
      </tbody>
    </table>
    <p style="margin:0 0 24px;color:#0f172a;font-size:13px;">Please log in to QAssure and take action to avoid escalation.</p>
    ${signoff}
  `),

  workflow_escalated: wrap('Workflow Task Escalated to You', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      A workflow task has been escalated and now requires your attention.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Step', 'step_name')}
        ${detail('Escalated To', 'escalated_to')}
      </tbody>
    </table>
    ${signoff}
  `),

  workflow_completed: wrap('Workflow Completed', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      A workflow has been completed successfully.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Entity', 'entity_name')}
        ${detail('Action', 'action')}
      </tbody>
    </table>
    ${signoff}
  `),

  workflow_cancelled: wrap('Workflow Cancelled', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      A workflow has been cancelled. Please see the details below.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7f7;border:1px solid #fecaca;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Entity', 'entity_name')}
        ${detail('Reason', 'reason')}
      </tbody>
    </table>
    ${signoff}
  `),

  // ── Project ───────────────────────────────────────────────────────────────

  project_assigned: wrap('Added to a Project', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      You have been assigned to a project on QAssure. Please see the details below.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Project', 'project_name')}
        ${detail('Your Role', 'role')}
      </tbody>
    </table>
    <p style="margin:0 0 24px;color:#0f172a;font-size:13px;">Please log in to QAssure to view your project dashboard.</p>
    ${signoff}
  `),

  // ── Supplier ──────────────────────────────────────────────────────────────

  supplier_expiring: wrap('Supplier Approval Expiring Soon', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      A supplier approval is approaching its expiry date. Please take action to renew it in time.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Supplier', 'supplier_name')}
        ${detail('Expiry Date', 'expiry_date')}
      </tbody>
    </table>
    ${signoff}
  `),

  supplier_score_dropped: wrap('Supplier Score Alert', `
    ${greeting}
    <p style="margin:0 0 12px;color:#dc2626;font-size:15px;font-weight:600;">⚠️ A supplier score has dropped significantly.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7f7;border:1px solid #fecaca;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('Supplier', 'supplier_name')}
        ${detail('Previous Score', 'old_score')}
        ${detail('New Score', 'new_score')}
      </tbody>
    </table>
    <p style="margin:0 0 24px;color:#0f172a;font-size:13px;">Please log in to QAssure to review this supplier and take corrective action if needed.</p>
    ${signoff}
  `),

  // ── System ────────────────────────────────────────────────────────────────

  file_shared: wrap('A File Has Been Shared With You', `
    ${greeting}
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      A file has been shared with you on QAssure:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${detail('File Name', 'file_name')}
      </tbody>
    </table>
    <p style="margin:0 0 24px;color:#0f172a;font-size:13px;">Please log in to QAssure to access and download the shared file.</p>
    ${signoff}
  `),

  welcome: wrap('Welcome to QAssure', `
    <p style="margin:0 0 16px;color:#0f172a;font-size:15px;">Hi <strong>{{user_name}}</strong>,</p>
    <p style="margin:0 0 20px;color:#0f172a;font-size:15px;">
      Welcome to <strong>QAssure</strong> — your Quality Management platform. Your account is now set up and ready to use.
    </p>
    <p style="margin:0 0 24px;color:#0f172a;font-size:15px;">
      Log in to get started with your team's quality workflows, documents, and compliance management.
    </p>
    ${signoff}
  `),
};

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------
module.exports = {
  async up(queryInterface) {
    let updated = 0;
    for (const [code, html] of Object.entries(TEMPLATES)) {
      // Escape single-quotes for SQL
      const escaped = html.replace(/'/g, "''");
      const result = await queryInterface.sequelize.query(
        `UPDATE notification_templates
         SET email_body_template = '${escaped}', updated_at = NOW()
         WHERE code = '${code}' AND tenant_id IS NULL`
      );
      const rowCount = result[1]?.rowCount ?? 0;
      if (rowCount > 0) {
        console.log(`  ✅ Updated email_body_template for: ${code}`);
        updated++;
      } else {
        console.log(`  ⚠️  No global template found for: ${code} (skipped)`);
      }
    }
    console.log(`✅ Migration 086 complete — ${updated} template(s) updated.`);
  },

  async down(queryInterface) {
    // Revert to plain-text email bodies (no-op is acceptable; just clear HTML)
    for (const code of Object.keys(TEMPLATES)) {
      await queryInterface.sequelize.query(
        `UPDATE notification_templates
         SET email_body_template = '', updated_at = NOW()
         WHERE code = '${code}' AND tenant_id IS NULL`
      );
    }
  }
};
