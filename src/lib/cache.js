/**
 * In-memory cache with TTL support for FFprobe results and other data.
 * Implements LRU-like eviction and automatic expiration.
 */

const { defaultLogger } = require('./logger');

class Cache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 3600000; // 1 hour default
    this.cleanupInterval = options.cleanupInterval || 600000; // 10 minutes
    this.store = new Map();
    this.accessOrder = new Map(); // Track access order for LRU-like behavior
    this.logger = options.logger || defaultLogger;

    // Start cleanup interval
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * Generate cache key from hash and index
   */
  _makeKey(hash, index) {
    return `ffprobe:${hash}:${index}`;
  }

  /**
   * Get value from cache
   */
  get(hash, index) {
    const key = this._makeKey(hash, index);
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.accessOrder.delete(key);
      return null;
    }

    // Update access order
    this.accessOrder.set(key, Date.now());
    return entry.value;
  }

  /**
   * Set value in cache with optional TTL
   */
  set(hash, index, value, ttl = null) {
    const key = this._makeKey(hash, index);
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    // Evict oldest entries if cache is full
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this._evictOldest();
    }

    this.store.set(key, { value, expiresAt });
    this.accessOrder.set(key, Date.now());
  }

  /**
   * Delete entry from cache
   */
  delete(hash, index) {
    const key = this._makeKey(hash, index);
    this.store.delete(key);
    this.accessOrder.delete(key);
  }

  /**
   * Clear all entries
   */
  clear() {
    this.store.clear();
    this.accessOrder.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const entry of this.store.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      size: this.store.size,
      active,
      expired,
      maxSize: this.maxSize,
    };
  }

  /**
   * Evict oldest entry based on access order
   * @private
   */
  _evictOldest() {
    if (this.accessOrder.size === 0) return;

    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        this.accessOrder.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Destroy cache and cleanup timer
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

/**
 * Creates a Cache instance from a config object.
 * @param {Object} config - { CACHE_MAX_SIZE, CACHE_TTL_MS, CACHE_CLEANUP_INTERVAL_MS }
 */
function createCache(config = {}) {
  return new Cache({
    maxSize: config.CACHE_MAX_SIZE || 1000,
    defaultTTL: config.CACHE_TTL_MS || 3600000,
    cleanupInterval: config.CACHE_CLEANUP_INTERVAL_MS || 600000,
  });
}

module.exports = {
  Cache,
  createCache,
};
