/**
 * WebSocket Service
 * Real-time notifications via Socket.io
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { pool } = require('../../config/database');

class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map();
  }

  initialize(httpServer) {
    const corsOptions = {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    };
    console.log('[Socket.io] Initializing with CORS:', corsOptions);

    this.io = new Server(httpServer, {
      cors: corsOptions,
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Auth middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                      socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          console.warn('[Socket.io] ❌ Connection rejected: No token provided');
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
          'SELECT id, email FROM users WHERE id = $1 AND status = \'active\'',
          [decoded.sub]
        );

        if (result.rows.length === 0) {
          console.warn(`[Socket.io] ❌ Connection rejected: User not found or inactive (${decoded.sub})`);
          return next(new Error('User not found'));
        }

        socket.user = {
          id: result.rows[0].id,
          email: result.rows[0].email,
          tenantId: decoded.tid // Get tenantId from JWT claim 'tid'
        };
        console.log(`[Socket.io] 🔑 Auth successful for user: ${socket.user.email}`);
        next();
      } catch (error) {
        console.error(`[Socket.io] ❌ Connection rejected: ${error.message}`);
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket) => this._handleConnection(socket));
    console.log('[Socket.io] ✅ WebSocket server ready and listening on same port as HTTP server');
    return this.io;
  }

  _handleConnection(socket) {
    const userId = socket.user.id;
    const tenantId = socket.user.tenantId;

    console.log(`[Socket.io] ⚡ User connected: ${socket.user.email} (ID: ${userId})`);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);

    socket.join(`user:${userId}`);
    socket.join(`tenant:${tenantId}`);

    socket.emit('connected', {
      message: 'Connected to QAssure real-time notifications',
      userId,
      timestamp: new Date().toISOString()
    });

    socket.on('mark_read', async (data) => {
      if (data.notificationId) {
        await pool.query(
          'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2',
          [data.notificationId, userId]
        );
        socket.emit('notification_read', { id: data.notificationId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] 🔌 User disconnected: ${socket.user.email} (${reason})`);
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) this.userSockets.delete(userId);
      }
    });
  }

  emitToUser(userId, event, data) {
    if (!this.io) {
      console.warn('[Socket.io] ⚠️ Cannot emit: IO not initialized');
      return;
    }
    console.log(`[Socket.io] 📤 Emitting ${event} to user:${userId}`);
    this.io.to(`user:${userId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
  }

  emitToTenant(tenantId, event, data) {
    if (!this.io) return;
    console.log(`[Socket.io] 📤 Emitting ${event} to tenant:${tenantId}`);
    this.io.to(`tenant:${tenantId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
  }

  pushNotification(userId, notification) {
    console.log(`[Socket.io] 🔔 Pushing NEW notification to user:${userId}`);
    this.emitToUser(userId, 'notification', { type: 'new', notification });
  }

  async pushUnreadCount(userId, tenantId) {
    console.log(`[Socket.io] 🔢 Pushing unread count update for user:${userId}`);
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = $1 AND tenant_id = $2 AND is_read = FALSE 
       AND is_dismissed = FALSE AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId, tenantId]
    );
    const count = parseInt(result.rows[0].count) || 0;
    this.emitToUser(userId, 'unread_count', { count });
  }

  isUserOnline(userId) {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  getStats() {
    return {
      totalConnections: this.io ? this.io.sockets.sockets.size : 0,
      onlineUsers: this.userSockets.size,
      userIds: Array.from(this.userSockets.keys())
    };
  }
}

let instance = null;
const getSocketService = () => {
  if (!instance) instance = new SocketService();
  return instance;
};

module.exports = { SocketService, getSocketService };
