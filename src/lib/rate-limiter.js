/**
 * Sliding-window in-memory rate limiter (per IP).
 */

class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 120;
    this.windowMs = options.windowMs || 60000;
    this.requests = new Map(); // ip -> timestamp[]
    this.cleanupTimer = setInterval(() => this._cleanup(), Math.min(this.windowMs, 60000));
  }

  /**
   * Returns true if the request from `ip` is within the rate limit.
   * Records the request regardless.
   * @param {string} ip
   * @returns {boolean}
   */
  isAllowed(ip) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const existing = this.requests.get(ip);
    const timestamps = existing ? existing.filter((t) => t > windowStart) : [];
    timestamps.push(now);
    this.requests.set(ip, timestamps);

    return timestamps.length <= this.maxRequests;
  }

  /**
   * Returns the remaining requests allowed for `ip` in the current window.
   * @param {string} ip
   * @returns {number}
   */
  remaining(ip) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = (this.requests.get(ip) || []).filter((t) => t > windowStart);
    return Math.max(0, this.maxRequests - timestamps.length);
  }

  _cleanup() {
    const windowStart = Date.now() - this.windowMs;
    for (const [ip, timestamps] of this.requests.entries()) {
      const active = timestamps.filter((t) => t > windowStart);
      if (active.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, active);
      }
    }
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.requests.clear();
  }
}

module.exports = { RateLimiter };
