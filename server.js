const http = require('http');
const app = require('./app');
const config = require('./src/config/config');
const logger = require('./src/config/logger');
const database = require('./src/config/database');
const redisService = require('./src/infrastructure/cache/redis.service');
const { getPermissionService } = require('./src/infrastructure/auth/permission.service');
const { getAuthService } = require('./src/services/auth.service');
const { getElasticsearchService } = require('./src/infrastructure/search/elasticsearch.service');
const { getSocketService } = require('./src/infrastructure/websocket');

// Start server
async function startServer() {
  try {
    // Test database connection
    await database.testConnection();
    
    // Initialize Redis
    try {
      await redisService.connect();
      logger.info('✅ Redis connected successfully');
      
      // Wire Redis to services
      const permissionService = getPermissionService();
      permissionService.setRedisService(redisService);
      
      const authService = getAuthService();
      authService.setRedisService(redisService);
    } catch (redisError) {
      logger.warn('⚠️ Redis connection failed - running without cache:', redisError.message);
    }

    // Initialize Elasticsearch
    try {
      const esService = getElasticsearchService();
      const connected = await esService.connect();
      if (connected) {
        logger.info('✅ Elasticsearch connected successfully');
        
        // Index existing data in background
        indexExistingData(esService).catch(err => {
          logger.warn('Background indexing error:', err.message);
        });
      }
    } catch (esError) {
      logger.warn('⚠️ Elasticsearch connection failed - search will use PostgreSQL:', esError.message);
    }

    // Start HTTP server
    // Create HTTP server and initialize Socket.io
    const httpServer = http.createServer(app);
    const socketService = getSocketService();
    socketService.initialize(httpServer);

    httpServer.listen(config.app.port, config.app.host, () => {
      logger.info(`🚀 Server is running on ${config.app.host}:${config.app.port}`);
      logger.info(`📍 Environment: ${config.app.env}`);
      logger.info(`🌐 API prefix: ${config.api.prefix}`);

      // Start escalation scheduler
      const { startEscalationScheduler } = require('./escalation.scheduler');
      startEscalationScheduler();

      // Start SMTP scheduler
      const { startSmtpScheduler } = require('./smtp.scheduler');
      startSmtpScheduler();

      // Start workflow reminder scheduler
      const { startReminderScheduler } = require('./reminder.scheduler');
      startReminderScheduler();
    });

    // Handle server errors
    httpServer.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }
      const bind = typeof config.app.port === 'string' ? `Pipe ${config.app.port}` : `Port ${config.app.port}`;
      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          // Disconnect Redis
          await redisService.disconnect();
          logger.info('Redis connection closed');
          
          // Disconnect Elasticsearch
          const esService = getElasticsearchService();
          await esService.disconnect();
          logger.info('Elasticsearch connection closed');
          
          await database.close();
          logger.info('Database connection closed');
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Index existing data on startup
async function indexExistingData(esService) {
  const { pool } = require('./src/config/database');
  const tenantId = '00000000-0000-0000-0000-000000000001'; // Default tenant
  
  logger.info('[Elasticsearch] Starting background indexing of existing data...');
  
  try {
    // Index CAPAs
    const capas = await pool.query(
      `SELECT id, capa_number, title, description, problem_statement, capa_type, 
              priority, status, source, department
       FROM capas WHERE tenant_id = $1`,
      [tenantId]
    );
    if (capas.rows.length > 0) {
      await esService.bulkIndex('capas', capas.rows, tenantId);
      logger.info(`[Elasticsearch] Indexed ${capas.rows.length} CAPAs`);
    }

    // Index Documents
    const docs = await pool.query(
      `SELECT id, document_number, title, description, document_type as category, status, 
              department, current_version_id
       FROM documents WHERE tenant_id = $1`,
      [tenantId]
    );
    if (docs.rows.length > 0) {
      await esService.bulkIndex('documents', docs.rows, tenantId);
      logger.info(`[Elasticsearch] Indexed ${docs.rows.length} documents`);
    }

    // Index Suppliers
    const suppliers = await pool.query(
      `SELECT id, supplier_code, name, legal_name, supplier_type, category, 
              status, risk_level, current_score, score_grade, city, country
       FROM suppliers WHERE tenant_id = $1`,
      [tenantId]
    );
    if (suppliers.rows.length > 0) {
      await esService.bulkIndex('suppliers', suppliers.rows, tenantId);
      logger.info(`[Elasticsearch] Indexed ${suppliers.rows.length} suppliers`);
    }

    // Index Training Courses
    const courses = await pool.query(
      `SELECT id, course_code, title, description, category, course_type as training_type, status
       FROM training_courses WHERE tenant_id = $1`,
      [tenantId]
    );
    if (courses.rows.length > 0) {
      await esService.bulkIndex('training', courses.rows, tenantId);
      logger.info(`[Elasticsearch] Indexed ${courses.rows.length} training courses`);
    }

    logger.info('[Elasticsearch] Background indexing completed');
  } catch (error) {
    logger.error('[Elasticsearch] Background indexing error:', error.message);
  }
}

startServer();
