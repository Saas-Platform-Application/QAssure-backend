const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format for file output
const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// Get log configuration from environment or config
const logLevel = process.env.LOG_LEVEL || config.logging.level || 'info';
const logFormatType = process.env.LOG_FORMAT || config.logging.format || 'combined';
const logFile = process.env.LOG_FILE || config.logging.file || path.join(logsDir, 'app.log');

// Create logger instance
// Note: File transports always use JSON format for structured logging
// logFormatType is used for console output formatting
const logger = winston.createLogger({
  level: logLevel,
  format: fileLogFormat,
  defaultMeta: { service: config.app.name },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with importance level of `info` or less to combined log file
    new winston.transports.File({
      filename: logFile,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production, log to the console as well
if (config.app.env !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

module.exports = logger;

