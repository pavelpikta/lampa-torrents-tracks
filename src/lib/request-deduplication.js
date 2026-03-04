/**
 * Request deduplication utility to prevent duplicate concurrent requests.
 */

const { defaultLogger } = require('./logger');

class RequestDeduplicator {
  constructor(options = {}) {
    this.pendingRequests = new Map();
    this.logger = options.logger || defaultLogger;
    this.maxPendingAge = options.maxPendingAge || 300000; // 5 minutes
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute

    // Start cleanup interval
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * Generate request key from hash and index
   */
  _makeKey(hash, index) {
    return `req:${hash}:${index}`;
  }

  /**
   * Execute request with deduplication
   * @param {string} hash - Torrent hash
   * @param {string} index - File index
   * @param {Function} requestFn - Function that executes the request (callback-based)
   * @param {Function} callback - Callback function (statusCode, data)
   */
  execute(hash, index, requestFn, callback) {
    const key = this._makeKey(hash, index);
    const existing = this.pendingRequests.get(key);

    if (existing) {
      // Request already in progress, add callback to queue
      this.logger.debug('Deduplicating request', { hash: hash, index });
      existing.callbacks.push(callback);
      return;
    }

    // Create new pending request entry
    const entry = {
      callbacks: [callback],
      startTime: Date.now(),
    };
    this.pendingRequests.set(key, entry);

    // Execute the request
    requestFn((statusCode, data) => {
      // Remove from pending
      const completed = this.pendingRequests.get(key);
      if (completed) {
        this.pendingRequests.delete(key);

        // Call all waiting callbacks
        completed.callbacks.forEach((cb) => {
          try {
            cb(statusCode, data);
          } catch (error) {
            this.logger.error('Error in deduplicated callback', {
              error: error.message,
              hash: hash,
            });
          }
        });
      }
    });
  }

  /**
   * Cleanup stale pending requests
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.pendingRequests.entries()) {
      if (now - entry.startTime > this.maxPendingAge) {
        this.pendingRequests.delete(key);
        cleaned++;

        // Notify all waiting callbacks with timeout error
        entry.callbacks.forEach((cb) => {
          try {
            cb(504, JSON.stringify({ error: 'Request deduplication timeout' }));
          } catch (error) {
            this.logger.error('Error in cleanup callback', { error: error.message });
          }
        });
      }
    }

    if (cleaned > 0) {
      this.logger.warn(`Request deduplication cleanup: removed ${cleaned} stale requests`);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
    };
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.pendingRequests.clear();
  }
}

/**
 * Creates a RequestDeduplicator instance.
 * @param {Object} options - Optional overrides for maxPendingAge, cleanupInterval
 */
function createDeduplicator(options = {}) {
  return new RequestDeduplicator(options);
}

module.exports = {
  RequestDeduplicator,
  createDeduplicator,
};
