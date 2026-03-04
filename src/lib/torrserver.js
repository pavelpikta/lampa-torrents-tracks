const http = require('http');
const https = require('https');
const { defaultLogger } = require('./logger');
const { AppError, ERROR_CODES, createErrorFromStatus } = require('./errors');
const { withRetry } = require('./retry');

/**
 * Creates a TorrServer API client with the given options.
 * @param {Object} options - { url, username, password, requestTimeoutMs, responseMaxBytes, metadataMaxAttempts, metadataAttemptDelay }
 * @returns {Object} - { makeTorrServerRequest, checkTorrentExists, addTorrent, callFfpApi, hasFileStats, waitForMetadataThenFfp, ping, destroy }
 */
function createTorrServerClient(options) {
  const {
    url: TORRSERVER_URL,
    username: TORRSERVER_USERNAME,
    password: TORRSERVER_PASSWORD,
    requestTimeoutMs: TORRSERVER_REQUEST_TIMEOUT_MS,
    responseMaxBytes: TORRSERVER_RESPONSE_MAX_BYTES,
    metadataMaxAttempts: TORRSERVER_METADATA_MAX_ATTEMPTS,
    metadataAttemptDelay: TORRSERVER_METADATA_ATTEMPT_DELAY,
  } = options;

  const logger = defaultLogger;

  function makeTorrServerRequest(method, path, body, callback, silent = false, timeoutMs = null) {
    const url = `${TORRSERVER_URL}${path}`;
    if (!silent) {
      logger.debug('TorrServer request', { method, path });
    }

    const client = url.startsWith('https') ? https : http;

    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
    };

    if (TORRSERVER_USERNAME || TORRSERVER_PASSWORD) {
      const auth = Buffer.from(`${TORRSERVER_USERNAME}:${TORRSERVER_PASSWORD}`).toString('base64');
      requestOptions.headers['Authorization'] = `Basic ${auth}`;
    }

    let done = false;
    let timeoutId;
    const once = (statusCode, data) => {
      if (done) return;
      done = true;
      if (timeoutId) clearTimeout(timeoutId);
      callback(statusCode, data);
    };

    const httpReq = client.request(requestOptions, (res) => {
      const chunks = [];
      let totalLength = 0;

      res.on('data', (chunk) => {
        if (totalLength >= TORRSERVER_RESPONSE_MAX_BYTES) return;
        totalLength += chunk.length;
        if (totalLength > TORRSERVER_RESPONSE_MAX_BYTES) {
          res.destroy();
          const error = new AppError(
            ERROR_CODES.TORRSERVER_RESPONSE_TOO_LARGE,
            'TorrServer response too large',
            413,
          );
          once(413, JSON.stringify(error.toJSON()));
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        if (totalLength > TORRSERVER_RESPONSE_MAX_BYTES) return;
        const data = Buffer.concat(chunks).toString('utf8');
        once(res.statusCode, data);
      });
    });

    httpReq.on('error', (error) => {
      logger.error('TorrServer request error', {
        method,
        path,
        error: error.message,
        code: error.code,
      });
      const appError = new AppError(
        ERROR_CODES.TORRSERVER_CONNECTION_FAILED,
        `Failed to fetch data: ${error.message}`,
        500,
        { originalError: error.code },
      );
      once(500, JSON.stringify(appError.toJSON()));
    });

    const effectiveTimeout = timeoutMs != null ? timeoutMs : TORRSERVER_REQUEST_TIMEOUT_MS;
    timeoutId =
      effectiveTimeout > 0
        ? setTimeout(() => {
            httpReq.destroy();
            const error = new AppError(
              ERROR_CODES.TORRSERVER_TIMEOUT,
              'TorrServer request timeout',
              504,
            );
            once(504, JSON.stringify(error.toJSON()));
          }, effectiveTimeout)
        : null;

    if (body) {
      httpReq.write(JSON.stringify(body));
    }

    httpReq.end();
  }

  function checkTorrentExists(hash, callback) {
    makeTorrServerRequest(
      'POST',
      '/torrents',
      { action: 'get', hash },
      (statusCode, data) => {
        if (statusCode === 200) {
          try {
            const torrentData = JSON.parse(data);
            callback(true, torrentData);
          } catch (error) {
            logger.error('Error parsing torrent data', {
              hash: hash,
              error: error.message,
            });
            callback(false, null);
          }
        } else {
          callback(false, null);
        }
      },
      true,
    );
  }

  function addTorrent(hash, title, callback, category) {
    logger.debug('Adding torrent', {
      hash: hash,
      title: title || 'none',
      category: category || 'tracks',
    });

    makeTorrServerRequest(
      'POST',
      '/torrents',
      {
        action: 'add',
        link: hash,
        title: title || '',
        category: category || 'tracks',
        save_to_db: false,
      },
      (statusCode, data) => {
        if (statusCode === 200) {
          try {
            const result = JSON.parse(data);
            logger.info('Torrent added successfully', { hash: hash });
            callback(true, result);
          } catch (error) {
            logger.error('Error parsing add torrent response', {
              hash: hash,
              error: error.message,
            });
            callback(false, null);
          }
        } else {
          logger.error('Error adding torrent', {
            hash: hash,
            statusCode,
          });
          callback(false, null);
        }
      },
    );
  }

  /**
   * Calls the FFprobe API with automatic retry on transient 5xx errors.
   */
  function callFfpApi(hash, index, callback) {
    withRetry(
      (cb) => makeTorrServerRequest('GET', `/ffp/${hash}/${index}`, null, cb),
      { maxAttempts: 3, initialDelay: 500, retryableStatusCodes: [500, 502, 503, 504] },
      logger,
    )
      .then(({ statusCode, data }) => callback(statusCode, data))
      .catch(({ statusCode, data }) => callback(statusCode, data));
  }

  function hasFileStats(torrentData) {
    const stats = torrentData && (torrentData.file_stats || torrentData.FileStats);
    return Array.isArray(stats) && stats.length > 0;
  }

  /**
   * Quick connectivity check against TorrServer's /echo endpoint.
   * Uses a short 3-second timeout regardless of the configured request timeout.
   * @param {Function} callback - (reachable: boolean, statusCode: number) => void
   */
  function ping(callback) {
    makeTorrServerRequest(
      'GET',
      '/echo',
      null,
      (statusCode) => {
        callback(statusCode >= 200 && statusCode < 500, statusCode);
      },
      true,
      3000,
    );
  }

  const metadataWaiters = Object.create(null);
  let cleanupInterval = null;

  function cleanupMetadataWaiters() {
    const now = Date.now();
    const maxAge = TORRSERVER_METADATA_MAX_ATTEMPTS * TORRSERVER_METADATA_ATTEMPT_DELAY * 2;

    for (const [hash, entry] of Object.entries(metadataWaiters)) {
      if (now - entry.startTime > maxAge) {
        logger.warn('Cleaning up stale metadata waiter', { hash: hash });
        if (entry.timeoutId) clearTimeout(entry.timeoutId);
        entry.callbacks.forEach(({ callback: cb }) => {
          try {
            const error = new AppError(
              ERROR_CODES.METADATA_TIMEOUT,
              'Metadata wait timeout (stale waiter)',
              408,
            );
            cb(408, JSON.stringify(error.toJSON()));
          } catch (err) {
            logger.error('Error in stale waiter cleanup callback', { error: err.message });
          }
        });
        delete metadataWaiters[hash];
      }
    }
  }

  cleanupInterval = setInterval(cleanupMetadataWaiters, 300000);

  function waitForMetadataThenFfp(
    hash,
    index,
    callback,
    maxAttempts = TORRSERVER_METADATA_MAX_ATTEMPTS,
    attemptDelay = TORRSERVER_METADATA_ATTEMPT_DELAY,
  ) {
    if (metadataWaiters[hash]) {
      metadataWaiters[hash].callbacks.push({ index, callback });
      return;
    }

    const entry = {
      callbacks: [{ index, callback }],
      attempts: 0,
      timeoutId: null,
      maxAttempts,
      attemptDelay,
      startTime: Date.now(),
    };
    metadataWaiters[hash] = entry;

    // Centralised finish: clears the scheduled timeout and notifies all waiters.
    function finishAll(statusCode, data) {
      const list = metadataWaiters[hash];
      if (!list) return;
      if (list.timeoutId) clearTimeout(list.timeoutId);
      delete metadataWaiters[hash];
      list.callbacks.forEach(({ callback: cb }) => { cb(statusCode, data); });
    }

    // Centralised success: immediately calls FFprobe for every waiter (no stagger).
    function finishWithFfp() {
      const list = metadataWaiters[hash];
      if (!list) return;
      if (list.timeoutId) clearTimeout(list.timeoutId);
      delete metadataWaiters[hash];
      list.callbacks.forEach(({ index: idx, callback: cb }) => { callFfpApi(hash, idx, cb); });
    }

    function scheduleNext() {
      if (!metadataWaiters[hash]) return;
      entry.timeoutId = setTimeout(doCheck, entry.attemptDelay);
    }

    function doCheck() {
      entry.attempts++;

      makeTorrServerRequest(
        'POST',
        '/torrents',
        { action: 'get', hash },
        (statusCode, data) => {
          if (!metadataWaiters[hash]) return;

          if (statusCode === 200) {
            try {
              const torrentData = JSON.parse(data);

              if (hasFileStats(torrentData)) {
                const elapsed = Math.round((Date.now() - entry.startTime) / 1000);
                const count = (torrentData.file_stats || torrentData.FileStats).length;
                logger.info('Torrent metadata loaded', {
                  hash: hash,
                  elapsedSeconds: elapsed,
                  fileCount: count,
                  callbackCount: entry.callbacks.length,
                });
                finishWithFfp();
                return;
              }

              if (entry.attempts >= maxAttempts) {
                const elapsed = Math.round((Date.now() - entry.startTime) / 1000);
                logger.warn('Metadata wait timeout', {
                  hash: hash,
                  elapsedSeconds: elapsed,
                  attempts: entry.attempts,
                });
                const error = new AppError(
                  ERROR_CODES.METADATA_TIMEOUT,
                  'Timeout waiting for torrent metadata',
                  408,
                  { elapsedSeconds: elapsed, attempts: entry.attempts },
                );
                finishAll(408, JSON.stringify(error.toJSON()));
                return;
              }

              scheduleNext();
            } catch (error) {
              logger.error('Error parsing torrent data during metadata wait', {
                hash: hash,
                error: error.message,
              });
              const appError = new AppError(
                ERROR_CODES.JSON_PARSE_ERROR,
                `Error checking torrent: ${error.message}`,
                500,
                { originalError: error.message },
              );
              finishAll(500, JSON.stringify(appError.toJSON()));
            }
          } else if (statusCode === 404) {
            if (entry.attempts >= maxAttempts) {
              logger.warn('Torrent not available after timeout', { hash: hash });
              const error = new AppError(
                ERROR_CODES.TORRENT_NOT_FOUND,
                'Torrent not available',
                404,
              );
              finishAll(404, JSON.stringify(error.toJSON()));
              return;
            }
            scheduleNext();
          } else {
            if (entry.attempts >= maxAttempts) {
              logger.error('Error checking torrent', {
                hash: hash,
                statusCode,
                attempts: entry.attempts,
              });
              try {
                JSON.parse(data);
                finishAll(statusCode, data);
              } catch {
                const error = createErrorFromStatus(statusCode, data, {
                  hash: hash,
                });
                finishAll(statusCode, JSON.stringify(error.toJSON()));
              }
              return;
            }
            scheduleNext();
          }
        },
        true,
      );
    }

    doCheck();
  }

  return {
    makeTorrServerRequest,
    checkTorrentExists,
    addTorrent,
    callFfpApi,
    hasFileStats,
    waitForMetadataThenFfp,
    cleanupMetadataWaiters,
    ping,
    destroy: () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
      for (const [, entry] of Object.entries(metadataWaiters)) {
        if (entry.timeoutId) clearTimeout(entry.timeoutId);
        entry.callbacks.forEach(({ callback: cb }) => {
          try {
            const error = new AppError(ERROR_CODES.SERVICE_SHUTTING_DOWN, undefined, 503);
            cb(503, JSON.stringify(error.toJSON()));
          } catch {
            // ignore errors during shutdown
          }
        });
      }
      Object.keys(metadataWaiters).forEach((key) => { delete metadataWaiters[key]; });
    },
  };
}

module.exports = {
  createTorrServerClient,
};
