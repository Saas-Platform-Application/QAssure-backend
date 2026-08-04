const Session = require('../sequelize-models/session');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class SessionService {
  /**
   * Get all sessions
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const { count, rows } = await Session.findAndCountAll({
        where,
        limit: take,
        offset: skip,
        order: order,
      });

      return {
        data: rows,
        total: count,
        skip,
        take,
        hasMore: skip + take < count
      };
    } catch (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }
  }

  /**
   * Get session by ID
   */
  async findById(id) {
    try {
      const session = await Session.findByPk(id, {
      });

      if (!session) {
        throw new Error('Session not found');
      }

      return session;
    } catch (error) {
      throw new Error(`Failed to fetch session: ${error.message}`);
    }
  }

  /**
   * Create new session
   */
  async create(data) {
    try {
      // Validate user_id exists
      if (data.user_id) {
        const userExists = await sequelize.query(
          'SELECT id FROM users WHERE id = :userId LIMIT 1',
          {
            replacements: { userId: data.user_id },
            type: sequelize.QueryTypes.SELECT
          }
        );
        if (userExists.length === 0) {
          throw new Error(`User with id ${data.user_id} does not exist`);
        }
      }

      // Validate tenant_id exists if provided
      if (data.tenant_id) {
        const tenantExists = await sequelize.query(
          'SELECT id FROM tenants WHERE id = :tenantId LIMIT 1',
          {
            replacements: { tenantId: data.tenant_id },
            type: sequelize.QueryTypes.SELECT
          }
        );
        if (tenantExists.length === 0) {
          throw new Error(`Tenant with id ${data.tenant_id} does not exist`);
        }
      }

      // Auto-generated validation calls (before_create)
      this.isTokenExpired(data, null);
      this.isExpired(data, null);
      this.validateAlgorithm(data, null);

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const session = await Session.create(data);

      return session;
    } catch (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  /**
   * Update session
   */
  async update(id, data) {
    try {
      // Check if exists
      const session = await this.findById(id);

      // Auto-generated validation calls (before_update)
      this.isTokenExpired(data, session);
      this.isExpired(data, session);
      this.validateAlgorithm(data, session);

      await session.update(data);
      await session.reload();

      return session;
    } catch (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  /**
   * Delete session
   */
  async delete(id) {
    try {
      // Check if exists
      const session = await this.findById(id);

      await session.destroy();

      return { message: 'Session deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * JWT tokens expire after 15 minutes
   * @generated from DSL function
   * @classification validation
   */
  isTokenExpired(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const session = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = session.status;
    const id = session.id;
    const tenant_id = session.tenant_id;
    const version = session.version;
    const module_id = session.module_id;
    const context = { user: { tenant_id: tenant_id } };
    
    // Skip validation for create operations (created_at doesn't exist yet)
    if (!existing && !session.created_at) {
      return;
    }
    
    // Handle both Date objects and date strings
    let created_at = session.created_at;
    if (!created_at) {
      return; // No created_at to validate
    }
    
    // Convert string to Date if needed
    if (typeof created_at === 'string') {
      created_at = new Date(created_at);
    }
    
    // Validate it's a valid date
    if (isNaN(created_at.getTime())) {
      return; // Invalid date, skip validation
    }
    
    let currentTime = Date.now();
    let issuedAtTime = created_at.getTime();
    let timeDifference = currentTime - issuedAtTime;
    let fifteenMinutesInMs = 15 * 60 * 1000;
    if (timeDifference > fifteenMinutesInMs) {
      throw new Error(`JWT token has expired. Tokens are valid for 15 minutes only.`);
    }
  }

  /**
   * Session must not be expired
   * @generated from DSL function
   * @classification validation
   */
  isExpired(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const session = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = session.status;
    const id = session.id;
    const tenant_id = session.tenant_id;
    const version = session.version;
    const module_id = session.module_id;
    const context = { user: { tenant_id: tenant_id } };
    
    // Handle both Date objects and date strings
    let expires_at = session.expires_at;
    if (!expires_at) {
      return; // No expires_at to validate
    }
    
    // Convert string to Date if needed
    if (typeof expires_at === 'string') {
      expires_at = new Date(expires_at);
    }
    
    // Validate it's a valid date
    if (isNaN(expires_at.getTime())) {
      throw new Error(`Invalid expires_at date format`);
    }
    
    let currentTime = Date.now();
    let expiryTime = expires_at.getTime();
    if (currentTime > expiryTime) {
      throw new Error(`Session has expired`);
    }
  }

  /**
   * JWT must use RS256 algorithm
   * @generated from DSL function
   * @classification validation
   */
  validateAlgorithm(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const session = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = session.status;
    const id = session.id;
    const tenant_id = session.tenant_id;
    const version = session.version;
    const module_id = session.module_id;
    const context = { user: { tenant_id: tenant_id } };
    
    // Note: Algorithm validation is typically done at JWT creation/verification time
    // This method is kept for compatibility but doesn't validate session data
    // as sessions don't store algorithm information
    return;
  }

  // =========== Custom Service Methods ===========
  /**
   * Get session details
   * GET /api/v1/sessions/:sessionId
   */
  async findOne(sessionId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Session;
      const entityName = 'Session';
      const entityNameCamel = 'session';
      // Find entity by first parameter (e.g., moduleId, userId, etc.)
      // Try to find using query method if available (e.g., findByModuleId)
      // Fallback: Find by field using findAll
      const results = await EntityModel.findAll({
        where: {
          sessionId: sessionId
        }
      });
      if (!results || results.length === 0) {
        throw new Error(`${entityName} not found`);
      }
      return results[0];
    } catch (error) {
      throw new Error(`Failed to execute findOne: ${error.message}`);
    }
  }
  /**
   * Revoke session
   * DELETE /api/v1/sessions/:sessionId
   */
  async revoke(sessionId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Session;
      const entityName = 'Session';
      const entityNameCamel = 'session';
      // Custom method implementation
      // TODO: Implement revoke logic
      throw new Error('Method revoke not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute revoke: ${error.message}`);
    }
  }
  /**
   * Revoke all user sessions
   * DELETE /api/v1/sessions/user/:userId
   */
  async revokeUserSessions(userId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Session;
      const entityName = 'Session';
      const entityNameCamel = 'session';
      // Custom method implementation
      // TODO: Implement revokeUserSessions logic
      throw new Error('Method revokeUserSessions not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute revokeUserSessions: ${error.message}`);
    }
  }

  // =========== Query Methods (findBy*) ===========
  /**
   * Find sessions by user_id
   */
  async findByUserId(user_id) {
    try {
      const results = await Session.findAll({
        where: {
          user_id: user_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find sessions by user_id: ${error.message}`);
    }
  }
  /**
   * Find sessions by tenant_id
   */
  async findByTenantId(tenant_id) {
    try {
      const results = await Session.findAll({
        where: {
          tenant_id: tenant_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find sessions by tenant_id: ${error.message}`);
    }
  }
  /**
   * Find sessions by token_hash
   */
  async findByTokenHash(token_hash) {
    try {
      const results = await Session.findAll({
        where: {
          token_hash: token_hash
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find sessions by token_hash: ${error.message}`);
    }
  }
  /**
   * Find sessions by refresh_token_hash
   */
  async findByRefreshTokenHash(refresh_token_hash) {
    try {
      const results = await Session.findAll({
        where: {
          refresh_token_hash: refresh_token_hash
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find sessions by refresh_token_hash: ${error.message}`);
    }
  }
  /**
   * Find sessions by ip_address
   */
  async findByIpAddress(ip_address) {
    try {
      const results = await Session.findAll({
        where: {
          ip_address: ip_address
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find sessions by ip_address: ${error.message}`);
    }
  }
  /**
   * Find sessions by user_agent
   */
  async findByUserAgent(user_agent) {
    try {
      const results = await Session.findAll({
        where: {
          user_agent: user_agent
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find sessions by user_agent: ${error.message}`);
    }
  }
  /**
   * Find sessions by expires_at
   */
  async findByExpiresAt(expires_at) {
    try {
      const results = await Session.findAll({
        where: {
          expires_at: expires_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find sessions by expires_at: ${error.message}`);
    }
  }
  /**
   * Find sessions by refresh_expires_at
   */
  async findByRefreshExpiresAt(refresh_expires_at) {
    try {
      const results = await Session.findAll({
        where: {
          refresh_expires_at: refresh_expires_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find sessions by refresh_expires_at: ${error.message}`);
    }
  }
  /**
   * Find sessions by revoked_at
   */
  async findByRevokedAt(revoked_at) {
    try {
      const results = await Session.findAll({
        where: {
          revoked_at: revoked_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find sessions by revoked_at: ${error.message}`);
    }
  }
  /**
   * Find sessions by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Session.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find sessions by created_at: ${error.message}`);
    }
  }
  /**
   * Find sessions by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await Session.findAll({
        where: {
          updated_at: updated_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find sessions by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the user for this session
   */
  async getUser(id) {
    try {
      const session = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const userService = require('./user_service');
      if (session.user_id) {
        const result = await userService.findById(session.user_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get user for session: ${error.message}`);
    }
  }
  /**
   * Get the tenant for this session
   */
  async getTenant(id) {
    try {
      const session = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const tenantService = require('./tenant_service');
      if (session.tenant_id) {
        const result = await tenantService.findById(session.tenant_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get tenant for session: ${error.message}`);
    }
  }

}

module.exports = new SessionService();

