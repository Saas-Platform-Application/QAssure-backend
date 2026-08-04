require('dotenv').config();

const config = {
  // Application
  app: {
    name: process.env.APP_NAME || '',
    version: process.env.APP_VERSION || '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || '0.0.0.0',
    url: process.env.APP_URL || 'http://localhost:5173'
  },

  // Database
  database: {
    // Prisma connection (recommended)
    url: process.env.DATABASE_URL || '',
    // Sequelize connection options (alternative - if using Sequelize instead of Prisma)
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'app_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  // JWT Authentication
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Session / Idle Timeout
  session: {
    // Total idle time (minutes) before session is rejected at refresh time
    idleTimeoutMinutes: parseInt(process.env.IDLE_TIMEOUT_MINUTES, 10) || 30,
    // Set to false to disable idle enforcement (useful during dev/testing)
    idleTimeoutEnabled: process.env.IDLE_TIMEOUT_ENABLED !== 'false'
  },

  // CORS Configuration
  cors: {
    origin: (() => {
      if (!process.env.CORS_ORIGIN) {
        return true; // Allow all origins by default
      }
      
      const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
      
      // Helper function to normalize URL (remove default ports)
      const normalizeUrl = (urlString) => {
        try {
          const url = new URL(urlString);
          // Remove default ports (443 for https, 80 for http)
          if ((url.protocol === 'https:' && url.port === '443') || 
              (url.protocol === 'http:' && url.port === '80')) {
            url.port = '';
          }
          return url;
        } catch (error) {
          return null;
        }
      };
      
      // Function to check if origin matches allowed origins or their subdomains
      return (origin, callback) => {
        // Allow requests with no origin (e.g., same-origin, Postman)
        if (!origin) {
          return callback(null, true);
        }
        
        // Normalize the request origin
        const normalizedOrigin = normalizeUrl(origin);
        if (!normalizedOrigin) {
          return callback(null, false);
        }
        
        // Check exact match first (with normalization)
        for (const allowedOrigin of allowedOrigins) {
          const normalizedAllowed = normalizeUrl(allowedOrigin);
          if (!normalizedAllowed) continue;
          
          // Exact match (protocol + hostname + port)
          if (normalizedAllowed.protocol === normalizedOrigin.protocol &&
              normalizedAllowed.hostname === normalizedOrigin.hostname &&
              normalizedAllowed.port === normalizedOrigin.port) {
          return callback(null, true);
          }
        }
        
        // Check if origin is a subdomain of any allowed origin
        for (const allowedOrigin of allowedOrigins) {
          try {
            const allowedUrl = normalizeUrl(allowedOrigin);
            if (!allowedUrl) continue;
            
            // Must match protocol
            if (allowedUrl.protocol !== normalizedOrigin.protocol) {
              continue;
            }
            
            // Port matching: if allowed origin has a port, request must match
            // If allowed origin has no port (default), allow any port or no port
            if (allowedUrl.port) {
              if (allowedUrl.port !== normalizedOrigin.port) {
              continue;
              }
            }
            
            // Check if request hostname is the same or a subdomain
            const allowedHostname = allowedUrl.hostname;
            const requestHostname = normalizedOrigin.hostname;
            
            // Exact hostname match
            if (allowedHostname === requestHostname) {
              return callback(null, true);
            }
            
            // Subdomain check: request hostname should end with .allowedHostname
            if (requestHostname.endsWith('.' + allowedHostname)) {
              return callback(null, true);
            }
          } catch (error) {
            // Invalid URL, skip
            continue;
          }
        }
        
        // Origin not allowed
        return callback(null, false);
      };
    })(),
    methods: process.env.CORS_METHODS ? process.env.CORS_METHODS.split(',').map(m => m.trim()) : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: process.env.CORS_HEADERS ? process.env.CORS_HEADERS.split(',').map(h => h.trim()) : ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Correlation-ID', 'X-API-Key'],
    credentials: process.env.CORS_CREDENTIALS === 'true' || true
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760, // 10MB
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES ? process.env.ALLOWED_MIME_TYPES.split(',') : ['image/jpeg', 'image/png', 'application/pdf'],
    uploadDir: process.env.UPLOAD_DIR || process.env.FILE_STORAGE_PATH || './uploads',
    exportDir: process.env.REPORT_STORAGE_PATH || './exports',
    storageType: process.env.STORAGE_TYPE || 'local', // 'local' or 'azure'
    azure: {
      account: process.env.AZURE_STORAGE_ACCOUNT,
      container: process.env.AZURE_STORAGE_CONTAINER,
      sasToken: process.env.AZURE_STORAGE_SAS_TOKEN,
      url: process.env.AZURE_STORAGE_URL,
    }
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100 // limit each IP to 100 requests per windowMs
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    file: process.env.LOG_FILE || './logs/app.log'
  },

  // API
  api: {
    prefix: process.env.API_PREFIX || '/api/v1',
    version: process.env.API_VERSION || 'v1',
    timeout: parseInt(process.env.API_TIMEOUT, 10) || 30000 // 30 seconds
  },

  // External Services

  // Email (if applicable)

  // Redis (if applicable)
};

// Validate required configuration
function validateConfig() {
  const required = [
    'database.url'
  ];

  const missing = required.filter(key => {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value?.[k];
    }
    return !value;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
}

// Validate on load
if (config.app.env !== 'test') {
  validateConfig();
}

module.exports = config;

