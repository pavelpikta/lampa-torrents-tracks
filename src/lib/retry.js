/**
 * Retry utility with exponential backoff for resilient request handling.
 */

const { defaultLogger } = require('./logger');

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504], // Timeout, rate limit, server errors
};

/**
 * Calculates delay for exponential backoff
 */
function calculateDelay(attempt, config) {
  const { initialDelay, maxDelay, backoffMultiplier } = config;
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Checks if an error/status code is retryable
 */
function isRetryable(statusCode, config = DEFAULT_RETRY_CONFIG) {
  return config.retryableStatusCodes.includes(statusCode);
}

/**
 * Executes a function with retry logic
 * @param {Function} fn - Function to execute (should return Promise or accept callback)
 * @param {Object} options - Retry configuration
 * @param {Function} logger - Logger instance
 * @returns {Promise} Promise that resolves with the result
 */
function withRetry(fn, options = {}, logger = defaultLogger) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  const { maxAttempts } = config;

  return new Promise((resolve, reject) => {
    let attempt = 0;

    function execute() {
      attempt++;

      // Handle both Promise and callback-based functions
      const result = fn((statusCode, data) => {
        if (statusCode >= 200 && statusCode < 300) {
          resolve({ statusCode, data });
        } else if (isRetryable(statusCode, config) && attempt < maxAttempts) {
          const delay = calculateDelay(attempt, config);
          logger.warn(
            `Request failed with status ${statusCode}, retrying (${attempt}/${maxAttempts - 1})`,
            {
              statusCode,
              attempt,
              delayMs: delay,
            },
          );

          setTimeout(() => {
            execute();
          }, delay);
        } else {
          reject({ statusCode, data });
        }
      });

      // If function returns a Promise, handle it
      if (result && typeof result.then === 'function') {
        result
          .then((value) => {
            resolve({ statusCode: 200, data: value });
          })
          .catch((error) => {
            const statusCode = error.statusCode || 500;
            if (isRetryable(statusCode, config) && attempt < maxAttempts) {
              const delay = calculateDelay(attempt, config);
              logger.warn(`Request failed, retrying (${attempt}/${maxAttempts - 1})`, {
                error: error.message,
                attempt,
                delayMs: delay,
              });

              setTimeout(() => {
                execute();
              }, delay);
            } else {
              reject({ statusCode, data: error.message });
            }
          });
      }
    }

    execute();
  });
}

module.exports = {
  withRetry,
  isRetryable,
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
};
