function parseEnvInt(name, defaultValue) {
  const v = parseInt(process.env[name], 10);
  return Number.isNaN(v) ? defaultValue : v;
}

const HTTP_PORT = parseEnvInt('HTTP_PORT', 3000) || 3000;
const TORRSERVER_URL = process.env.TORRSERVER_URL || 'http://localhost:8090';
const TORRSERVER_USERNAME = process.env.TORRSERVER_USERNAME || '';
const TORRSERVER_PASSWORD = process.env.TORRSERVER_PASSWORD || '';
const TORRSERVER_METADATA_MAX_ATTEMPTS = parseEnvInt('TORRSERVER_METADATA_MAX_ATTEMPTS', 60) || 60;
const TORRSERVER_METADATA_ATTEMPT_DELAY =
  parseEnvInt('TORRSERVER_METADATA_ATTEMPT_DELAY', 1000) || 1000;
const TORRSERVER_REQUEST_TIMEOUT_MS = parseEnvInt('TORRSERVER_REQUEST_TIMEOUT_MS', 60000);
const TORRSERVER_RESPONSE_MAX_BYTES =
  parseEnvInt('TORRSERVER_RESPONSE_MAX_BYTES', 5 * 1024 * 1024) || 5 * 1024 * 1024; // 5MB default
const STATIC_CACHE_FILES = ['index.html', 'app.js', 'info.html'];

const CACHE_MAX_SIZE = parseEnvInt('CACHE_MAX_SIZE', 1000);
const CACHE_TTL_MS = parseEnvInt('CACHE_TTL_MS', 3600000); // 1 hour default
const CACHE_CLEANUP_INTERVAL_MS = parseEnvInt('CACHE_CLEANUP_INTERVAL_MS', 600000); // 10 minutes

const RATE_LIMIT_MAX_REQUESTS = parseEnvInt('RATE_LIMIT_MAX_REQUESTS', 120); // per window per IP
const RATE_LIMIT_WINDOW_MS = parseEnvInt('RATE_LIMIT_WINDOW_MS', 60000); // 1 minute window

const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';

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
  printBanner,
};
