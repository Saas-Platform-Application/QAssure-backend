/**
 * Auth Service - QAssure Platform
 * Business logic for authentication using raw SQL + Redis caching
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const database = require('../config/database');
const config = require('../config/config');
const { getJWTService } = require('../infrastructure/auth/jwt.service');
const { getPermissionService } = require('../infrastructure/auth/permission.service');
const { getEmailService } = require('../infrastructure/email/email.service');
const { getAuditService } = require('./audit.service');
const { getNotificationService } = require('./notification.service');
const { getEventService } = require('../infrastructure/kafka');
const { getPasswordPolicyService } = require('./password-policy.service');
const { formatDateTime } = require('../utils/dateFormatter');

class AuthService {
  constructor() {
    this.jwtService = getJWTService();
    this.permissionService = getPermissionService();
    this.emailService = getEmailService();
    this.auditService = getAuditService();
    this.eventService = getEventService();
    this.redisService = null;
  }

  /**
   * Set Redis service for session caching
   */
  setRedisService(redisService) {
    this.redisService = redisService;
    console.log('[AuthService] Redis session caching enabled');
  }

  /**
   * Register a new user
   */
  async register(data) {
    const { email, password, first_name, last_name, tenant_id } = data;

    // Check if email already exists
    const existingUser = await database.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new AuthError('EMAIL_EXISTS', 'An account with this email already exists');
    }

    // Validate tenant exists
    let tenantId = tenant_id;
    if (tenantId) {
      const tenantResult = await database.query(
        'SELECT id, name FROM tenants WHERE id = $1 AND status = $2',
        [tenantId, 'active']
      );
      if (tenantResult.rows.length === 0) {
        throw new AuthError('INVALID_TENANT', 'Invalid or inactive tenant');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const userId = crypto.randomUUID();
    const userQuery = `
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, 
        status, auth_provider, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, email, first_name, last_name, status
    `;
    
    const userResult = await database.query(userQuery, [
      userId,
      email.toLowerCase(),
      passwordHash,
      first_name,
      last_name,
      'pending_verification',
      'local'
    ]);

    const user = userResult.rows[0];

    // Store verification token in Redis (or fallback)
    await this._storeVerificationToken(userId, verificationToken, verificationExpires);

    // If tenant specified, add user to tenant
    if (tenantId) {
      await database.query(`
        INSERT INTO user_tenants (id, user_id, tenant_id, status, is_primary, created_at)
        VALUES ($1, $2, $3, 'active', true, NOW())
      `, [crypto.randomUUID(), userId, tenantId]);

      // Assign default role (viewer)
      const viewerRole = await database.query(
        "SELECT id FROM roles WHERE code = 'viewer' LIMIT 1"
      );
      if (viewerRole.rows.length > 0) {
        await database.query(`
          INSERT INTO user_roles (id, user_id, role_id, tenant_id, created_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, [crypto.randomUUID(), userId, viewerRole.rows[0].id, tenantId]);
      }
    }

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(email, first_name, verificationToken, tenantId);
    } catch (emailErr) {
      console.error('[AuthService] Failed to send verification email:', emailErr.message);
      // Don't fail registration if email fails
    }

    // Publish user created event
    this.eventService.publishUserCreated(user, {
      tenantId: tenantId || null,
      userId: user.id
    }).catch(err => console.warn('[AuthService] Failed to publish user created event:', err.message));

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        status: user.status
      },
      message: 'Registration successful. Please check your email to verify your account.'
    };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token) {
    // Get token data
    const tokenData = await this._getVerificationToken(token);
    
    if (!tokenData) {
      throw new AuthError('INVALID_TOKEN', 'Invalid or expired verification token');
    }

    const { userId, expiresAt } = tokenData;

    if (new Date(expiresAt) < new Date()) {
      await this._deleteVerificationToken(token);
      throw new AuthError('TOKEN_EXPIRED', 'Verification token has expired');
    }

    // Update user status
    const result = await database.query(`
      UPDATE users 
      SET status = 'active', updated_at = NOW()
      WHERE id = $1 AND status = 'pending_verification'
      RETURNING id, email, first_name
    `, [userId]);

    if (result.rows.length === 0) {
      throw new AuthError('ALREADY_VERIFIED', 'Email already verified or user not found');
    }

    const user = result.rows[0];

    // Delete verification token
    await this._deleteVerificationToken(token);

    // Get tenant name for welcome email
    const tenantResult = await database.query(`
      SELECT t.name FROM tenants t
      JOIN user_tenants ut ON ut.tenant_id = t.id
      WHERE ut.user_id = $1 AND ut.is_primary = true
      LIMIT 1
    `, [userId]);

    const tenantName = tenantResult.rows[0]?.name || 'QAssure';

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(user.email, user.first_name, tenantName, userId);
    } catch (emailErr) {
      console.error('[AuthService] Failed to send welcome email:', emailErr.message);
    }

    // Publish email verified event
    this.eventService.publishEmailVerified(userId, user.email, {
      userId: user.id
    }).catch(err => console.warn('[AuthService] Failed to publish email verified event:', err.message));

    return { success: true, message: 'Email verified successfully' };
  }

  /**
   * Resend verification email
   */
  async resendVerification(email) {
    const userResult = await database.query(`
      SELECT id, email, first_name, status FROM users
      WHERE email = $1
    `, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists
      return { success: true, message: 'If the email exists, a verification link has been sent.' };
    }

    const user = userResult.rows[0];

    if (user.status !== 'pending_verification') {
      return { success: true, message: 'If the email exists, a verification link has been sent.' };
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this._storeVerificationToken(user.id, verificationToken, verificationExpires);

    // Get tenant context properly
    const tenantContextRes = await database.query(`
      SELECT ur.tenant_id, r.code as role_code
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY CASE WHEN r.code = 'super_admin' THEN 1 ELSE 2 END
      LIMIT 1
    `, [user.id]);
    
    let emailTenantId = null;
    if (tenantContextRes.rows.length > 0 && tenantContextRes.rows[0].role_code !== 'super_admin') {
      emailTenantId = tenantContextRes.rows[0].tenant_id;
    }

    // Send email
    try {
      await this.emailService.sendVerificationEmail(user.email, user.first_name, verificationToken, emailTenantId);
    } catch (emailErr) {
      console.error('[AuthService] Failed to send verification email:', emailErr.message);
    }

    return { success: true, message: 'If the email exists, a verification link has been sent.' };
  }

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    const userResult = await database.query(`
      SELECT id, email, first_name, status FROM users
      WHERE email = $1 AND status = 'active'
    `, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      throw new AuthError('EMAIL_NOT_REGISTERED', 'Email is not registered in the application');
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Get user's primary tenant for policy enforcement
    const tenantResult = await database.query(
      'SELECT tenant_id FROM user_tenants WHERE user_id = $1 AND is_primary = true LIMIT 1',
      [user.id]
    );
    const tenantId = tenantResult.rows[0]?.tenant_id;

    await this._storeResetToken(user.id, resetToken, resetExpires, tenantId);

    // Publish password reset requested event
    this.eventService.publishPasswordResetRequested(email, {}).catch(() => {});

    // Send reset email
    try {
      // Get tenant context properly by checking user_roles
      const tenantContextRes = await database.query(`
        SELECT ur.tenant_id, r.code as role_code
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1
        ORDER BY CASE WHEN r.code = 'super_admin' THEN 1 ELSE 2 END
        LIMIT 1
      `, [user.id]);
      
      let emailTenantId = null;
      if (tenantContextRes.rows.length > 0 && tenantContextRes.rows[0].role_code !== 'super_admin') {
        emailTenantId = tenantContextRes.rows[0].tenant_id;
      }
      
      await this.emailService.sendPasswordResetEmail(user.email, user.first_name, resetToken, emailTenantId);
    } catch (emailErr) {
      console.error('[AuthService] Failed to send reset email:', emailErr.message);
      throw new AuthError('EMAIL_SEND_FAILED', 'Failed to send password reset email');
    }

    return { success: true, message: 'Password reset link has been sent to your email.' };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    // Get token data
    const tokenData = await this._getResetToken(token);

    if (!tokenData) {
      throw new AuthError('INVALID_TOKEN', 'Invalid or expired reset token');
    }

    const { userId, expiresAt, tenantId } = tokenData;

    if (new Date(expiresAt) < new Date()) {
      await this._deleteResetToken(token);
      throw new AuthError('TOKEN_EXPIRED', 'Password reset token has expired');
    }

    // NEW: Enforce Password Policy
    const policyService = getPasswordPolicyService();
    const userQuery = await database.query('SELECT email FROM users WHERE id = $1', [userId]);
    const userEmail = userQuery.rows[0]?.email;
    
    // Default to a system tenant if none is associated with the token
    const effectiveTenantId = tenantId || (await database.query('SELECT tenant_id FROM user_tenants WHERE user_id = $1 AND is_primary = true LIMIT 1', [userId])).rows[0]?.tenant_id;

    const validation = await policyService.validatePassword(effectiveTenantId, userId, newPassword, userEmail);
    if (!validation.valid) {
      throw new AuthError('PASSWORD_POLICY_VIOLATION', validation.errors.join(', '));
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    const result = await database.query(`
      UPDATE users 
      SET password_hash = $1, force_password_reset = false, password_changed_at = NOW(), updated_at = NOW()
      WHERE id = $2 AND status = 'active'
      RETURNING id, email, first_name
    `, [passwordHash, userId]);

    if (result.rows.length === 0) {
      throw new AuthError('USER_NOT_FOUND', 'User not found');
    }

    const user = result.rows[0];

    // Add to password history
    await policyService.addToHistory(userId, effectiveTenantId, passwordHash, 'reset');
    
    // Set new expiry date based on policy
    await policyService.setPasswordExpiry(userId, effectiveTenantId);

    // Delete reset token
    await this._deleteResetToken(token);

    // Publish password reset completed event
    this.eventService.publishPasswordResetCompleted(userId, { userId }).catch(() => {});

    // Revoke all sessions for security
    await this.logoutAll(userId);

    // Send notification email
    try {
      // Get tenant context properly
      const tenantContextRes = await database.query(`
        SELECT ur.tenant_id, r.code as role_code
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1
        ORDER BY CASE WHEN r.code = 'super_admin' THEN 1 ELSE 2 END
        LIMIT 1
      `, [user.id]);
      
      let emailTenantId = null;
      if (tenantContextRes.rows.length > 0 && tenantContextRes.rows[0].role_code !== 'super_admin') {
        emailTenantId = tenantContextRes.rows[0].tenant_id;
      }
      
      await this.emailService.sendPasswordChangedEmail(user.email, user.first_name, emailTenantId);
    } catch (emailErr) {
      console.error('[AuthService] Failed to send password changed email:', emailErr.message);
    }

    return { success: true, message: 'Password reset successfully. Please login with your new password.' };
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Get user
    const userResult = await database.query(
      'SELECT id, email, first_name, password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AuthError('USER_NOT_FOUND', 'User not found');
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new AuthError('INVALID_PASSWORD', 'Current password is incorrect');
    }

    // NEW: Enforce Password Policy
    const policyService = getPasswordPolicyService();
    // Get tenant for policy
    const tenantQuery = await database.query('SELECT tenant_id FROM user_tenants WHERE user_id = $1 AND is_primary = true LIMIT 1', [userId]);
    const tenantId = tenantQuery.rows[0]?.tenant_id;

    const validation = await policyService.validatePassword(tenantId, userId, newPassword, user.email);
    if (!validation.valid) {
      throw new AuthError('PASSWORD_POLICY_VIOLATION', validation.errors.join(', '));
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await database.query(
      'UPDATE users SET password_hash = $1, force_password_reset = false, password_changed_at = NOW(), updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );

    // Add to password history
    await policyService.addToHistory(userId, tenantId, passwordHash, 'user_initiated');
    
    // Set new expiry date
    await policyService.setPasswordExpiry(userId, tenantId);

    // Send notification
    try {
      // Get tenant context properly
      const tenantContextRes = await database.query(`
        SELECT ur.tenant_id, r.code as role_code
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1
        ORDER BY CASE WHEN r.code = 'super_admin' THEN 1 ELSE 2 END
        LIMIT 1
      `, [userId]);
      
      let emailTenantId = null;
      if (tenantContextRes.rows.length > 0 && tenantContextRes.rows[0].role_code !== 'super_admin') {
        emailTenantId = tenantContextRes.rows[0].tenant_id;
      }
      
      await this.emailService.sendPasswordChangedEmail(user.email, user.first_name, emailTenantId);
    } catch (emailErr) {
      console.error('[AuthService] Failed to send password changed email:', emailErr.message);
    }

    // Publish password changed event
    this.eventService.publishPasswordChanged(userId, {
      userId: user.id
    }).catch(err => console.warn('[AuthService] Failed to publish password changed event:', err.message));

    this.auditService.log({
      action: 'UPDATE',
      user_id: userId,
      tenant_id: null,
      resource_type: 'user',
      resource_id: userId,
      response_status: 200,
      metadata: { action: 'password_changed' }
    }).catch(() => {});

    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * Authenticate user with email and password
   */
  async login(email, password, tenantId = null) {
    const normalizedEmail = email.toLowerCase();
    
    // First, check if email exists in the database (any status)
    const emailExistsQuery = `
      SELECT id, status FROM users 
      WHERE email = $1
      LIMIT 1
    `;
    const emailExistsResult = await database.query(emailExistsQuery, [normalizedEmail]);
    
    // If email doesn't exist at all
    if (emailExistsResult.rows.length === 0) {
      this.eventService.publishLoginFailed(email, 'Email does not exist', {}).catch(() => {});
      throw new AuthError('EMAIL_NOT_FOUND', 'No account found with this email address');
    }
    
    const emailStatus = emailExistsResult.rows[0].status;
    
    // Check if email is pending verification
    if (emailStatus === 'pending_verification') {
      this.eventService.publishLoginFailed(email, 'Email not verified', {}).catch(() => {});
      throw new AuthError('EMAIL_NOT_VERIFIED', 'Please verify your email before logging in');
    }
    
    // Check if email is inactive/suspended
    if (emailStatus !== 'active') {
      this.eventService.publishLoginFailed(email, `Account is ${emailStatus}`, {}).catch(() => {});
      throw new AuthError('ACCOUNT_INACTIVE', `Account is ${emailStatus}. Please contact support.`);
    }
    
    // Find active user by email
    const userQuery = `
      SELECT * FROM users 
      WHERE email = $1 AND status = 'active'
      LIMIT 1
    `;
    const userResult = await database.query(userQuery, [normalizedEmail]);
    
    if (userResult.rows.length === 0) {
      // This shouldn't happen if email exists and is active, but handle it anyway
      this.eventService.publishLoginFailed(email, 'Invalid credentials', {}).catch(() => {});
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }
    
    const user = userResult.rows[0];

    // Determine tenant context (needed for policy check)
    let activeTenantId = tenantId;
    if (!activeTenantId) {
      // Get user's primary tenant
      const tenantQuery = `
        SELECT tenant_id FROM user_tenants
        WHERE user_id = $1 AND status = 'active' AND is_primary = true
        LIMIT 1
      `;
      const tenantResult = await database.query(tenantQuery, [user.id]);
      activeTenantId = tenantResult.rows[0]?.tenant_id;
    }

    // NEW: Check if account is locked
    const policyService = getPasswordPolicyService();
    const lockoutStatus = await policyService.isLocked(user.id);
    if (lockoutStatus.locked) {
      throw new AuthError('ACCOUNT_LOCKED', `Account is locked until ${formatDateTime(lockoutStatus.locked_until)}. Please try again in ${lockoutStatus.minutes_remaining} minutes.`);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      // Record failed attempt
      let lockoutResult = null;
      if (activeTenantId) {
        lockoutResult = await policyService.recordFailedLogin(user.id, activeTenantId);
      }
      
      this.eventService.publishLoginFailed(email, 'Invalid credentials', {}).catch(() => {});
      this.auditService.log({ action: 'LOGIN', user_id: null, tenant_id: null, resource_type: 'session', response_status: 401, metadata: { email: normalizedEmail, reason: 'invalid_credentials' } }).catch(() => {});
      
      if (lockoutResult && lockoutResult.locked) {
        throw new AuthError('ACCOUNT_LOCKED', `Invalid password. Your account has been locked until ${formatDateTime(lockoutResult.locked_until)} due to multiple failed attempts.`, {
          lockedUntil: lockoutResult.locked_until,
          durationMinutes: lockoutResult.lockout_duration_minutes
        });
      }

      const remainingMsg = lockoutResult ? `. You have ${lockoutResult.remaining_attempts} attempts remaining before your account is locked.` : '';
      throw new AuthError('INVALID_CREDENTIALS', `Invalid email or password${remainingMsg}`, {
        remainingAttempts: lockoutResult?.remaining_attempts
      });
    }

    // Reset failed attempts on success
    await policyService.resetFailedLogins(user.id);

    // Check tenant status if activeTenantId is present
    if (activeTenantId) {
      const tenantCheck = await database.query(
        'SELECT status FROM tenants WHERE id = $1',
        [activeTenantId]
      );

      if (tenantCheck.rows.length === 0) {
        throw new AuthError('TENANT_NOT_FOUND', 'Tenant not found');
      }

      const tenant = tenantCheck.rows[0];
      if (tenant.status !== 'active' && tenant.status !== 'ACTIVE') {
        throw new AuthError('TENANT_INACTIVE', `Tenant is ${tenant.status}. Please contact support or admin to activate it.`);
      }
    }

    // NEW: Check for forced password reset or expiry
    const expiryStatus = await policyService.checkPasswordExpiry(user.id, activeTenantId);

    if (user.force_password_reset || expiryStatus.expired) {
      // Generate a temporary reset token matching the forgot-password flow
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await this._storeResetToken(user.id, resetToken, resetExpires, activeTenantId);

      return {
        success: true,
        requirePasswordReset: true,
        resetReason: user.force_password_reset ? 'FIRST_LOGIN' : 'EXPIRED',
        userId: user.id,
        email: user.email,
        tenantId: activeTenantId,
        tempToken: resetToken
      };
    }

    if (!activeTenantId) {
      // Check if user is super admin — super admin does not require a tenant
      const superAdminCheck = await database.query(`
        SELECT ur.id FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1 AND r.code = 'super_admin'
        LIMIT 1
      `, [user.id]);

      if (superAdminCheck.rows.length === 0) {
        throw new AuthError('NO_TENANT', 'User has no active tenant');
      }
      // Super admin proceeds with null tenant
    }

    // Get user's roles and permissions
    const roles = await this.permissionService.getUserRoles(user.id, activeTenantId);
    const permissions = await this.permissionService.getUserPermissions(user.id, activeTenantId);
    const roleModuleCombinations = await this.permissionService.getUserRoleModuleCombinations(user.id, activeTenantId);

    // Generate token pair
    const tokens = this.jwtService.generateTokenPair(
      { id: user.id, email: user.email, tenant_id: activeTenantId },
      roles,
      permissions
    );

    // Create session in DB and cache in Redis
    await this._createSession(user.id, activeTenantId, tokens);

   // Update last login
   const loginUpdateResult = await database.query(
    `UPDATE users SET last_login_at = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE id = $1 RETURNING login_count`,
    [user.id]
  );

  // Send welcome notification on first login
  const loginCount = loginUpdateResult.rows[0]?.login_count;
  if (loginCount === 1) {
    setImmediate(async () => {
      try {
        await getNotificationService().sendFromTemplate(activeTenantId, user.id, 'welcome', {
          user_name: user.first_name
        }, {
          entityType: 'user',
          entityId: user.id,
          entityName: `${user.first_name} ${user.last_name}`,
          actionUrl: '/'
        });
      } catch (e) { console.warn('[AuthService] Welcome notification failed:', e.message); }
    });
  }

    // Publish login event
    this.eventService.publishLoginSuccess(user, { id: tokens.sessionId }, {
      tenantId: activeTenantId,
      userId: user.id,
      ipAddress: null
    }).catch(err => console.warn('[AuthService] Failed to publish login event:', err.message));

    this.auditService.log({
      action: 'LOGIN',
      user_id: user.id,
      tenant_id: activeTenantId,
      resource_type: 'session',
      resource_id: tokens.sessionId,
      response_status: 200,
      metadata: { login_method: user.auth_provider || 'local', session_id: tokens.sessionId }
    }).catch(err => console.warn('[AuthService] Audit log failed:', err.message));

    // Format permissions to include resource and action
    const formattedPermissions = this._formatPermissions(permissions);

    // Get tenant information with assigned modules
    // let tenantInfo = null;
    // try {
    //   const tenantService = require('./tenant_service');
    //   const tenant = await tenantService.findById(activeTenantId);
    //   const tenantData = tenant.toJSON ? tenant.toJSON() : tenant;
      
    //   // Format tenant info with id, name, and assignedModules (id and name only)
    //   tenantInfo = {
    //     id: tenantData.id,
    //     name: tenantData.name,
    //     assignedModules: (tenantData.assignedModules || []).map(module => ({
    //       id: module.id,
    //       name: module.name
    //     }))
    //   };
    // } catch (error) {
    //   // If tenant fetch fails, log but don't fail login
    //   console.warn('[AuthService] Failed to fetch tenant info:', error.message);
    //   tenantInfo = {
    //     id: activeTenantId,
    //     name: null,
    //     assignedModules: []
    //   };
    // }

    let tenantInfo = null;
    if (activeTenantId) {
      try {
        const tenantRes = await database.query('SELECT id, name FROM tenants WHERE id = $1', [activeTenantId]);
        if (tenantRes.rows.length > 0) {
          tenantInfo = {
            id: tenantRes.rows[0].id,
            name: tenantRes.rows[0].name
          };
        }
      } catch (err) {
        tenantInfo = { id: activeTenantId, name: null };
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      },
      tenantId: activeTenantId,
      tenant: tenantInfo,
      roles,
      role_module_combinations: roleModuleCombinations,
      permissions: formattedPermissions,
      ...tokens
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    const result = this.jwtService.verifyRefreshToken(refreshToken);
    
    if (!result.valid) {
      throw new AuthError(result.error.code, result.error.message);
    }

    const { userId, tenantId, sessionId, issuedAt, expiresAt } = result.payload;

    // Get session from database to verify hash and status
    const sessionQuery = `
      SELECT * FROM sessions
      WHERE id = $1 AND user_id = $2 
        AND revoked_at IS NULL
        AND refresh_expires_at > NOW()
      LIMIT 1
    `;
    const sessionResult = await database.query(sessionQuery, [sessionId, userId]);
    
    if (sessionResult.rows.length === 0) {
      throw new AuthError('SESSION_EXPIRED', 'Session has expired or been revoked');
    }

    // Get user
    const userQuery = `SELECT * FROM users WHERE id = $1 AND status = 'active' LIMIT 1`;
    const userResult = await database.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      throw new AuthError('USER_INACTIVE', 'User account is inactive');
    }
    
    const user = userResult.rows[0];

    // Verify refresh token hash matches what's in the database
    const tokenHash = this._hashToken(refreshToken);
    if (sessionResult.rows[0].refresh_token_hash !== tokenHash) {
      // Potential token reuse/theft - revoke session for safety
      await this.logout(sessionId, userId);
      throw new AuthError('SESSION_EXPIRED', 'Refresh token has already been used or is invalid');
    }

    const session = sessionResult.rows[0];

    // ── IDLE TIMEOUT ENFORCEMENT ──────────────────────────────────────────────
    // Check if the session has been idle longer than the configured threshold.
    // last_activity_at is updated on every authenticated request in auth.middleware.js.
    // Service tokens (isServiceToken) are exempt from idle enforcement.
    if (config.session.idleTimeoutEnabled && session.last_activity_at) {
      const lastActivity = new Date(session.last_activity_at);
      const idleSinceMs = Date.now() - lastActivity.getTime();
      const idleSinceMinutes = idleSinceMs / 60_000;

      if (idleSinceMinutes > config.session.idleTimeoutMinutes) {
        // Revoke the session so it cannot be reused
        await this.logout(sessionId, userId, 'idle_timeout');
        throw new AuthError(
          'SESSION_IDLE_TIMEOUT',
          `Your session expired due to ${Math.floor(idleSinceMinutes)} minutes of inactivity. Please log in again.`
        );
      }
    }
    // ── END IDLE TIMEOUT ENFORCEMENT ─────────────────────────────────────────

    // Verify if the access token has actually expired
    if (new Date(session.expires_at) > new Date()) {
      throw new AuthError('TOKEN_NOT_EXPIRED', 'Access token is not expired');
    }

    // Check if this is a service token session by checking if the difference between
    // refresh_expires_at and expires_at is 24 hours.
    const diffMs = new Date(session.refresh_expires_at).getTime() - new Date(session.expires_at).getTime();
    const isServiceToken = Math.abs(diffMs - 24 * 60 * 60 * 1000) < 60 * 1000;

    // Get fresh roles and permissions
    const roles = await this.permissionService.getUserRoles(userId, tenantId);
    const permissions = await this.permissionService.getUserPermissions(userId, tenantId);

    // Generate new tokens, maintaining the same sessionId and preserving durations if service token
    let tokens;
    if (isServiceToken && issuedAt && expiresAt) {
      const refreshTokenDurationSeconds = Math.round((new Date(expiresAt).getTime() - new Date(issuedAt).getTime()) / 1000);
      const accessTokenDurationSeconds = Math.max(60, refreshTokenDurationSeconds - (24 * 60 * 60));

      tokens = this.jwtService.generateTokenPair(
        { id: user.id, email: user.email, tenant_id: tenantId },
        roles,
        permissions,
        sessionId,
        accessTokenDurationSeconds,
        refreshTokenDurationSeconds
      );
    } else {
      tokens = this.jwtService.generateTokenPair(
        { id: user.id, email: user.email, tenant_id: tenantId },
        roles,
        permissions,
        sessionId
      );
    }

    // Update session with new token hashes and new expiries
    await database.query(
      `UPDATE sessions 
       SET token_hash = $1, 
           refresh_token_hash = $2, 
           expires_at = $3, 
           refresh_expires_at = $4, 
           updated_at = NOW() 
       WHERE id = $5`,
      [
        this._hashToken(tokens.accessToken),
        this._hashToken(tokens.refreshToken),
        new Date(tokens.expiresAt),
        new Date(tokens.refreshExpiresAt),
        sessionId
      ]
    );

    // Cache updated session in Redis with the new expiry
    if (this.redisService?.isConnected) {
      await this._cacheSession(sessionId, userId, tenantId, new Date(tokens.expiresAt));
    }

    // Publish token refresh event
    this.eventService.publishTokenRefresh(userId, sessionId, {
      tenantId: tenantId,
      userId: user.id
    }).catch(err => console.warn('[AuthService] Failed to publish token refresh event:', err.message));

    return tokens;
  }

  /**
   * Logout - revoke session
   * @param {string} sessionId
   * @param {string} userId
   * @param {string} [reason='user_initiated'] - Reason for logout: 'user_initiated' | 'idle_timeout' | 'forced'
   */
  async logout(sessionId, userId, reason = 'user_initiated') {
    // Revoke in database
    await database.query(
      `UPDATE sessions SET revoked_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );
    
    // Publish logout event
    this.eventService.publishLogout(userId, sessionId, { userId }).catch(() => {});

    this.auditService.log({
      action: 'LOGOUT',
      user_id: userId,
      tenant_id: null,
      resource_type: 'session',
      resource_id: sessionId,
      response_status: 200,
      metadata: { session_id: sessionId, reason }  // 'idle_timeout' | 'user_initiated' | 'forced'
    }).catch(err => console.warn('[AuthService] Audit log failed:', err.message));

    // Remove from Redis
    await this._removeSessionFromRedis(sessionId, userId);

    return { success: true };
  }

  /**
   * Logout all sessions
   */
  async logoutAll(userId) {
    // Get all active sessions first
    const sessionsQuery = `
      SELECT id FROM sessions 
      WHERE user_id = $1 AND revoked_at IS NULL
    `;
    const sessionsResult = await database.query(sessionsQuery, [userId]);
    
    // Revoke in database
    await database.query(
      `UPDATE sessions SET revoked_at = NOW(), updated_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    
    // Remove all from Redis
    for (const session of sessionsResult.rows) {
      await this._removeSessionFromRedis(session.id, userId);
    }
    
    // Publish logout all event
    this.eventService.publishLogoutAll(userId, sessionsResult.rows.length, { userId }).catch(() => {});

    // Clear permission cache
    await this.permissionService.clearCache(userId);

    return { success: true };
  }

  /**
   * Validate session - fast path through Redis
   */
  async validateSession(sessionId, userId) {
    // Try Redis first
    const cachedValid = await this._checkSessionInRedis(sessionId, userId);
    if (cachedValid) {
      return { valid: true, cached: true };
    }
    
    // Fallback to database
    const query = `
      SELECT * FROM sessions
      WHERE id = $1 AND user_id = $2
        AND revoked_at IS NULL AND expires_at > NOW()
      LIMIT 1
    `;
    const result = await database.query(query, [sessionId, userId]);
    
    if (result.rows.length > 0) {
      // Re-cache valid session
      const session = result.rows[0];
      await this._cacheSession(sessionId, userId, session.tenant_id, session.expires_at);
      return { valid: true, session, cached: false };
    }
    
    return { valid: false, session: null };
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(userId) {
    const query = `
      SELECT id, ip_address, user_agent, created_at, expires_at
      FROM sessions
      WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
    `;
    const result = await database.query(query, [userId]);
    return result.rows;
  }

  // ==================== Token Storage Methods ====================

  async _storeVerificationToken(userId, token, expiresAt) {
    const key = `verify:${token}`;
    const data = { userId, expiresAt: expiresAt.toISOString() };
    const ttl = Math.floor((expiresAt - Date.now()) / 1000);

    if (this.redisService?.isConnected) {
      await this.redisService.set(key, data, ttl);
    } else {
      // Fallback: store in database (would need a tokens table)
      // For now, store in memory (not production-ready)
      if (!this._tokenStore) this._tokenStore = new Map();
      this._tokenStore.set(key, { ...data, expiresAt });
    }
  }

  async _getVerificationToken(token) {
    const key = `verify:${token}`;

    if (this.redisService?.isConnected) {
      return await this.redisService.get(key);
    } else {
      const data = this._tokenStore?.get(key);
      if (data && new Date(data.expiresAt) > new Date()) {
        return data;
      }
      return null;
    }
  }

  async _deleteVerificationToken(token) {
    const key = `verify:${token}`;

    if (this.redisService?.isConnected) {
      await this.redisService.delete(key);
    } else {
      this._tokenStore?.delete(key);
    }
  }

  async _storeResetToken(userId, token, expiresAt, tenantId = null) {
    const key = `reset:${token}`;
    const data = { 
      userId, 
      tenantId,
      expiresAt: expiresAt.toISOString() 
    };
    const ttl = Math.floor((expiresAt - Date.now()) / 1000);

    if (this.redisService?.isConnected) {
      await this.redisService.set(key, data, ttl);
    } else {
      if (!this._tokenStore) this._tokenStore = new Map();
      this._tokenStore.set(key, { ...data, expiresAt });
    }
  }

  async _getResetToken(token) {
    const key = `reset:${token}`;

    if (this.redisService?.isConnected) {
      return await this.redisService.get(key);
    } else {
      const data = this._tokenStore?.get(key);
      if (data && new Date(data.expiresAt) > new Date()) {
        return data;
      }
      return null;
    }
  }

  async _deleteResetToken(token) {
    const key = `reset:${token}`;

    if (this.redisService?.isConnected) {
      await this.redisService.delete(key);
    } else {
      this._tokenStore?.delete(key);
    }
  }

  // ==================== Redis Session Methods ====================

  async _cacheSession(sessionId, userId, tenantId, expiresAt) {
    if (!this.redisService?.isConnected) return;
    
    try {
      const ttl = Math.floor((new Date(expiresAt) - Date.now()) / 1000);
      if (ttl > 0) {
        await this.redisService.setSession(sessionId, {
          userId,
          tenantId,
          expiresAt: expiresAt.toISOString()
        }, ttl);
      }
    } catch (err) {
      console.warn('[AuthService] Redis cache session error:', err.message);
    }
  }

  async _checkSessionInRedis(sessionId, userId) {
    if (!this.redisService?.isConnected) return false;
    
    try {
      const session = await this.redisService.getSession(sessionId);
      return session?.userId === userId;
    } catch (err) {
      console.warn('[AuthService] Redis check session error:', err.message);
      return false;
    }
  }

  async _removeSessionFromRedis(sessionId, userId) {
    if (!this.redisService?.isConnected) return;
    
    try {
      await this.redisService.deleteSession(sessionId, userId);
    } catch (err) {
      console.warn('[AuthService] Redis remove session error:', err.message);
    }
  }

  // ==================== Private Methods ====================

  async _createSession(userId, tenantId, tokens) {
    const query = `
      INSERT INTO sessions (
        id, user_id, tenant_id, token_hash, refresh_token_hash,
        expires_at, refresh_expires_at, last_activity_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;
    
    const expiresAt = new Date(tokens.expiresAt);
    const values = [
      tokens.sessionId,
      userId,
      tenantId,
      this._hashToken(tokens.accessToken),
      this._hashToken(tokens.refreshToken),
      expiresAt,
      new Date(tokens.refreshExpiresAt)
    ];
    
    const result = await database.query(query, values);
    
    // Cache in Redis
    await this._cacheSession(tokens.sessionId, userId, tenantId, expiresAt);
    
    return result;
  }

  _hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Format permissions array from ["resource:action"] to [{resource, action}]
   * @param {Array<string>} permissions - Array of permission strings like ["users:read", "users:create"]
   * @returns {Array<Object>} Array of permission objects with resource and action
   */
  _formatPermissions(permissions) {
    if (!Array.isArray(permissions)) {
      return [];
    }

    return permissions.map(permission => {
      // Handle wildcard permissions
      if (permission === '*:*') {
        return { resource: '*', action: '*' };
      }

      const parts = permission.split(':');
      if (parts.length === 2) {
        return {
          resource: parts[0],
          action: parts[1]
        };
      }

      // Fallback for malformed permissions
      return {
        resource: permission,
        action: '*'
      };
    });
  }

  /**
   * Create service token session in DB and Redis
   */
  async createServiceToken(userId, tenantId, payload, duration = '24h') {
    const tokenInfo = this.jwtService.generateServiceToken({
      userId,
      email: payload.email,
      tenantId,
      roles: payload.roles,
      permissions: payload.permissions,
    }, duration);

    // Save session in DB
    const query = `
      INSERT INTO sessions (
        id, user_id, tenant_id, token_hash, refresh_token_hash,
        expires_at, refresh_expires_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

    const expiresAt = new Date(tokenInfo.expiresAt);
    const refreshExpiresAt = new Date(tokenInfo.refreshExpiresAt);
    const values = [
      tokenInfo.sessionId,
      userId,
      tenantId,
      this._hashToken(tokenInfo.serviceToken),
      this._hashToken(tokenInfo.refreshToken),
      expiresAt,
      refreshExpiresAt
    ];

    await database.query(query, values);

    // Cache in Redis
    await this._cacheSession(tokenInfo.sessionId, userId, tenantId, expiresAt);

    return {
      service_token: tokenInfo.serviceToken,
      refresh_token: tokenInfo.refreshToken,
      expires_in: tokenInfo.expiresIn,
      expires_at: tokenInfo.expiresAt,
      refresh_expires_at: tokenInfo.refreshExpiresAt,
      session_id: tokenInfo.sessionId
    };
  }

  /**
   * Revoke service token
   */
  async revokeServiceToken(token) {
    const result = this.jwtService.verifyAccessToken(token);
    if (!result.valid) {
      throw new AuthError(result.error.code, result.error.message);
    }
    const { sessionId, userId } = result.payload;
    await this.logout(sessionId, userId);
    return { success: true, message: 'Service token revoked successfully' };
  }
}

/**
 * Custom Auth Error
 */
class AuthError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.details = details;
  }
}

// Singleton
let instance = null;
const getAuthService = () => {
  if (!instance) {
    instance = new AuthService();
  }
  return instance;
};

module.exports = { AuthService, AuthError, getAuthService };
