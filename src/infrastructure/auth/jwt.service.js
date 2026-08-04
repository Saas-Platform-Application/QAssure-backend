/**
 * JWT Service - QAssure Platform
 * Handles token generation, verification, and refresh
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTService {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.issuer = process.env.JWT_ISSUER || 'qassure.ai';
    this.audience = process.env.JWT_AUDIENCE || 'qassure-platform';
    
    if (!this.secret || this.secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters');
    }
  }

  /**
   * Generate access token
   * @param {Object} payload - User data to encode
   * @param {string|number} [duration] - Expiry duration
   * @returns {Object} - { accessToken, expiresAt }
   */
  generateAccessToken(payload, duration = null) {
    const {
      userId,
      email,
      tenantId,
      roles = [],
      permissions = [],
      sessionId
    } = payload;

    const tokenPayload = {
      sub: userId,
      email,
      tid: tenantId,
      roles,
      permissions,
      sid: sessionId || crypto.randomUUID(),
      type: 'access'
    };

    const token = jwt.sign(tokenPayload, this.secret, {
      expiresIn: duration || this.expiresIn,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: 'HS256'
    });

    const decoded = jwt.decode(token);
    
    return {
      accessToken: token,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      expiresIn: decoded.exp - decoded.iat
    };
  }



  /**
   * Generate refresh token
   * @param {Object} payload - Minimal user data
   * @param {string|number} [duration] - Expiry duration
   * @returns {Object} - { refreshToken, expiresAt }
   */
  generateRefreshToken(payload, duration = null) {
    const { userId, tenantId, sessionId } = payload;

    const tokenPayload = {
      sub: userId,
      tid: tenantId,
      sid: sessionId || crypto.randomUUID(),
      type: 'refresh',
      jti: crypto.randomUUID() // Unique token ID for revocation
    };

    const token = jwt.sign(tokenPayload, this.refreshSecret, {
      expiresIn: duration || this.refreshExpiresIn,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: 'HS256'
    });

    const decoded = jwt.decode(token);

    return {
      refreshToken: token,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      tokenId: tokenPayload.jti
    };
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} user - User object from database
   * @param {Array} roles - User roles
   * @param {Array} permissions - User permissions
   * @param {string} [existingSessionId] - Reused session UUID
   * @param {string|number} [accessTokenDuration] - Custom access token duration
   * @param {string|number} [refreshTokenDuration] - Custom refresh token duration
   * @returns {Object} - Complete token pair
   */
  generateTokenPair(user, roles = [], permissions = [], existingSessionId = null, accessTokenDuration = null, refreshTokenDuration = null) {
    const sessionId = existingSessionId || crypto.randomUUID();
    
    const access = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      roles,
      permissions,
      sessionId
    }, accessTokenDuration);

    const refresh = this.generateRefreshToken({
      userId: user.id,
      tenantId: user.tenant_id,
      sessionId
    }, refreshTokenDuration);

    return {
      accessToken: access.accessToken,
      refreshToken: refresh.refreshToken,
      tokenType: 'Bearer',
      expiresIn: access.expiresIn,
      expiresAt: access.expiresAt,
      refreshExpiresAt: refresh.expiresAt,
      sessionId,
      tokenId: refresh.tokenId
    };
  }

  /**
   * Generate service token
   * @param {Object} payload - User data to encode
   * @param {string} [duration='24h'] - Expiry duration
   * @returns {Object} - Complete service token info
   */
  generateServiceToken(payload, duration = '24h') {
    const {
      userId,
      email,
      tenantId,
      roles = [],
      permissions = [],
      sessionId = crypto.randomUUID()
    } = payload;

    const tokenPayload = {
      sub: userId,
      email,
      tid: tenantId,
      roles,
      permissions,
      sid: sessionId,
      type: 'access'
    };

    const token = jwt.sign(tokenPayload, this.secret, {
      expiresIn: duration,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: 'HS256'
    });

    const decoded = jwt.decode(token);

    // Generate refresh token to expire exactly +24h after the service token's expiry
    const refreshPayload = {
      sub: userId,
      tid: tenantId,
      sid: sessionId,
      type: 'refresh',
      jti: crypto.randomUUID()
    };

    const accessTokenDurationSeconds = decoded.exp - decoded.iat;
    const refreshTokenDurationSeconds = accessTokenDurationSeconds + (24 * 60 * 60);

    const refreshToken = jwt.sign(refreshPayload, this.refreshSecret, {
      expiresIn: refreshTokenDurationSeconds,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: 'HS256'
    });

    const decodedRefresh = jwt.decode(refreshToken);
    
    return {
      serviceToken: token,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      expiresIn: decoded.exp - decoded.iat,
      refreshToken,
      refreshExpiresAt: new Date(decodedRefresh.exp * 1000).toISOString(),
      sessionId,
      tokenId: refreshPayload.jti
    };
  }

  /**
   * Verify access token
   * @param {string} token - JWT token to verify
   * @returns {Object} - Decoded payload or throws error
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return {
        valid: true,
        payload: {
          userId: decoded.sub,
          email: decoded.email,
          tenantId: decoded.tid,
          roles: decoded.roles || [],
          permissions: decoded.permissions || [],
          sessionId: decoded.sid,
          issuedAt: new Date(decoded.iat * 1000),
          expiresAt: new Date(decoded.exp * 1000)
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: this._mapJWTError(error)
      };
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - Refresh token to verify
   * @returns {Object} - Decoded payload or throws error
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return {
        valid: true,
        payload: {
          userId: decoded.sub,
          tenantId: decoded.tid,
          sessionId: decoded.sid,
          tokenId: decoded.jti,
          issuedAt: new Date(decoded.iat * 1000),
          expiresAt: new Date(decoded.exp * 1000)
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: this._mapJWTError(error)
      };
    }
  }

  /**
   * Decode token without verification (for debugging)
   * @param {string} token - JWT token
   * @returns {Object} - Decoded payload
   */
  decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} - Token or null
   */
  extractToken(authHeader) {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Check if token is about to expire (within threshold)
   * @param {string} token - JWT token
   * @param {number} thresholdSeconds - Seconds before expiry to consider "expiring"
   * @returns {boolean}
   */
  isTokenExpiring(token, thresholdSeconds = 300) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return true;
      
      const now = Math.floor(Date.now() / 1000);
      return (decoded.exp - now) <= thresholdSeconds;
    } catch {
      return true;
    }
  }

  /**
   * Map JWT errors to user-friendly messages
   */
  _mapJWTError(error) {
    const errorMap = {
      'TokenExpiredError': { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
      'JsonWebTokenError': { code: 'INVALID_TOKEN', message: 'Invalid token' },
      'NotBeforeError': { code: 'TOKEN_NOT_ACTIVE', message: 'Token not yet active' }
    };

    return errorMap[error.name] || { 
      code: 'TOKEN_ERROR', 
      message: error.message 
    };
  }
}

// Singleton instance
let instance = null;

const getJWTService = () => {
  if (!instance) {
    instance = new JWTService();
  }
  return instance;
};

module.exports = { JWTService, getJWTService };
