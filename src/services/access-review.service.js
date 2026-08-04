/**
 * Access Review Service
 * Periodic certification that users still need their access
 * 
 * FDA 21 CFR Part 11 §11.10(d) - Limiting system access to authorized individuals
 * 
 * Features:
 * - Create periodic access review campaigns
 * - Assign reviewers (managers) to certify user access
 * - Track decisions (CERTIFY, REVOKE, MODIFY)
 * - Auto-revoke on overdue reviews
 * - Compliance reporting
 */

const { pool } = require('../config/database');
const { getEventService } = require('../infrastructure/kafka');

// Review statuses
const REVIEW_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
};

// Decision types
const DECISION_TYPES = {
  CERTIFY: 'CERTIFY',     // User still needs access
  REVOKE: 'REVOKE',       // Remove all access
  MODIFY: 'MODIFY',       // Change access level
  PENDING: 'PENDING'      // Not yet decided
};

class AccessReviewService {
  constructor() {
    this.pool = pool;
  }

  /**
   * Create a new access review campaign
   */
  async createReview({
    tenantId,
    name,
    description,
    reviewType = 'periodic',
    scopeType = 'all_users',
    scopeCriteria,
    frequency,
    startDate,
    dueDate,
    reviewerId,
    reviewerRole,
    autoRevokeOnOverdue = false,
    autoRevokeAfterDays,
    createdBy
  }) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Validate reviewer_id if provided
      let finalReviewerId = reviewerId || null;
      if (reviewerId) {
        const userCheck = await client.query(
          'SELECT id FROM users WHERE id = $1 LIMIT 1',
          [reviewerId]
        );
        if (userCheck.rows.length === 0) {
          throw new Error(`Reviewer with id ${reviewerId} does not exist`);
        }
        finalReviewerId = reviewerId;
      }

      // If neither reviewer_id nor reviewer_role is provided, use createdBy as default reviewer
      if (!finalReviewerId && !reviewerRole) {
        finalReviewerId = createdBy;
      }

      // 1. Create the review
      const reviewResult = await client.query(
        `INSERT INTO access_reviews (
          tenant_id, name, description, review_type, scope_type, scope_criteria,
          frequency, start_date, due_date, reviewer_id, reviewer_role,
          auto_revoke_on_overdue, auto_revoke_after_days, created_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending')
        RETURNING *`,
        [
          tenantId, name, description, reviewType, scopeType,
          JSON.stringify(scopeCriteria), frequency, startDate, dueDate,
          finalReviewerId, reviewerRole, autoRevokeOnOverdue, autoRevokeAfterDays, createdBy
        ]
      );

      const review = reviewResult.rows[0];

      // 2. Populate review items based on scope
      const users = await this._getUsersInScope(client, tenantId, scopeType, scopeCriteria);

      console.log(`[AccessReview] Creating review ${review.id}: Found ${users.length} users in scope`);

      if (users.length === 0) {
        console.warn(`[AccessReview] No users found for review ${review.id}. Items will be empty.`);
      }

      // Create items for each user
      for (const user of users) {
        try {
          await client.query(
            `INSERT INTO access_review_items (
              review_id, tenant_id, user_id, user_email, user_name,
              current_roles, current_permissions, last_login_at, decision
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
            ON CONFLICT (review_id, user_id) DO NOTHING`,
            [
              review.id, tenantId, user.id, user.email,
              `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
              user.roles || [], user.permissions || [], user.last_login_at
            ]
          );
        } catch (itemError) {
          console.error(`[AccessReview] Failed to create item for user ${user.id}:`, itemError.message);
          // Continue with other users even if one fails
        }
      }

      // 3. Update counts (use actual count from database)
      const itemsCountResult = await client.query(
        `SELECT COUNT(*) as count FROM access_review_items WHERE review_id = $1`,
        [review.id]
      );
      const actualItemsCount = parseInt(itemsCountResult.rows[0].count);

      await client.query(
        `UPDATE access_reviews 
         SET total_users = $1, pending_count = $1, updated_at = NOW()
         WHERE id = $2`,
        [actualItemsCount, review.id]
      );

      console.log(`[AccessReview] Review ${review.id} created with ${actualItemsCount} items`);

      await client.query('COMMIT');

      // 4. Publish event
      try {
        const eventService = getEventService();
        await eventService.publish('qassure.compliance.events', {
          type: 'access_review.created',
          data: {
            reviewId: review.id,
            tenantId,
            totalUsers: users.length,
            dueDate
          }
        });
      } catch (e) {
        console.error('[AccessReview] Kafka error:', e.message);
      }

      return this._formatReview({ ...review, total_users: users.length, pending_count: users.length });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get access review by ID
   */
  async getReview(reviewId, tenantId) {
    const result = await this.pool.query(
      `SELECT ar.*, u.email as reviewer_email, u.first_name as reviewer_first_name, u.last_name as reviewer_last_name
       FROM access_reviews ar
       LEFT JOIN users u ON ar.reviewer_id = u.id
       WHERE ar.id = $1 AND ar.tenant_id = $2`,
      [reviewId, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this._formatReview(result.rows[0]);
  }

  /**
   * List access reviews for tenant
   */
  async listReviews(tenantId, options = {}) {
    const { status, limit = 20, offset = 0 } = options;

    let query = `
      SELECT ar.*, u.email as reviewer_email
      FROM access_reviews ar
      LEFT JOIN users u ON ar.reviewer_id = u.id
      WHERE ar.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      query += ` AND ar.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY ar.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) FROM access_reviews WHERE tenant_id = $1';
    const countParams = [tenantId];
    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }

    const countResult = await this.pool.query(countQuery, countParams);

    return {
      reviews: result.rows.map(r => this._formatReview(r)),
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Get review items (users to review)
   */
  async getReviewItems(reviewId, tenantId, options = {}) {
    const { decision, limit = 50, offset = 0 } = options;

    let query = `
      SELECT * FROM access_review_items
      WHERE review_id = $1 AND tenant_id = $2
    `;
    const params = [reviewId, tenantId];
    let paramIndex = 3;

    if (decision) {
      // Normalize decision to uppercase for case-insensitive matching
      const normalizedDecision = decision.toUpperCase().trim();
      query += ` AND UPPER(decision) = $${paramIndex++}`;
      params.push(normalizedDecision);
    }

    query += ` ORDER BY user_name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    return {
      items: result.rows.map(item => this._formatReviewItem(item)),
      limit,
      offset
    };
  }

  /**
   * Make a decision on a user's access
   */
  async makeDecision({
    reviewId,
    tenantId,
    itemId,
    decision,
    decisionReason,
    newRoles,
    decidedBy
  }) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Validate and normalize decision (case-insensitive)
      const normalizedDecision = decision ? decision.toUpperCase().trim() : null;
      if (!normalizedDecision || !Object.values(DECISION_TYPES).includes(normalizedDecision)) {
        throw new Error(`Invalid decision. Must be one of: ${Object.values(DECISION_TYPES).join(', ')}`);
      }
      
      // Use normalized decision
      const finalDecision = normalizedDecision;

      // Update the item
      const itemResult = await client.query(
        `UPDATE access_review_items
         SET decision = $1, decision_reason = $2, new_roles = $3,
             decided_by = $4, decided_at = NOW()
         WHERE id = $5 AND review_id = $6 AND tenant_id = $7
         RETURNING *`,
        [finalDecision, decisionReason, newRoles, decidedBy, itemId, reviewId, tenantId]
      );

      if (itemResult.rows.length === 0) {
        throw new Error('Review item not found');
      }

      // Update review counts
      await this._updateReviewCounts(client, reviewId);

      // Check if review is complete
      const review = await this._checkReviewCompletion(client, reviewId, tenantId);

      await client.query('COMMIT');

      return {
        item: this._formatReviewItem(itemResult.rows[0]),
        reviewComplete: review.status === REVIEW_STATUS.COMPLETED
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Bulk certify all pending items (for quick approval)
   */
  async bulkCertify(reviewId, tenantId, decidedBy, reason = 'Bulk certification') {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE access_review_items
         SET decision = 'CERTIFY', decision_reason = $1,
             decided_by = $2, decided_at = NOW()
         WHERE review_id = $3 AND tenant_id = $4 AND decision = 'PENDING'
         RETURNING id`,
        [reason, decidedBy, reviewId, tenantId]
      );

      const updatedCount = result.rows.length;

      // Update counts and check completion
      await this._updateReviewCounts(client, reviewId);
      await this._checkReviewCompletion(client, reviewId, tenantId);

      await client.query('COMMIT');

      return { updated: updatedCount };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute review decisions (actually revoke/modify access)
   */
  async executeDecisions(reviewId, tenantId, executedBy) {
    const client = await this.pool.connect();
    const results = { revoked: 0, modified: 0, errors: [] };

    try {
      await client.query('BEGIN');

      // Get all items with REVOKE or MODIFY decisions that haven't been executed
      const itemsResult = await client.query(
        `SELECT * FROM access_review_items
         WHERE review_id = $1 AND tenant_id = $2 
         AND decision IN ('REVOKE', 'MODIFY') AND executed = FALSE`,
        [reviewId, tenantId]
      );

      for (const item of itemsResult.rows) {
        try {
          if (item.decision === 'REVOKE') {
            // Revoke all roles
            await client.query(
              'DELETE FROM user_roles WHERE user_id = $1',
              [item.user_id]
            );
            
            // Optionally deactivate user
            await client.query(
              'UPDATE users SET is_active = FALSE WHERE id = $1',
              [item.user_id]
            );

            results.revoked++;
          } else if (item.decision === 'MODIFY' && item.new_roles) {
            // Remove existing roles
            await client.query(
              'DELETE FROM user_roles WHERE user_id = $1',
              [item.user_id]
            );

            // Add new roles
            for (const roleName of item.new_roles) {
              const roleResult = await client.query(
                'SELECT id FROM roles WHERE name = $1 AND tenant_id = $2',
                [roleName, tenantId]
              );

              if (roleResult.rows.length > 0) {
                await client.query(
                  'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                  [item.user_id, roleResult.rows[0].id]
                );
              }
            }

            results.modified++;
          }

          // Mark as executed
          await client.query(
            `UPDATE access_review_items
             SET executed = TRUE, executed_at = NOW()
             WHERE id = $1`,
            [item.id]
          );

        } catch (itemError) {
          results.errors.push({
            itemId: item.id,
            userId: item.user_id,
            error: itemError.message
          });

          await client.query(
            `UPDATE access_review_items
             SET execution_error = $1
             WHERE id = $2`,
            [itemError.message, item.id]
          );
        }
      }

      await client.query('COMMIT');

      // Publish event
      try {
        const eventService = getEventService();
        await eventService.publish('qassure.compliance.events', {
          type: 'access_review.executed',
          data: {
            reviewId,
            tenantId,
            revoked: results.revoked,
            modified: results.modified,
            executedBy
          }
        });
      } catch (e) {
        console.error('[AccessReview] Kafka error:', e.message);
      }

      return results;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check for overdue reviews and handle auto-revoke
   */
  async processOverdueReviews() {
    const client = await this.pool.connect();
    const results = { overdueReviews: 0, autoRevoked: 0 };

    try {
      // Mark overdue reviews
      const overdueResult = await client.query(
        `UPDATE access_reviews
         SET status = 'overdue'
         WHERE status IN ('pending', 'in_progress')
         AND due_date < CURRENT_DATE
         RETURNING id, tenant_id, auto_revoke_on_overdue, auto_revoke_after_days`
      );

      results.overdueReviews = overdueResult.rows.length;

      // Process auto-revoke
      for (const review of overdueResult.rows) {
        if (review.auto_revoke_on_overdue && review.auto_revoke_after_days) {
          const revokeDate = new Date(review.due_date);
          revokeDate.setDate(revokeDate.getDate() + review.auto_revoke_after_days);

          if (new Date() >= revokeDate) {
            // Revoke pending items
            const revokeResult = await client.query(
              `UPDATE access_review_items
               SET decision = 'REVOKE', decision_reason = 'Auto-revoked due to overdue review',
                   decided_at = NOW()
               WHERE review_id = $1 AND decision = 'PENDING'
               RETURNING id`,
              [review.id]
            );

            results.autoRevoked += revokeResult.rows.length;
          }
        }
      }

      return results;

    } finally {
      client.release();
    }
  }

  /**
   * Get compliance report for access reviews
   */
  async getComplianceReport(tenantId, options = {}) {
    const { year } = options;

    // Create year filters with proper table aliases to avoid ambiguity
    const yearFilterSingle = year ? 'AND EXTRACT(YEAR FROM created_at) = $2' : '';
    const yearFilterJoined = year ? 'AND EXTRACT(YEAR FROM ar.created_at) = $2' : '';
    const params = year ? [tenantId, year] : [tenantId];

    // Review statistics
    const reviewStats = await this.pool.query(
      `SELECT 
         COUNT(*) as total_reviews,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_reviews,
         COUNT(*) FILTER (WHERE status = 'overdue') as overdue_reviews,
         AVG(CASE WHEN status = 'completed' 
             THEN EXTRACT(EPOCH FROM (completed_at - start_date)) / 86400 
             END) as avg_completion_days
       FROM access_reviews
       WHERE tenant_id = $1 ${yearFilterSingle}`,
      params
    );

    // Decision statistics
    const decisionStats = await this.pool.query(
      `SELECT 
         decision,
         COUNT(*) as count
       FROM access_review_items ari
       JOIN access_reviews ar ON ari.review_id = ar.id
       WHERE ar.tenant_id = $1 ${yearFilterJoined}
       GROUP BY decision`,
      params
    );

    // Monthly trend
    const monthlyTrend = await this.pool.query(
      `SELECT 
         TO_CHAR(ar.created_at, 'YYYY-MM') as month,
         COUNT(DISTINCT ar.id) as reviews,
         COUNT(ari.id) as users_reviewed
       FROM access_reviews ar
       LEFT JOIN access_review_items ari ON ar.id = ari.review_id
       WHERE ar.tenant_id = $1 ${yearFilterJoined}
       GROUP BY TO_CHAR(ar.created_at, 'YYYY-MM')
       ORDER BY month DESC
       LIMIT 12`,
      params
    );

    return {
      summary: reviewStats.rows[0],
      decisions: decisionStats.rows.reduce((acc, row) => {
        acc[row.decision] = parseInt(row.count);
        return acc;
      }, {}),
      monthly_trend: monthlyTrend.rows,
      compliance_rate: this._calculateComplianceRate(reviewStats.rows[0])
    };
  }

  /**
   * Start a review (change status to in_progress)
   * If no items exist, populate them based on scope
   */
  async startReview(reviewId, tenantId) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get the review
      const reviewResult = await client.query(
        `SELECT * FROM access_reviews WHERE id = $1 AND tenant_id = $2`,
        [reviewId, tenantId]
      );

      if (reviewResult.rows.length === 0) {
        throw new Error('Review not found');
      }

      const review = reviewResult.rows[0];

      if (review.status !== 'pending') {
        throw new Error('Review is not in pending status');
      }

      // Check if items exist
      const itemsCheck = await client.query(
        `SELECT COUNT(*) as count FROM access_review_items WHERE review_id = $1`,
        [reviewId]
      );

      const itemsCount = parseInt(itemsCheck.rows[0].count);

      // If no items exist, populate them
      if (itemsCount === 0) {
        const users = await this._getUsersInScope(
          client,
          tenantId,
          review.scope_type,
          review.scope_criteria
        );

        for (const user of users) {
          await client.query(
            `INSERT INTO access_review_items (
              review_id, tenant_id, user_id, user_email, user_name,
              current_roles, current_permissions, last_login_at, decision
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')`,
            [
              review.id, tenantId, user.id, user.email,
              `${user.first_name} ${user.last_name}`,
              user.roles, user.permissions, user.last_login_at
            ]
          );
        }

        // Update counts
        await client.query(
          `UPDATE access_reviews 
           SET total_users = $1, pending_count = $1, updated_at = NOW()
           WHERE id = $2`,
          [users.length, review.id]
        );
      }

      // Update status to in_progress
      const updateResult = await client.query(
        `UPDATE access_reviews
         SET status = 'in_progress', updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2
         RETURNING *`,
        [reviewId, tenantId]
      );

      await client.query('COMMIT');

      return this._formatReview(updateResult.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel a review
   */
  async cancelReview(reviewId, tenantId, cancelledBy, reason) {
    const result = await this.pool.query(
      `UPDATE access_reviews
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status IN ('pending', 'in_progress')
       RETURNING *`,
      [reviewId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error('Review not found or cannot be cancelled');
    }

    return this._formatReview(result.rows[0]);
  }

  /**
   * Populate review items for an existing review
   * Useful if items weren't created during review creation
   */
  async populateReviewItems(reviewId, tenantId) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get the review
      const reviewResult = await client.query(
        `SELECT * FROM access_reviews WHERE id = $1 AND tenant_id = $2`,
        [reviewId, tenantId]
      );

      if (reviewResult.rows.length === 0) {
        throw new Error('Review not found');
      }

      const review = reviewResult.rows[0];

      // Check if items already exist
      const itemsCheck = await client.query(
        `SELECT COUNT(*) as count FROM access_review_items WHERE review_id = $1`,
        [reviewId]
      );

      const existingCount = parseInt(itemsCheck.rows[0].count);
      if (existingCount > 0) {
        await client.query('COMMIT');
        return { message: 'Items already exist', count: existingCount };
      }

      // Get users in scope
      const users = await this._getUsersInScope(
        client,
        tenantId,
        review.scope_type,
        review.scope_criteria
      );

      // Create items for each user
      for (const user of users) {
        await client.query(
          `INSERT INTO access_review_items (
            review_id, tenant_id, user_id, user_email, user_name,
            current_roles, current_permissions, last_login_at, decision
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')`,
          [
            review.id, tenantId, user.id, user.email,
            `${user.first_name} ${user.last_name}`,
            user.roles, user.permissions, user.last_login_at
          ]
        );
      }

      // Update counts
      await client.query(
        `UPDATE access_reviews 
         SET total_users = $1, pending_count = $1, updated_at = NOW()
         WHERE id = $2`,
        [users.length, review.id]
      );

      await client.query('COMMIT');

      return { message: 'Items populated successfully', count: users.length };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Private helper methods

  async _getUsersInScope(client, tenantId, scopeType, scopeCriteria) {
    // Parse scopeCriteria if it's a string (from database JSONB)
    let parsedCriteria = scopeCriteria;
    if (typeof scopeCriteria === 'string') {
      try {
        parsedCriteria = JSON.parse(scopeCriteria);
      } catch (e) {
        console.warn('[AccessReview] Failed to parse scopeCriteria:', e.message);
        parsedCriteria = {};
      }
    }
    if (!parsedCriteria) {
      parsedCriteria = {};
    }

    let query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.last_login_at,
             COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as roles,
             COALESCE(array_agg(DISTINCT (p.resource || ':' || p.action)) FILTER (WHERE p.resource IS NOT NULL), ARRAY[]::text[]) as permissions
      FROM users u
      INNER JOIN user_tenants ut ON u.id = ut.user_id AND ut.tenant_id = $1 AND LOWER(ut.status) = 'active'
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.tenant_id = $1
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN permissions p ON p.role_id = r.id
      WHERE LOWER(u.status) = 'active'
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (scopeType === 'specific_users' && parsedCriteria?.user_ids && Array.isArray(parsedCriteria.user_ids) && parsedCriteria.user_ids.length > 0) {
      // Filter by specific user IDs
      query += ` AND u.id = ANY($${paramIndex++})`;
      params.push(parsedCriteria.user_ids);
    } else if (scopeType === 'role' && parsedCriteria?.roles) {
      // Filter by roles
      query += ` AND r.name = ANY($${paramIndex++})`;
      params.push(parsedCriteria.roles);
    }
    // For 'all_users', no additional filter is needed

    query += ` GROUP BY u.id, u.email, u.first_name, u.last_name, u.last_login_at`;

    const result = await client.query(query, params);
    
    // Log for debugging
    if (result.rows.length === 0) {
      console.warn(`[AccessReview] No users found for scope: type=${scopeType}, tenantId=${tenantId}, criteria=${JSON.stringify(parsedCriteria)}`);
    } else {
      console.log(`[AccessReview] Found ${result.rows.length} users for scope: type=${scopeType}, tenantId=${tenantId}`);
    }
    
    return result.rows;
  }

  async _updateReviewCounts(client, reviewId) {
    await client.query(
      `UPDATE access_reviews ar
       SET 
         certified_count = (SELECT COUNT(*) FROM access_review_items WHERE review_id = ar.id AND decision = 'CERTIFY'),
         revoked_count = (SELECT COUNT(*) FROM access_review_items WHERE review_id = ar.id AND decision = 'REVOKE'),
         pending_count = (SELECT COUNT(*) FROM access_review_items WHERE review_id = ar.id AND decision = 'PENDING'),
         updated_at = NOW()
       WHERE id = $1`,
      [reviewId]
    );
  }

  async _checkReviewCompletion(client, reviewId, tenantId) {
    const result = await client.query(
      `SELECT * FROM access_reviews WHERE id = $1 AND tenant_id = $2`,
      [reviewId, tenantId]
    );

    const review = result.rows[0];

    if (review.pending_count === 0 && review.status !== 'completed') {
      await client.query(
        `UPDATE access_reviews
         SET status = 'completed', completed_at = NOW()
         WHERE id = $1`,
        [reviewId]
      );
      review.status = 'completed';
    } else if (review.pending_count > 0 && review.status === 'pending') {
      await client.query(
        `UPDATE access_reviews SET status = 'in_progress' WHERE id = $1`,
        [reviewId]
      );
      review.status = 'in_progress';
    }

    return review;
  }

  _calculateComplianceRate(stats) {
    if (!stats.total_reviews || stats.total_reviews === 0) {
      return 100;
    }
    const completed = parseInt(stats.completed_reviews) || 0;
    const total = parseInt(stats.total_reviews);
    return Math.round((completed / total) * 100);
  }

  _formatReview(row) {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      description: row.description,
      review_type: row.review_type,
      scope: {
        type: row.scope_type,
        criteria: row.scope_criteria
      },
      schedule: {
        frequency: row.frequency,
        start_date: row.start_date,
        due_date: row.due_date
      },
      reviewer: row.reviewer_id ? {
        id: row.reviewer_id,
        email: row.reviewer_email,
        name: row.reviewer_first_name ? `${row.reviewer_first_name} ${row.reviewer_last_name}` : null
      } : null,
      status: row.status,
      counts: {
        total: row.total_users,
        certified: row.certified_count,
        revoked: row.revoked_count,
        pending: row.pending_count
      },
      auto_revoke: {
        enabled: row.auto_revoke_on_overdue,
        after_days: row.auto_revoke_after_days
      },
      completed_at: row.completed_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  _formatReviewItem(row) {
    return {
      id: row.id,
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name,
        last_login: row.last_login_at
      },
      current_access: {
        roles: row.current_roles,
        permissions: row.current_permissions
      },
      decision: row.decision,
      decision_reason: row.decision_reason,
      new_roles: row.new_roles,
      decided_by: row.decided_by,
      decided_at: row.decided_at,
      executed: row.executed,
      executed_at: row.executed_at
    };
  }
}

// Singleton
let instance = null;

const getAccessReviewService = () => {
  if (!instance) {
    instance = new AccessReviewService();
  }
  return instance;
};

module.exports = {
  AccessReviewService,
  getAccessReviewService,
  REVIEW_STATUS,
  DECISION_TYPES
};
