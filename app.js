const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./src/config/config');
const logger = require('./src/config/logger');
const path = require('path');
const fs = require('fs');

// Initialize Sequelize models/associations (core set derived from migrations)
try {
  require('./src/sequelize-models/loader');
  logger.info('✅ Sequelize models and associations loaded successfully');
} catch (error) {
  logger.error(`❌ Error loading Sequelize models: ${error.message}`);
  logger.error(error.stack);
  // Continue execution - some routes might still work without associations
}

// Load middleware
const { correlationId } = require('./src/middleware/correlation.middleware');
const { metricsMiddleware } = require('./src/middleware/metrics.middleware');
const { autoValidateUUIDs } = require('./src/middleware/uuid.middleware');
const { auditMiddleware } = require('./src/middleware/audit.middleware');

// Kafka Event Service
const { getEventService } = require('./src/infrastructure/kafka');


// Legacy raw SQL models loader (disabled; using Sequelize models via services)
// try {
//   const modelsPath = path.join(__dirname, 'src', 'models');
//   if (fs.existsSync(modelsPath)) {
//     const modelFiles = fs.readdirSync(modelsPath)
//       .filter(file => file.endsWith('.js') && file !== 'index.js');
//     
//     modelFiles.forEach(file => {
//       try {
//         require(path.join(modelsPath, file));
//         logger.debug(`✅ Loaded model: ${file}`);
//       } catch (error) {
//         logger.warn(`⚠️ Failed to load model ${file}: ${error.message}`);
//       }
//     });
//   }
// } catch (error) {
//   logger.warn(`⚠️ Error loading models: ${error.message}`);
// }

// Load routes (auto-discover if src/routes/index.js exists)

let routes = null;
try {
  const routesPathSrc = path.join(__dirname, 'src', 'routes', 'index.js');
  
  if (fs.existsSync(routesPathSrc)) {
    routes = require('./src/routes/index');
    logger.info('✅ Routes loaded successfully from src/routes/index.js');
  } else {
    logger.warn('⚠️ routes/index.js not found - API routes will not be available');
  }
} catch (error) {
  logger.error(`❌ Error loading routes: ${error.message}`);
}

// Create Express application
const app = express();

// Trust proxy for rate limiting behind reverse proxies/Docker
app.set('trust proxy', 1);

// Security middleware - configure to allow cross-origin images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders,
    credentials: config.cors.credentials,
  })
);

// Correlation ID middleware (adds X-Correlation-ID to all requests)
app.use(correlationId);

// Metrics middleware (records HTTP metrics for Prometheus)
app.use(metricsMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// UUID validation middleware (validates all UUID parameters)
app.use(autoValidateUUIDs);
app.use(auditMiddleware);

// Static file serving for uploaded files (with API prefix)
const uploadDir = config.upload.uploadDir || path.join(__dirname, 'uploads');
if (fs.existsSync(uploadDir) || fs.existsSync(path.join(__dirname, 'uploads'))) {
  // Add CORS middleware specifically for static file serving
  // This ensures images can be loaded cross-origin
  app.use(`${config.api.prefix}/uploads`, cors({
    origin: config.cors.origin,
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: config.cors.allowedHeaders,
    credentials: config.cors.credentials,
    exposedHeaders: ['Content-Type', 'Content-Length', 'ETag', 'Last-Modified']
  }));
  
  // Serve files at /api/v1/uploads to match API prefix pattern
  app.use(`${config.api.prefix}/uploads`, express.static(uploadDir, {
    etag: true,
    lastModified: true,
    maxAge: 86400000 // 24 hours cache
  }));
  logger.info(`✅ Static file serving enabled at ${config.api.prefix}/uploads from ${uploadDir}`);
}

// Logging middleware
if (config.app.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Health check endpoint (root level)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.env,
    correlationId: req.correlationId
  });
});

// API routes
if (routes) {
  app.use(config.api.prefix, routes);
  logger.info(`✅ API routes registered at ${config.api.prefix}`);
} else {
  logger.warn('⚠️ No routes available - API endpoints will not be accessible');
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    correlationId: req.correlationId
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  
  // Record error in metrics
  try {
    const { getPrometheusService } = require('./src/infrastructure/metrics/prometheus.service');
    getPrometheusService().recordError('unhandled_exception', err.name || 'Error');
  } catch (metricsErr) {
    // Ignore metrics errors
  }

  res.status(500).json({
    success: false,
    message: config.app.env === 'production' ? 'Internal server error' : err.message,
    correlationId: req.correlationId,
    ...(config.app.env === 'development' && { stack: err.stack }),
  });
});

// Initialize Kafka Event Service
const initializeKafka = async () => {
  try {
    const eventService = getEventService();
    const connected = await eventService.initialize();
    
    if (connected) {
      await eventService.publishSystemStartup({
        version: '1.0.0',
        environment: config.app.env
      });
      logger.info('[Kafka] ✅ Event service initialized');
    } else {
      logger.warn('[Kafka] ⚠️ Running without Kafka - events will not be published');
    }
    
    return connected;
  } catch (error) {
    logger.error('[Kafka] Failed to initialize:', error.message);
    return false;
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  try {
    const eventService = getEventService();
    await eventService.publishSystemShutdown(signal);
    await eventService.shutdown();
    logger.info('[Kafka] Shutdown complete');
  } catch (error) {
    logger.error('Shutdown error:', error.message);
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize Kafka when app loads
initializeKafka();

module.exports = app;
