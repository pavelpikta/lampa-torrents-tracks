const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodes a 32-char RFC 4648 base32 string to 40-char lowercase hex (e.g. BTIH).
 * @param {string} base32Str - 32-character base32 string
 * @returns {string|null} 40-char hex or null if invalid
 */
function base32ToHex(base32Str) {
  if (!base32Str || base32Str.length !== 32) return null;
  const clean = base32Str.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (const c of clean) {
    const idx = BASE32_ALPHABET.indexOf(c);
    if (idx === -1) return null;
    bits += idx.toString(2).padStart(5, '0');
  }
  if (bits.length < 160) return null;
  bits = bits.slice(0, 160);
  let hex = '';
  for (let i = 0; i < bits.length; i += 8) {
    const byte = parseInt(bits.slice(i, i + 8), 2);
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex.toLowerCase();
}

/**
 * Extracts torrent hash from magnet link or validates hash string
 * @param {string} input - Magnet link or hash string
 * @returns {string} Extracted/validated hash in lowercase hex, or empty string if invalid
 */
function extractHashFromMagnet(input) {
  if (!input || typeof input !== 'string') return '';

  const trimmed = input.trim();
  if (!trimmed) return '';

  // Handle magnet links (40 hex or 32 base32 BTIH)
  if (trimmed.toLowerCase().startsWith('magnet:')) {
    const match = trimmed.match(/xt=urn:btih:([a-fA-F0-9]{40}|[A-Za-z2-7]{32})/i);
    if (match && match[1]) {
      const raw = match[1];
      if (raw.length === 32) {
        const hex = base32ToHex(raw);
        return hex != null ? hex : '';
      }
      return raw.toLowerCase();
    }
    return ''; // Invalid magnet link format
  }

  // Handle direct hash: 40 hex or 32-char base32
  if (/^[a-fA-F0-9]{40}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^[A-Za-z2-7]{32}$/.test(trimmed)) {
    const hex = base32ToHex(trimmed);
    return hex != null ? hex : '';
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
  base32ToHex,
};
