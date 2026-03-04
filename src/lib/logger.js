/**
 * Structured logging utility with log levels and error tracking.
 * Production-ready logging with timestamps and context.
 */

const { inspect } = require('util');

/**
 * Safely serialize a value for logging. Handles circular references.
 * @param {*} value - Value to serialize
 * @returns {string} JSON or inspect representation
 */
function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return inspect(value, { depth: 4 });
  }
}

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LOG_LEVEL_NAMES = ['ERROR', 'WARN', 'INFO', 'DEBUG'];

class Logger {
  constructor(level = 'INFO') {
    this.level = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
  }

  /**
   * Logs an error with context
   * @param {string} message - Error message
   * @param {Object} context - Additional context (error, code, etc.)
   */
  error(message, context = {}) {
    this._log(LOG_LEVELS.ERROR, message, context);
  }

  /**
   * Logs a warning with context
   * @param {string} message - Warning message
   * @param {Object} context - Additional context
   */
  warn(message, context = {}) {
    this._log(LOG_LEVELS.WARN, message, context);
  }

  /**
   * Logs an info message with context
   * @param {string} message - Info message
   * @param {Object} context - Additional context
   */
  info(message, context = {}) {
    this._log(LOG_LEVELS.INFO, message, context);
  }

  /**
   * Logs a debug message with context
   * @param {string} message - Debug message
   * @param {Object} context - Additional context
   */
  debug(message, context = {}) {
    this._log(LOG_LEVELS.DEBUG, message, context);
  }

  /**
   * Internal logging method
   * @private
   */
  _log(level, message, context) {
    if (level > this.level) return;

    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    const prefix = `[${timestamp}] [${levelName}]`;
    const line =
      Object.keys(context).length === 0
        ? `${prefix} ${message}`
        : `${prefix} ${message} ${safeStringify(context)}`;

    if (level <= LOG_LEVELS.WARN) {
      console.error(line);
    } else {
      console.log(line);
    }
  }
}

// Create default logger instance
const defaultLogger = new Logger(process.env.LOG_LEVEL || 'INFO');

module.exports = {
  Logger,
  defaultLogger,
  LOG_LEVELS,
};
