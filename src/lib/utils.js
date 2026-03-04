/**
 * Utility functions.
 */

const crypto = require('crypto');

/**
 * Generates a unique request ID for tracking requests across the system.
 * @returns {string} Request ID (8 character hex string)
 */
function generateRequestId() {
  return crypto.randomBytes(4).toString('hex');
}

module.exports = {
  generateRequestId,
};
