const path = require('path');
const validation = require('./lib/validation');
const { createTorrServerClient } = require('./lib/torrserver');
const staticServer = require('./lib/static');
const ffprobeHandler = require('./handlers/ffprobe');
const { handleError, AppError, ERROR_CODES } = require('./lib/errors');
const { defaultLogger } = require('./lib/logger');
const { createCache } = require('./lib/cache');
const { createDeduplicator } = require('./lib/request-deduplication');
const { RateLimiter } = require('./lib/rate-limiter');
const { generateRequestId } = require('./lib/utils');

/**
 * Creates the main HTTP request handler with CORS, routing, rate limiting, and static serving.
 * @param {Object} config - App config (from config.js)
 * @returns {function(req, res)} Request handler with .cleanup()
 */
function createRequestHandler(config) {
  const {
    TORRSERVER_URL,
    TORRSERVER_USERNAME,
    TORRSERVER_PASSWORD,
    TORRSERVER_REQUEST_TIMEOUT_MS,
    TORRSERVER_RESPONSE_MAX_BYTES,
    TORRSERVER_METADATA_MAX_ATTEMPTS,
    TORRSERVER_METADATA_ATTEMPT_DELAY,
    STATIC_CACHE_FILES,
    CACHE_MAX_SIZE,
    CACHE_TTL_MS,
    CACHE_CLEANUP_INTERVAL_MS,
    RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_WINDOW_MS,
    TRUSTED_PROXY_IPS = [],
  } = config;

  const trustedProxySet = new Set(
    (TRUSTED_PROXY_IPS || []).map((s) => (s.startsWith('::ffff:') ? s.slice(7) : s)),
  );

  /**
   * Normalize IP for comparison (strip IPv6-mapped prefix).
   */
  function normalizeIp(ip) {
    if (!ip || typeof ip !== 'string') return '';
    const trimmed = ip.trim();
    return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
  }

  /**
   * True if the IP is private/link-local/loopback (not a public client).
   */
  function isPrivateOrLocal(ip) {
    const n = normalizeIp(ip);
    if (!n) return true;
    if (n === '::1' || n === '127.0.0.1') return true;
    if (n.startsWith('127.')) return true;
    if (n.startsWith('10.')) return true;
    if (n.startsWith('192.168.')) return true;
    if (n.startsWith('172.')) {
      const second = parseInt(n.split('.')[1], 10);
      if (second >= 16 && second <= 31) return true;
    }
    if (n.startsWith('fe80:') || n.startsWith('fc') || n.startsWith('fd')) return true;
    return false;
  }

  /**
   * Derive trusted client IP: when behind trusted proxies use X-Forwarded-For
   * (first public/non-private IP not in trusted list), otherwise socket.remoteAddress.
   */
  function getClientIp(req) {
    const remote = normalizeIp(req.socket?.remoteAddress || '');
    if (trustedProxySet.size === 0) {
      return remote || 'unknown';
    }
    const xff = req.headers['x-forwarded-for'];
    if (!xff || typeof xff !== 'string') {
      return remote || 'unknown';
    }
    const parts = xff
      .split(',')
      .map((s) => normalizeIp(s))
      .filter(Boolean);
    for (const ip of parts) {
      if (trustedProxySet.has(ip)) continue;
      if (isPrivateOrLocal(ip)) continue;
      return ip;
    }
    return remote || 'unknown';
  }

  const torrserver = createTorrServerClient({
    url: TORRSERVER_URL,
    username: TORRSERVER_USERNAME,
    password: TORRSERVER_PASSWORD,
    requestTimeoutMs: TORRSERVER_REQUEST_TIMEOUT_MS,
    responseMaxBytes: TORRSERVER_RESPONSE_MAX_BYTES,
    metadataMaxAttempts: TORRSERVER_METADATA_MAX_ATTEMPTS,
    metadataAttemptDelay: TORRSERVER_METADATA_ATTEMPT_DELAY,
  });

  const cache = createCache({ CACHE_MAX_SIZE, CACHE_TTL_MS, CACHE_CLEANUP_INTERVAL_MS });
  const deduplicator = createDeduplicator();
  const rateLimiter = new RateLimiter({
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });

  const baseDir = path.join(__dirname, '..', 'public');
  const logger = defaultLogger;
  const ffprobeConfig = {
    metadataMaxAttempts: TORRSERVER_METADATA_MAX_ATTEMPTS,
    metadataAttemptDelay: TORRSERVER_METADATA_ATTEMPT_DELAY,
    logger,
  };

  /**
   * Attempts to cache a successful (200) FFprobe response.
   * Logs a warning and skips caching if the data is not valid JSON.
   */
  function tryCacheResponse(hash, index, data) {
    try {
      JSON.parse(data);
      cache.set(hash, index, data);
    } catch (error) {
      logger.warn('Failed to cache response (invalid JSON)', {
        hash: hash,
        index,
        error: error.message,
      });
    }
  }

  /**
   * Sends a cached JSON response with appropriate headers.
   */
  function sendCachedResponse(httpRes, cached, apiVersion) {
    const maxAgeSec = Math.floor(CACHE_TTL_MS / 1000);
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${maxAgeSec}`,
      'X-Cache': 'HIT',
      'Content-Length': Buffer.byteLength(cached),
    };
    if (apiVersion) headers['X-API-Version'] = apiVersion;
    httpRes.writeHead(200, headers);
    httpRes.end(cached);
  }

  /**
   * Handles validation errors for request parameters.
   * Validates hash (presence and format) first; only reports INVALID_INDEX when index is actually invalid.
   */
  function handleValidationError(httpRes, queryParams, apiVersion, requestId) {
    const hashRaw = queryParams.get('hash') || '';
    const hash = validation.extractHashFromMagnet(hashRaw);
    const hashValid = hash && /^[a-f0-9]{40}$/i.test(hash);
    if (!hashValid) {
      handleError(
        httpRes,
        new AppError(ERROR_CODES.INVALID_HASH, 'Hash is required or invalid magnet link', 400),
        logger,
        apiVersion,
        requestId,
      );
      return;
    }
    handleError(
      httpRes,
      new AppError(ERROR_CODES.INVALID_INDEX, 'Invalid index: must be a non-negative integer', 400),
      logger,
      apiVersion,
      requestId,
    );
  }

  /**
   * Parses and validates request parameters.
   * @returns {{ hash, index, title }|null}
   */
  function parseRequestParams(queryParams) {
    let hash = queryParams.get('hash') || '';
    const indexRaw = queryParams.get('index') || '1';
    const title = queryParams.get('title') || '';

    const index = validation.validateIndex(indexRaw);
    if (index === null) return null;

    hash = validation.extractHashFromMagnet(hash);
    if (!hash || !/^[a-f0-9]{40}$/i.test(hash)) return null;

    return { hash, index, title };
  }

  /**
   * Handles FFprobe request with caching and deduplication (torrent must already exist).
   */
  function handleFFprobeRequest(hash, index, httpRes, apiVersion = null) {
    const cached = cache.get(hash, index);
    if (cached) {
      logger.info('Cache hit', { hash: hash, index, apiVersion });
      sendCachedResponse(httpRes, cached, apiVersion);
      return;
    }

    deduplicator.execute(
      hash,
      index,
      (callback) => {
        torrserver.callFfpApi(hash, index, (statusCode, data) => {
          if (statusCode === 200) tryCacheResponse(hash, index, data);
          callback(statusCode, data);
        });
      },
      (statusCode, data) => {
        ffprobeHandler.handleFFprobeResponse(httpRes, statusCode, data, {
          ...ffprobeConfig,
          hash,
          apiVersion,
        });
      },
    );
  }

  /**
   * Handles FFprobe-auto request with caching, deduplication, and torrent management.
   */
  function handleFFprobeAutoRequest(hash, index, title, httpRes, apiVersion = null) {
    const cached = cache.get(hash, index);
    if (cached) {
      logger.info('Cache hit (auto)', { hash: hash, index, apiVersion });
      sendCachedResponse(httpRes, cached, apiVersion);
      return;
    }

    deduplicator.execute(
      hash,
      index,
      (callback) => {
        torrserver.checkTorrentExists(hash, (exists) => {
          if (exists) {
            logger.debug('Torrent exists, calling FFprobe', { hash: hash });
            torrserver.callFfpApi(hash, index, (statusCode, data) => {
              if (statusCode === 200) tryCacheResponse(hash, index, data);
              callback(statusCode, data);
            });
            return;
          }

          torrserver.addTorrent(hash, title, (success, result) => {
            if (!success) {
              logger.error('Failed to add torrent', { hash: hash });
              const error = new AppError(
                ERROR_CODES.TORRENT_ADD_FAILED,
                'Failed to add torrent to TorrServer',
                400,
                { hint: 'Check if hash is valid and TorrServer is accessible' },
              );
              callback(400, JSON.stringify(error.toJSON()));
              return;
            }

            const onFfpResult = (statusCode, data) => {
              if (statusCode === 200) tryCacheResponse(hash, index, data);
              callback(statusCode, data);
            };

            if (torrserver.hasFileStats(result)) {
              logger.debug('Torrent added, metadata ready', { hash: hash });
              torrserver.callFfpApi(hash, index, onFfpResult);
              return;
            }

            const maxWaitSec = Math.round(
              (TORRSERVER_METADATA_MAX_ATTEMPTS * TORRSERVER_METADATA_ATTEMPT_DELAY) / 1000,
            );
            logger.info(`Waiting for metadata (max ${maxWaitSec}s)`, {
              hash: hash,
            });
            torrserver.waitForMetadataThenFfp(hash, index, onFfpResult);
          });
        });
      },
      (statusCode, data) => {
        ffprobeHandler.handleFFprobeResponse(httpRes, statusCode, data, {
          ...ffprobeConfig,
          hash,
          apiVersion,
        });
      },
    );
  }

  function requestHandler(req, httpRes) {
    const requestId = generateRequestId();
    httpRes.setHeader('X-Request-ID', requestId);
    httpRes.setHeader('Access-Control-Allow-Origin', '*');
    httpRes.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    httpRes.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      httpRes.writeHead(200);
      httpRes.end();
      return;
    }

    let reqUrl;
    try {
      reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch (error) {
      logger.warn('Invalid request URL', { requestId, url: req.url, error: error.message });
      handleError(
        httpRes,
        new AppError(ERROR_CODES.INVALID_URL, 'Bad request URL', 400),
        logger,
        null,
        requestId,
      );
      return;
    }
    const pathname = reqUrl.pathname;

    // Rate limiting applies to API endpoints only (trusted client IP to avoid spoofing)
    if (pathname.startsWith('/api/')) {
      const ip = getClientIp(req);
      if (!rateLimiter.isAllowed(ip)) {
        logger.warn('Rate limit exceeded', { requestId, ip });
        const body = JSON.stringify({
          error: 'Too many requests. Please slow down.',
          code: 'RATE_LIMIT_EXCEEDED',
        });
        httpRes.writeHead(429, {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Retry-After': String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)),
        });
        httpRes.end(body);
        return;
      }
    }

    if (pathname === '/health') {
      torrserver.ping((reachable, tsStatusCode) => {
        const cacheStats = cache.getStats();
        const dedupStats = deduplicator.getStats();
        const body = JSON.stringify({
          status: reachable ? 'ok' : 'degraded',
          timestamp: new Date().toISOString(),
          torrserver: { reachable, ...(reachable ? {} : { statusCode: tsStatusCode }) },
          api: {
            version: '1.0.0',
            endpoints: {
              v1: { tracks: '/api/v1/tracks', tracksAuto: '/api/v1/tracks/auto' },
            },
          },
          cache: cacheStats,
          deduplication: dedupStats,
        });
        httpRes.writeHead(reachable ? 200 : 503, {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        });
        httpRes.end(body);
      });
      return;
    }

    if (pathname === '/api/v1/tracks' && req.method === 'GET') {
      const queryParams = reqUrl.searchParams;
      const params = parseRequestParams(queryParams);

      if (!params) {
        handleValidationError(httpRes, queryParams, 'v1', requestId);
        return;
      }

      logger.info('API v1 tracks request', {
        requestId,
        hash: params.hash,
        index: params.index,
      });

      handleFFprobeRequest(params.hash, params.index, httpRes, 'v1');
      return;
    }

    if (pathname === '/api/v1/tracks/auto' && req.method === 'GET') {
      const queryParams = reqUrl.searchParams;
      const params = parseRequestParams(queryParams);

      if (!params) {
        handleValidationError(httpRes, queryParams, 'v1', requestId);
        return;
      }

      logger.info('API v1 tracks/auto request', {
        requestId,
        hash: params.hash,
        index: params.index,
        title: params.title || 'none',
      });

      handleFFprobeAutoRequest(params.hash, params.index, params.title, httpRes, 'v1');
      return;
    }

    staticServer.serveStatic(httpRes, pathname, baseDir, STATIC_CACHE_FILES);
  }

  requestHandler.cleanup = () => {
    torrserver.destroy();
    cache.destroy();
    deduplicator.destroy();
    rateLimiter.destroy();
  };

  return requestHandler;
}

module.exports = {
  createRequestHandler,
};
