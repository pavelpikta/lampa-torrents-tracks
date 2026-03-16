function parseEnvInt(name, defaultValue) {
  const v = parseInt(process.env[name], 10);
  return Number.isNaN(v) ? defaultValue : v;
}

function parseEnvPositiveInt(name, defaultValue) {
  const v = parseEnvInt(name, defaultValue);
  if (v <= 0 || !Number.isInteger(v)) {
    console.warn(
      `[config] ${name} must be a positive integer; got ${v}. Using default: ${defaultValue}`,
    );
    return defaultValue;
  }
  return v;
}

const HTTP_PORT = parseEnvPositiveInt('HTTP_PORT', 3000);
const TORRSERVER_URL = process.env.TORRSERVER_URL || 'http://localhost:8090';
const TORRSERVER_USERNAME = process.env.TORRSERVER_USERNAME || '';
const TORRSERVER_PASSWORD = process.env.TORRSERVER_PASSWORD || '';
const TORRSERVER_METADATA_MAX_ATTEMPTS = parseEnvPositiveInt(
  'TORRSERVER_METADATA_MAX_ATTEMPTS',
  60,
);
const TORRSERVER_METADATA_ATTEMPT_DELAY = parseEnvPositiveInt(
  'TORRSERVER_METADATA_ATTEMPT_DELAY',
  1000,
);
const TORRSERVER_REQUEST_TIMEOUT_MS = parseEnvPositiveInt('TORRSERVER_REQUEST_TIMEOUT_MS', 60000);
const TORRSERVER_RESPONSE_MAX_BYTES = parseEnvInt('TORRSERVER_RESPONSE_MAX_BYTES', 5 * 1024 * 1024); // 5MB default
const STATIC_CACHE_FILES = ['index.html', 'app.js', 'info.html'];

const CACHE_MAX_SIZE = parseEnvPositiveInt('CACHE_MAX_SIZE', 1000);
const CACHE_TTL_MS = parseEnvPositiveInt('CACHE_TTL_MS', 3600000); // 1 hour default
const CACHE_CLEANUP_INTERVAL_MS = parseEnvPositiveInt('CACHE_CLEANUP_INTERVAL_MS', 600000); // 10 minutes

const RATE_LIMIT_MAX_REQUESTS = parseEnvPositiveInt('RATE_LIMIT_MAX_REQUESTS', 120); // per window per IP
const RATE_LIMIT_WINDOW_MS = parseEnvPositiveInt('RATE_LIMIT_WINDOW_MS', 60000); // 1 minute window

const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';

/** Comma-separated list of trusted proxy IPs; when set, X-Forwarded-For is used to derive client IP */
const TRUSTED_PROXY_IPS = (process.env.TRUSTED_PROXY_IPS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function printBanner() {
  console.log('Lampa Tracks FFprobe API Server');
  console.log('================================');
  console.log(`HTTP Port: ${HTTP_PORT}`);
  console.log(`TorrServer URL: ${TORRSERVER_URL}`);
  console.log(`Authentication: ${TORRSERVER_USERNAME ? 'Enabled' : 'Disabled'}`);
  console.log('');
}

module.exports = {
  parseEnvInt,
  parseEnvPositiveInt,
  HTTP_PORT,
  TORRSERVER_URL,
  TORRSERVER_USERNAME,
  TORRSERVER_PASSWORD,
  TORRSERVER_METADATA_MAX_ATTEMPTS,
  TORRSERVER_METADATA_ATTEMPT_DELAY,
  TORRSERVER_REQUEST_TIMEOUT_MS,
  TORRSERVER_RESPONSE_MAX_BYTES,
  STATIC_CACHE_FILES,
  CACHE_MAX_SIZE,
  CACHE_TTL_MS,
  CACHE_CLEANUP_INTERVAL_MS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  LOG_LEVEL,
  TRUSTED_PROXY_IPS,
  printBanner,
};
