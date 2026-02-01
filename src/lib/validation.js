function extractHashFromMagnet(input) {
  if (!input) return '';

  if (input.toLowerCase().startsWith('magnet:')) {
    const match = input.match(/xt=urn:btih:([a-fA-F0-9]{40})/i);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  }

  if (/^[a-fA-F0-9]{40}$/i.test(input.trim())) {
    return input.trim().toLowerCase();
  }

  return input.trim();
}

function validateIndex(input) {
  if (input == null || input === '') return null;
  const s = String(input).trim();
  if (s === '') return null;
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  if (n < 0 || !Number.isSafeInteger(n)) return null;
  return String(n);
}

module.exports = {
  extractHashFromMagnet,
  validateIndex,
};
