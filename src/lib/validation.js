/**
 * Extracts torrent hash from magnet link or validates hash string
 * @param {string} input - Magnet link or hash string
 * @returns {string} Extracted/validated hash in lowercase, or empty string if invalid
 */
function extractHashFromMagnet(input) {
  if (!input || typeof input !== 'string') return '';

  const trimmed = input.trim();
  if (!trimmed) return '';

  // Handle magnet links
  if (trimmed.toLowerCase().startsWith('magnet:')) {
    const match = trimmed.match(/xt=urn:btih:([a-fA-F0-9]{40})/i);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    return ''; // Invalid magnet link format
  }

  // Handle direct hash (must be exactly 40 hex characters)
  if (/^[a-fA-F0-9]{40}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return ''; // Invalid format
}

/**
 * Validates and normalizes file index parameter
 * @param {string|number} input - File index input
 * @returns {string|null} Validated index as string, or null if invalid
 */
function validateIndex(input) {
  if (input == null || input === '') return null;

  const s = String(input).trim();
  if (s === '') return null;

  // Must be numeric only
  if (!/^\d+$/.test(s)) return null;

  const n = parseInt(s, 10);

  // Must be non-negative and safe integer
  if (n < 0 || !Number.isSafeInteger(n)) return null;

  return String(n);
}

module.exports = {
  extractHashFromMagnet,
  validateIndex,
};
