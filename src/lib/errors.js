/**
 * Centralized error handling with error codes and user-friendly messages.
 */

const { defaultLogger } = require('./logger');

/**
 * Application error codes
 */
const ERROR_CODES = {
  // Validation errors (4xx)
  INVALID_HASH: 'INVALID_HASH',
  INVALID_INDEX: 'INVALID_INDEX',
  INVALID_URL: 'INVALID_URL',
  MISSING_PARAMETER: 'MISSING_PARAMETER',

  // TorrServer errors (5xx)
  TORRSERVER_CONNECTION_FAILED: 'TORRSERVER_CONNECTION_FAILED',
  TORRSERVER_TIMEOUT: 'TORRSERVER_TIMEOUT',
  TORRSERVER_AUTH_FAILED: 'TORRSERVER_AUTH_FAILED',
  TORRSERVER_RESPONSE_TOO_LARGE: 'TORRSERVER_RESPONSE_TOO_LARGE',
  TORRSERVER_INVALID_RESPONSE: 'TORRSERVER_INVALID_RESPONSE',

  // Metadata errors
  METADATA_TIMEOUT: 'METADATA_TIMEOUT',
  METADATA_NOT_AVAILABLE: 'METADATA_NOT_AVAILABLE',
  TORRENT_ADD_FAILED: 'TORRENT_ADD_FAILED',
  TORRENT_NOT_FOUND: 'TORRENT_NOT_FOUND',

  // Internal errors
  JSON_PARSE_ERROR: 'JSON_PARSE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_HASH]: 'Invalid torrent hash or magnet link',
  [ERROR_CODES.INVALID_INDEX]: 'Invalid file index: must be a non-negative integer',
  [ERROR_CODES.INVALID_URL]: 'Invalid request URL',
  [ERROR_CODES.MISSING_PARAMETER]: 'Missing required parameter',

  [ERROR_CODES.TORRSERVER_CONNECTION_FAILED]:
    'Failed to connect to TorrServer. Please check if TorrServer is running and accessible.',
  [ERROR_CODES.TORRSERVER_TIMEOUT]:
    'Request to TorrServer timed out. The server may be overloaded or unavailable.',
  [ERROR_CODES.TORRSERVER_AUTH_FAILED]:
    'Authentication failed. Please check your TorrServer credentials.',
  [ERROR_CODES.TORRSERVER_RESPONSE_TOO_LARGE]: 'TorrServer response is too large',
  [ERROR_CODES.TORRSERVER_INVALID_RESPONSE]: 'Invalid response from TorrServer',

  [ERROR_CODES.METADATA_TIMEOUT]:
    'Timeout waiting for torrent metadata. The torrent may be slow to load or unavailable.',
  [ERROR_CODES.METADATA_NOT_AVAILABLE]: 'Torrent metadata is not available',
  [ERROR_CODES.TORRENT_ADD_FAILED]:
    'Failed to add torrent to TorrServer. Please check if the hash is valid.',
  [ERROR_CODES.TORRENT_NOT_FOUND]: 'Torrent not found in TorrServer',

  [ERROR_CODES.JSON_PARSE_ERROR]: 'Failed to parse server response',
  [ERROR_CODES.INTERNAL_ERROR]: 'An internal error occurred. Please try again later.',
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred',
};

/**
 * Maps HTTP status codes to error codes
 */
const STATUS_TO_ERROR_CODE = {
  400: ERROR_CODES.INVALID_HASH,
  401: ERROR_CODES.TORRSERVER_AUTH_FAILED,
  404: ERROR_CODES.TORRENT_NOT_FOUND,
  408: ERROR_CODES.METADATA_TIMEOUT,
  413: ERROR_CODES.TORRSERVER_RESPONSE_TOO_LARGE,
  500: ERROR_CODES.INTERNAL_ERROR,
  502: ERROR_CODES.TORRSERVER_CONNECTION_FAILED,
  503: ERROR_CODES.TORRSERVER_CONNECTION_FAILED,
  504: ERROR_CODES.TORRSERVER_TIMEOUT,
};

/**
 * Application Error class
 */
class AppError extends Error {
  constructor(code, message, statusCode = 500, details = {}) {
    super(message || ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts error to JSON response format
   */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(Object.keys(this.details).length > 0 && { details: this.details }),
    };
  }
}

/**
 * Creates an error from HTTP status code
 */
function createErrorFromStatus(statusCode, data = null, context = {}) {
  const { code: explicitCode, ...details } = context;
  const code = explicitCode || STATUS_TO_ERROR_CODE[statusCode] || ERROR_CODES.UNKNOWN_ERROR;
  let message = ERROR_MESSAGES[code];

  // Try to extract error message from response data
  if (data) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (parsed.error && typeof parsed.error === 'string') {
        message = parsed.error;
      }
    } catch {
      // Ignore parse errors, use default message
    }
  }

  return new AppError(code, message, statusCode, details);
}

/**
 * Handles errors and sends appropriate HTTP response
 * @param {Object} httpRes - HTTP response object
 * @param {Error|AppError} error - Error to handle
 * @param {Object} logger - Logger instance
 * @param {string} apiVersion - Optional API version for response headers
 * @param {string} requestId - Optional request ID for tracing
 */
function handleError(httpRes, error, logger = defaultLogger, apiVersion = null, requestId = null) {
  let appError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    logger.error('Unhandled error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...(requestId && { requestId }),
    });
    appError = new AppError(
      ERROR_CODES.INTERNAL_ERROR,
      ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR],
      500,
    );
  } else {
    logger.error('Unknown error type', {
      error,
      ...(requestId && { requestId }),
    });
    appError = new AppError(ERROR_CODES.UNKNOWN_ERROR, 'An unexpected error occurred', 500);
  }

  logger.warn('Error response', {
    code: appError.code,
    statusCode: appError.statusCode,
    message: appError.message,
    details: appError.details,
    apiVersion,
    ...(requestId && { requestId }),
  });

  const body = JSON.stringify(appError.toJSON());
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  };
  if (apiVersion) {
    headers['X-API-Version'] = apiVersion;
  }
  httpRes.writeHead(appError.statusCode, headers);
  httpRes.end(body);
}

module.exports = {
  AppError,
  ERROR_CODES,
  ERROR_MESSAGES,
  createErrorFromStatus,
  handleError,
};
