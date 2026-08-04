/**
 * Redis Service - QAssure Platform
 * Handles caching for sessions, permissions, and general data
 */
const Redis = require('ioredis');

class RedisService {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    if (this.client && this.isConnected) {
      return this.client;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    const options = {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: false,
      showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
      retryStrategy: (times) => {
        if (times > this.maxReconnectAttempts) {
          console.error('[Redis] Max reconnection attempts reached');
          return null;
        }
        const delay = Math.min(times * 100, 3000);
        console.log(`[Redis] Retrying connection in ${delay}ms (attempt ${times})`);
        return delay;
      }
    };

    this.client = new Redis(redisUrl, options);

    this.client.on('connect', () => {
      console.log('[Redis] ✅ Connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('ready', () => {
      console.log('[Redis] ✅ Ready to accept commands');
    });

    this.client.on('error', (err) => {
      console.error('[Redis] ❌ Connection error:', err.message);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('[Redis] Connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      console.log(`[Redis] Reconnecting... (attempt ${this.reconnectAttempts})`);
    });

    // Wait for connection
    await new Promise((resolve, reject) => {
      this.client.once('ready', resolve);
      this.client.once('error', reject);
    });

    return this.client;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      console.log('[Redis] Disconnected');
    }
  }

  /**
   * Get the Redis client
   */
  getClient() {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return this.client;
  }

  // ==================== Basic Operations ====================

  /**
   * Set a value with optional TTL
   */
  async set(key, value, ttlSeconds = null) {
    const client = this.getClient();
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
  }

  /**
   * Get a value
   */
  async get(key, parseJson = true) {
    const client = this.getClient();
    const value = await client.get(key);
    
    if (!value) return null;
    
    if (parseJson) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  /**
   * Delete a key
   */
  async delete(key) {
    const client = this.getClient();
    return await client.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    const client = this.getClient();
    return await client.exists(key) === 1;
  }

  /**
   * Set TTL on existing key
   */
  async expire(key, ttlSeconds) {
    const client = this.getClient();
    return await client.expire(key, ttlSeconds);
  }

  /**
   * Get remaining TTL
   */
  async ttl(key) {
    const client = this.getClient();
    return await client.ttl(key);
  }

  /**
   * Delete keys by pattern
   */
  async deletePattern(pattern) {
    const client = this.getClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
    return keys.length;
  }

  // ==================== Session Management ====================

  /**
   * Store session in Redis
   */
  async setSession(sessionId, sessionData, ttlSeconds = 86400) {
    const key = `session:${sessionId}`;
    await this.set(key, sessionData, ttlSeconds);
    
    // Also index by user for session listing
    const userSessionsKey = `user_sessions:${sessionData.userId}`;
    const client = this.getClient();
    await client.sadd(userSessionsKey, sessionId);
    await client.expire(userSessionsKey, ttlSeconds);
  }

  /**
   * Get session from Redis
   */
  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId, userId = null) {
    const key = `session:${sessionId}`;
    await this.delete(key);
    
    if (userId) {
      const client = this.getClient();
      await client.srem(`user_sessions:${userId}`, sessionId);
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId) {
    const client = this.getClient();
    const sessionIds = await client.smembers(`user_sessions:${userId}`);
    
    const sessions = [];
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push({ id: sessionId, ...session });
      } else {
        // Clean up stale reference
        await client.srem(`user_sessions:${userId}`, sessionId);
      }
    }
    
    return sessions;
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId) {
    const client = this.getClient();
    const sessionIds = await client.smembers(`user_sessions:${userId}`);
    
    for (const sessionId of sessionIds) {
      await this.delete(`session:${sessionId}`);
    }
    
    await this.delete(`user_sessions:${userId}`);
    return sessionIds.length;
  }

  // ==================== Permission Caching ====================

  /**
   * Cache user permissions
   */
  async setUserPermissions(userId, tenantId, permissions, ttlSeconds = 300) {
    const key = `permissions:${userId}:${tenantId}`;
    await this.set(key, permissions, ttlSeconds);
  }

  /**
   * Get cached user permissions
   */
  async getUserPermissions(userId, tenantId) {
    const key = `permissions:${userId}:${tenantId}`;
    return await this.get(key);
  }

  /**
   * Invalidate user permissions cache
   */
  async invalidateUserPermissions(userId, tenantId = null) {
    if (tenantId) {
      await this.delete(`permissions:${userId}:${tenantId}`);
    } else {
      await this.deletePattern(`permissions:${userId}:*`);
    }
  }

  /**
   * Invalidate all permissions for a tenant (e.g., when roles change)
   */
  async invalidateTenantPermissions(tenantId) {
    await this.deletePattern(`permissions:*:${tenantId}`);
  }

  // ==================== Rate Limiting ====================

  /**
   * Increment rate limit counter
   */
  async incrementRateLimit(key, windowSeconds = 60) {
    const client = this.getClient();
    const fullKey = `ratelimit:${key}`;
    
    const count = await client.incr(fullKey);
    if (count === 1) {
      await client.expire(fullKey, windowSeconds);
    }
    
    const ttl = await client.ttl(fullKey);
    
    return { count, ttl };
  }

  /**
   * Get rate limit count
   */
  async getRateLimitCount(key) {
    const client = this.getClient();
    const count = await client.get(`ratelimit:${key}`);
    return parseInt(count) || 0;
  }

  // ==================== General Caching ====================

  /**
   * Cache with automatic refresh pattern
   */
  async cacheWithRefresh(key, fetchFn, ttlSeconds = 300, refreshThreshold = 60) {
    const cached = await this.get(key);
    const ttl = await this.ttl(key);
    
    // If cache exists and not near expiration, return it
    if (cached && ttl > refreshThreshold) {
      return cached;
    }
    
    // Fetch fresh data
    const freshData = await fetchFn();
    await this.set(key, freshData, ttlSeconds);
    
    return freshData;
  }

  /**
   * Cache tenant data
   */
  async setTenant(tenantId, tenantData, ttlSeconds = 300) {
    const key = `tenant:${tenantId}`;
    await this.set(key, tenantData, ttlSeconds);
  }

  /**
   * Get cached tenant data
   */
  async getTenant(tenantId) {
    const key = `tenant:${tenantId}`;
    return await this.get(key);
  }

  /**
   * Invalidate tenant cache
   */
  async invalidateTenant(tenantId) {
    await this.delete(`tenant:${tenantId}`);
  }

  // ==================== Health Check ====================

  /**
   * Check Redis health
   */
  async healthCheck() {
    try {
      const client = this.getClient();
      const start = Date.now();
      await client.ping();
      const latency = Date.now() - start;
      
      const info = await client.info('server');
      const memoryInfo = await client.info('memory');
      
      return {
        status: 'healthy',
        latency: `${latency}ms`,
        connected: this.isConnected,
        info: {
          version: info.match(/redis_version:(\S+)/)?.[1],
          usedMemory: memoryInfo.match(/used_memory_human:(\S+)/)?.[1]
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connected: this.isConnected
      };
    }
  }
}

// Export singleton instance
module.exports = new RedisService();
