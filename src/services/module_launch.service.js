/**
 * Module Launch Service - QAssure Platform
 * Handles secure module launch token generation and verification for SSO
 */
const crypto = require("crypto");
const database = require("../config/database");
const {
  getPermissionService,
} = require("../infrastructure/auth/permission.service");
const { getAuditService } = require("./audit.service");
const { getJWTService } = require("../infrastructure/auth/jwt.service");
const { getAuthService } = require("./auth.service");

// Token configuration
const TOKEN_EXPIRY_SECONDS = 60; // 60 seconds
const TOKEN_PREFIX = "mlt_"; // module launch token prefix

class ModuleLaunchService {
  constructor() {
    this.auditService = getAuditService();
    this.permissionService = getPermissionService();
  }

  /**
   * Generate a secure random token
   */
  generateToken() {
    const randomBytes = crypto.randomBytes(32).toString("hex");
    return `${TOKEN_PREFIX}${randomBytes}`;
  }

  /**
   * Hash token for storage
   */
  hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Check if user can launch a specific module
   * @param {Object} user - User object from JWT
   * @param {string} moduleId - Module UUID
   * @param {string} targetTenantId - Target tenant UUID (required for Super Admin)
   * @returns {Object} - { allowed: boolean, effectiveTenantId: string, error?: string }
   */
  async canUserLaunchModule(user, moduleId, targetTenantId = null) {
    // STEP 1: Determine effective tenant
    let effectiveTenantId;
    const isSuperAdmin = await this.permissionService.isSuperAdmin(user.id);
    const isTenantAdmin = user.tenantId
      ? await this.permissionService.isTenantAdmin(user.id, user.tenantId)
      : false;

    if (isSuperAdmin) {
      if (!targetTenantId) {
        return {
          allowed: false,
          error:
            "Super Admin must specify target tenant (tenant_id query parameter)",
        };
      }
      // Verify tenant exists
      const tenantResult = await database.query(
        "SELECT id, name, status FROM tenants WHERE id = $1",
        [targetTenantId],
      );
      if (tenantResult.rows.length === 0) {
        return { allowed: false, error: "Invalid tenant specified" };
      }
      if (tenantResult.rows[0].status !== "active") {
        return { allowed: false, error: "Tenant is not active" };
      }
      effectiveTenantId = targetTenantId;
    } else {
      // Regular user or Tenant Admin - must use their own tenant
      effectiveTenantId = user.tenantId;

      // Security: Reject if trying to access different tenant
      if (targetTenantId && targetTenantId !== user.tenantId) {
        return {
          allowed: false,
          error: "Access denied: Cannot access modules from other tenants",
        };
      }
    }

    // STEP 2: Check module exists and is running
    const moduleResult = await database.query(
      "SELECT id, module_id, name, status, frontend_base_url, backend_base_url FROM modules WHERE id = $1",
      [moduleId],
    );
    if (moduleResult.rows.length === 0) {
      return { allowed: false, error: "Module not found" };
    }
    const module = moduleResult.rows[0];
    if (module.status !== "running") {
      return {
        allowed: false,
        error: `Module is currently unavailable (status: ${module.status})`,
      };
    }

    // STEP 3: Check module is enabled for tenant
    // const tenantAccessResult = await database.query(`
    //   SELECT id, enabled FROM tenant_module_access
    //   WHERE tenant_id = $1 AND module_id = $2
    // `, [effectiveTenantId, moduleId]);

    // STEP 3: Check module is assigned to tenant (from tenant_modules table)
    const tenantModuleResult = await database.query(
      `
      SELECT id, status FROM tenant_modules 
      WHERE tenant_id = $1 AND module_id = $2 AND status = 'active'
    `,
      [effectiveTenantId, moduleId],
    );

    // if (tenantAccessResult.rows.length === 0 || !tenantAccessResult.rows[0].enabled) {
    if (tenantModuleResult.rows.length === 0) {
      return {
        allowed: false,
        // error: 'Module is not available for your organization'
        error: "Module is not assigned to your organization",
      };
    }

    // STEP 4: Check user access
    // CASE A: Super Admin - always allowed (already checked tenant access above)
    if (isSuperAdmin) {
      return {
        allowed: true,
        effectiveTenantId,
        isSuperAdmin: true,
        isTenantAdmin: false,
        module,
      };
    }

    // CASE B: Tenant Admin - allowed for all modules in their tenant
    if (isTenantAdmin) {
      return {
        allowed: true,
        effectiveTenantId,
        isSuperAdmin: false,
        isTenantAdmin: true,
        module,
      };
    }

    // CASE C: Regular user - must be explicitly assigned (captured in user_roles)
    const userAccessResult = await database.query(
      `
      SELECT id FROM user_roles 
      WHERE user_id = $1 
        AND module_id = $2
        AND tenant_id = $3
    `,
      [user.id, moduleId, effectiveTenantId],
    );

    if (userAccessResult.rows.length === 0) {
      return {
        allowed: false,
        error:
          "You do not have access to this module. Contact your administrator.",
      };
    }

    return {
      allowed: true,
      effectiveTenantId,
      isSuperAdmin: false,
      isTenantAdmin: false,
      module,
    };
  }

  /**
   * Generate a launch token for module SSO
   * @param {Object} user - User object from JWT
   * @param {string} moduleId - Module UUID
   * @param {string} targetTenantId - Target tenant (for Super Admin)
   * @param {Object} requestInfo - { ip, userAgent }
   * @returns {Object} - { success, data: { launch_url, expires_in }, error? }
   */
  async generateLaunchToken(user, moduleId, targetTenantId, requestInfo = {}) {
    // Check if user can launch
    const accessCheck = await this.canUserLaunchModule(
      user,
      moduleId,
      targetTenantId,
    );
    if (!accessCheck.allowed) {
      return { success: false, error: accessCheck.error };
    }

    const { effectiveTenantId, isSuperAdmin, isTenantAdmin, module } =
      accessCheck;

    // Get tenant details
    const tenantResult = await database.query(
      "SELECT id, name, slug FROM tenants WHERE id = $1",
      [effectiveTenantId],
    );
    const tenant = tenantResult.rows[0];

    // Get user details (fresh from DB for accuracy)
    const userResult = await database.query(
      "SELECT id, email, first_name, last_name FROM users WHERE id = $1",
      [user.id],
    );
    const userDetails = userResult.rows[0];

    // Generate token
    const plainToken = this.generateToken();
    const tokenHash = this.hashToken(plainToken);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_SECONDS * 1000);

    // Store token
    const tokenId = crypto.randomUUID();
    await database.query(
      `
      INSERT INTO module_launch_tokens (
        id, token_hash, module_id, tenant_id, user_id,
        user_email, user_first_name, user_last_name,
        is_super_admin, is_tenant_admin,
        ip_address, user_agent, expires_at,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10,
        $11, $12, $13,
        NOW(), NOW()
      )
    `,
      [
        tokenId,
        tokenHash,
        moduleId,
        effectiveTenantId,
        user.id,
        userDetails.email,
        userDetails.first_name,
        userDetails.last_name,
        isSuperAdmin,
        isTenantAdmin,
        requestInfo.ip || null,
        requestInfo.userAgent || null,
        expiresAt,
      ],
    );

    // Build launch URL
    const launchUrl = `${module.frontend_base_url}/auth/sso?token=${plainToken}`;

    // Audit log
    await this.auditService.log({
      action: "module.launch_token_generated",
      user_id: user.id,
      tenant_id: effectiveTenantId,
      resource_type: "module",
      resource_id: moduleId,
      metadata: {
        module_id: module.module_id,
        module_name: module.name,
        tenant_name: tenant.name,
        is_super_admin: isSuperAdmin,
        is_tenant_admin: isTenantAdmin,
        token_id: tokenId,
        expires_at: expiresAt.toISOString(),
      },
    });

    return {
      success: true,
      data: {
        launch_url: launchUrl,
        expires_in: TOKEN_EXPIRY_SECONDS,
        module: {
          id: module.id,
          module_id: module.module_id,
          name: module.name,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
        },
      },
    };
  }

  /**
   * Verify a launch token (called by module using its API Key)
   * @param {string} token - Plain launch token
   * @param {Object} apiKey - API Key info from middleware
   * @param {Object} requestInfo - { ip }
   * @returns {Object} - { success, data: { user, tenant, access, module }, error? }
   */
  async verifyLaunchToken(token, apiKey, requestInfo = {}) {
    // Normalize token: trim whitespace and handle URL encoding
    if (!token || typeof token !== "string") {
      return {
        success: false,
        error: "Invalid token format: token is required",
      };
    }

    // Trim whitespace
    token = token.trim();

    // Validate token format
    if (!token.startsWith(TOKEN_PREFIX)) {
      return {
        success: false,
        error: `Invalid token format: token must start with '${TOKEN_PREFIX}'`,
      };
    }

    // Validate token length (prefix + 64 hex characters = 68 characters minimum)
    if (token.length < TOKEN_PREFIX.length + 64) {
      return {
        success: false,
        error: "Invalid token format: token is too short",
      };
    }

    const tokenHash = this.hashToken(token);

    // Find token
    const tokenResult = await database.query(
      `
      SELECT 
        mlt.*,
        m.id as mod_id, m.module_id as mod_code, m.name as mod_name,
        t.id as tenant_uuid, t.name as tenant_name, t.slug as tenant_slug
      FROM module_launch_tokens mlt
      JOIN modules m ON m.id = mlt.module_id
      JOIN tenants t ON t.id = mlt.tenant_id
      WHERE mlt.token_hash = $1
    `,
      [tokenHash],
    );

    if (tokenResult.rows.length === 0) {
      // Log for debugging (without exposing the actual token)
      console.log(
        `[ModuleLaunchService] Token verification failed: hash not found. Token prefix: ${token.substring(0, 10)}..., length: ${token.length}`,
      );

      // Check if there are any recent tokens for this module (for debugging)
      const recentTokensCheck = await database.query(
        `
        SELECT COUNT(*) as count, MAX(created_at) as latest
        FROM module_launch_tokens
        WHERE module_id = $1 AND created_at > NOW() - INTERVAL '5 minutes'
      `,
        [apiKey.moduleId],
      );

      if (recentTokensCheck.rows[0].count > 0) {
        console.log(
          `[ModuleLaunchService] Found ${recentTokensCheck.rows[0].count} recent tokens for module ${apiKey.moduleId}, latest: ${recentTokensCheck.rows[0].latest}`,
        );
      }

      return { success: false, error: "Token not found or invalid" };
    }

    const tokenData = tokenResult.rows[0];

    // Check if token expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < now) {
      const expiredSecondsAgo = Math.floor((now - expiresAt) / 1000);
      return {
        success: false,
        error: `Token has expired (expired ${expiredSecondsAgo} seconds ago)`,
      };
    }

    // Check if token already used
    if (tokenData.used_at) {
      return { success: false, error: "Token has already been used" };
    }

    // SECURITY: Verify API Key belongs to the correct module
    if (apiKey.moduleId !== tokenData.module_id) {
      // Log security violation
      await this.auditService.log({
        action: "module.launch_token_verification_failed",
        user_id: tokenData.user_id,
        tenant_id: tokenData.tenant_id,
        resource_type: "module",
        resource_id: tokenData.module_id,
        metadata: {
          reason: "API Key module mismatch",
          token_module_id: tokenData.module_id,
          api_key_module_id: apiKey.moduleId,
          api_key_id: apiKey.id,
        },
      });
      return {
        success: false,
        error: "API Key is not authorized to verify tokens for this module",
      };
    }

    // Mark token as used
    await database.query(
      `
      UPDATE module_launch_tokens 
      SET used_at = NOW(), 
          used_by_ip = $1,
          verification_module_api_key_id = $2,
          updated_at = NOW()
      WHERE id = $3
    `,
      [requestInfo.ip || null, apiKey.id, tokenData.id],
    );

    // Audit log
    await this.auditService.log({
      action: "module.launch_token_verified",
      user_id: tokenData.user_id,
      tenant_id: tokenData.tenant_id,
      resource_type: "module",
      resource_id: tokenData.module_id,
      metadata: {
        module_id: tokenData.mod_code,
        module_name: tokenData.mod_name,
        tenant_name: tokenData.tenant_name,
        token_id: tokenData.id,
        api_key_id: apiKey.id,
        verified_by_ip: requestInfo.ip,
      },
    });

    // Fetch user's current roles and permissions (live from DB, not snapshot)
    const permissionService = this.permissionService;
    const roles = await permissionService.getUserRolesForModule(
      tokenData.user_id,
      tokenData.tenant_id,
      tokenData.module_id,
    );
    const permissions = await permissionService.getUserPermissionsForModule(
      tokenData.user_id,
      tokenData.tenant_id,
      tokenData.module_id,
    );

    // Fetch expanded user data (department, designation, category, mobile)
    const expandedUserResult = await database.query(
      `
     SELECT 
       u.contact_phone,
       u.department_id,
       u.designation_id,
       u.category,
       u.supplier_id,
       s.name as supplier_name,
       u.user_category_id,
       d.name as department_name,
       d.code as department_code,
       des.name as designation_name,
       des.code as designation_code,
       uc.name as user_category_name,
       uc.code as user_category_code,
       t.logo_file_path
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN designations des ON des.id = u.designation_id
     LEFT JOIN user_categories uc ON uc.id = u.user_category_id
     LEFT JOIN suppliers s ON s.id = u.supplier_id
     LEFT JOIN tenants t ON t.id = $2
     WHERE u.id = $1
   `,
      [tokenData.user_id, tokenData.tenant_id],
    );

    const expandedUser = expandedUserResult.rows[0] || {};

    // Generate module session JWT for platform service calls
    const jwtService = getJWTService();
    const sessionToken = jwtService.generateTokenPair(
      {
        id: tokenData.user_id,
        email: tokenData.user_email,
        tenant_id: tokenData.tenant_id
      },
      roles,
      permissions
    );

    // Create session in DB and cache in Redis
    const authService = getAuthService();
    await authService._createSession(tokenData.user_id, tokenData.tenant_id, sessionToken);

    // Return user info + JWT to module
    return {
      success: true,
      data: {
        user: {
          id: tokenData.user_id,
          email: tokenData.user_email,
          first_name: tokenData.user_first_name,
          last_name: tokenData.user_last_name,
          mobile: expandedUser.contact_phone || null,
          department_id: expandedUser.department_id || null,
          department_name: expandedUser.department_name || null,
          department_code: expandedUser.department_code || null,
          designation_id: expandedUser.designation_id || null,
          designation_name: expandedUser.designation_name || null,
          designation_code: expandedUser.designation_code || null,
          // user_category_id: expandedUser.user_category_id || null,
          // user_category_name: expandedUser.user_category_name || null,
          category: expandedUser.category || null,
          supplier_id: expandedUser.supplier_id || null,
          supplier_name: expandedUser.supplier_name || null,
        },
        tenant: {
          id: tokenData.tenant_uuid,
          name: tokenData.tenant_name,
          slug: tokenData.tenant_slug,
          company_name: tokenData.tenant_name,
          company_logo: expandedUser.logo_file_path || null,
        },
        access: {
          is_super_admin: tokenData.is_super_admin,
          is_tenant_admin: tokenData.is_tenant_admin,
        },
        roles,
        permissions,
        module: {
          id: tokenData.mod_id,
          module_id: tokenData.mod_code,
          name: tokenData.mod_name,
        },
        token: sessionToken.accessToken,
        // access_token: sessionToken.accessToken,
        refresh_token: sessionToken.refreshToken,
        token_type: 'Bearer',
        expires_in: sessionToken.expiresIn,
        expires_at: sessionToken.expiresAt,
        refresh_expires_at: sessionToken.refreshExpiresAt,
        launched_at: tokenData.created_at,
      },
    };
  }

  /**
   * Get modules accessible by current user
   * @param {Object} user - User object from JWT
   * @param {string} targetTenantId - Target tenant (for Super Admin)
   * @returns {Object} - { success, data: [modules] }
   */
  async getAccessibleModules(user, targetTenantId = null) {
    const isSuperAdmin = await this.permissionService.isSuperAdmin(user.id);
    let effectiveTenantId;

    // Determine effective tenant
    if (isSuperAdmin) {
      if (!targetTenantId) {
        // Return empty - Super Admin must select tenant first
        return {
          success: true,
          data: [],
          message: "Super Admin: Please specify tenant_id to view modules",
        };
      }
      effectiveTenantId = targetTenantId;
    } else {
      effectiveTenantId = user.tenantId;
      // Security check
      if (targetTenantId && targetTenantId !== user.tenantId) {
        return {
          success: false,
          error: "Access denied: Cannot view other tenant modules",
        };
      }
    }

    const isTenantAdmin = await this.permissionService.isTenantAdmin(
      user.id,
      effectiveTenantId,
    );

    let query;
    let params;

    if (isSuperAdmin || isTenantAdmin) {
      // Super Admin / Tenant Admin: Get all modules assigned to tenant
      query = `
        SELECT 
          m.id, m.module_id, m.name, m.description, m.version,
          m.status, m.frontend_base_url, m.backend_base_url, m.health_status,
          tm.assigned_at, NULL as tenant_settings
        FROM modules m
        INNER JOIN tenant_modules tm ON tm.module_id = m.id
        WHERE tm.tenant_id = $1
          AND tm.status = 'active'
          AND m.status = 'running'
        ORDER BY m.name ASC
      `;
      params = [effectiveTenantId];
    } else {
      // Regular user: Get modules assigned through:
      // 1. Direct assignment in user_roles (where module_id is set)
      // 2. Role-based assignment (modules assigned to user's roles via role_modules table)
      query = `
        SELECT DISTINCT
          m.id, m.module_id, m.name, m.description, m.version,
          m.status, m.frontend_base_url, m.backend_base_url, m.health_status,
          tm.assigned_at, NULL as tenant_settings
        FROM modules m
        INNER JOIN tenant_modules tm ON tm.module_id = m.id
        WHERE tm.tenant_id = $1
          AND tm.status = 'active'
          AND m.status = 'running'
          AND m.id IN (
            SELECT ur.module_id
            FROM user_roles ur
            WHERE ur.user_id = $2
              AND ur.tenant_id = $1
          )
        ORDER BY m.name ASC
      `;
      params = [effectiveTenantId, user.id];
    }

    const result = await database.query(query, params);

    return {
      success: true,
      data: result.rows,
      meta: {
        tenant_id: effectiveTenantId,
        is_super_admin: isSuperAdmin,
        is_tenant_admin: isTenantAdmin,
        total: result.rows.length,
      },
    };
  }

  /**
   * Clean up expired tokens (called by cron job)
   */
  async cleanupExpiredTokens() {
    const result = await database.query(`
      DELETE FROM module_launch_tokens 
      WHERE expires_at < NOW() - INTERVAL '1 hour'
      RETURNING id
    `);

    console.log(
      `[ModuleLaunchService] Cleaned up ${result.rows.length} expired tokens`,
    );
    return result.rows.length;
  }
}

// Singleton
let instance = null;
const getModuleLaunchService = () => {
  if (!instance) {
    instance = new ModuleLaunchService();
  }
  return instance;
};

module.exports = { ModuleLaunchService, getModuleLaunchService };
