/**
 * Handles FFprobe API response and sends appropriate HTTP response.
 * Uses centralized error handling and structured logging.
 * @param {Object} httpRes - HTTP response object
 * @param {number} statusCode - Status code from TorrServer
 * @param {string} data - Response body
 * @param {Object} config - Optional config (metadataMaxAttempts, metadataAttemptDelay, logger, cacheControlMaxAge)
 */
const { handleError, createErrorFromStatus, ERROR_CODES } = require('../lib/errors');
const { defaultLogger } = require('../lib/logger');

function handleFFprobeResponse(httpRes, statusCode, data, config = {}) {
  const {
    metadataMaxAttempts = 60,
    metadataAttemptDelay = 1000,
    logger = defaultLogger,
    cacheControlMaxAge = 3600,
  } = config;

  if (statusCode === 200) {
    try {
      const jsonData = JSON.parse(data);
      const streamCount = jsonData.streams?.length || 0;
      logger.info(`FFprobe response received`, {
        streamCount,
        hash: config.hash ? config.hash : undefined,
      });

      const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${cacheControlMaxAge}`,
        'Content-Length': Buffer.byteLength(data, 'utf8'),
      };
      if (config.apiVersion) {
        headers['X-API-Version'] = config.apiVersion;
      }
      httpRes.writeHead(200, headers);
      httpRes.end(data);
    } catch (error) {
      logger.error('JSON parse error in FFprobe response', {
        error: error.message,
        hash: config.hash ? config.hash : undefined,
      });
      const parseError = createErrorFromStatus(500, null, {
        originalError: error.message,
        code: ERROR_CODES.JSON_PARSE_ERROR,
        metadataMaxAttempts,
        metadataAttemptDelay,
        hash: config.hash ? config.hash : undefined,
        apiVersion: config.apiVersion,
      });
      handleError(httpRes, parseError, logger, config.apiVersion);
    }
  } else {
    // Use centralized error handling
    const error = createErrorFromStatus(statusCode, data, {
      metadataMaxAttempts,
      metadataAttemptDelay,
      hash: config.hash ? config.hash : undefined,
      apiVersion: config.apiVersion,
    });
    handleError(httpRes, error, logger, config.apiVersion);
  }
}

module.exports = {
  handleFFprobeResponse,
};
