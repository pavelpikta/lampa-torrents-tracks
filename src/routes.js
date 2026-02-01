const path = require('path');
const validation = require('./lib/validation');
const httpUtils = require('./lib/http-utils');
const { createTorrServerClient } = require('./lib/torrserver');
const staticServer = require('./lib/static');
const ffprobeHandler = require('./handlers/ffprobe');

/**
 * Creates the main HTTP request handler with CORS, routing, and static serving.
 * @param {Object} config - App config (from config.js)
 * @returns {function(req, res)} Request handler
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
  } = config;

  const torrserver = createTorrServerClient({
    url: TORRSERVER_URL,
    username: TORRSERVER_USERNAME,
    password: TORRSERVER_PASSWORD,
    requestTimeoutMs: TORRSERVER_REQUEST_TIMEOUT_MS,
    responseMaxBytes: TORRSERVER_RESPONSE_MAX_BYTES,
    metadataMaxAttempts: TORRSERVER_METADATA_MAX_ATTEMPTS,
    metadataAttemptDelay: TORRSERVER_METADATA_ATTEMPT_DELAY,
  });

  const baseDir = path.join(__dirname, '..', 'public');
  const ffprobeConfig = {
    metadataMaxAttempts: TORRSERVER_METADATA_MAX_ATTEMPTS,
    metadataAttemptDelay: TORRSERVER_METADATA_ATTEMPT_DELAY,
  };

  return function requestHandler(req, httpRes) {
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
    } catch {
      httpRes.writeHead(400, { 'Content-Type': 'application/json' });
      httpRes.end(JSON.stringify({ error: 'Bad request URL' }));
      return;
    }
    const pathname = reqUrl.pathname;

    if (pathname === '/health') {
      httpRes.writeHead(200, { 'Content-Type': 'application/json' });
      httpRes.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }

    if (pathname === '/api/ffprobe' && req.method === 'GET') {
      const queryParams = reqUrl.searchParams;
      let hash = queryParams.get('hash') || '';
      const indexRaw = queryParams.get('index') || '1';

      const index = validation.validateIndex(indexRaw);
      if (index === null) {
        httpUtils.sendJsonError(httpRes, 400, 'Invalid index: must be a non-negative integer');
        return;
      }

      console.log(
        `[${new Date().toISOString()}] FFprobe (direct): ${hash.substring(0, 8)}... (index: ${index})`,
      );

      hash = validation.extractHashFromMagnet(hash);

      if (!hash) {
        httpUtils.sendJsonError(httpRes, 400, 'Hash is required or invalid magnet link');
        return;
      }

      torrserver.callFfpApi(hash, index, (statusCode, data) => {
        ffprobeHandler.handleFFprobeResponse(httpRes, statusCode, data, ffprobeConfig);
      });
      return;
    }

    if (pathname === '/api/ffprobe-auto' && req.method === 'GET') {
      const queryParams = reqUrl.searchParams;
      let hash = queryParams.get('hash') || '';
      const indexRaw = queryParams.get('index') || '1';
      const title = queryParams.get('title') || '';

      const index = validation.validateIndex(indexRaw);
      if (index === null) {
        httpUtils.sendJsonError(httpRes, 400, 'Invalid index: must be a non-negative integer');
        return;
      }

      console.log(
        `[${new Date().toISOString()}] FFprobe-auto: ${hash.substring(0, 8)}... (index: ${index})`,
      );

      hash = validation.extractHashFromMagnet(hash);

      if (!hash) {
        httpUtils.sendJsonError(httpRes, 400, 'Hash is required or invalid magnet link');
        return;
      }

      torrserver.checkTorrentExists(hash, (exists) => {
        if (exists) {
          console.log(`  Torrent found. Calling /ffp`);
          torrserver.callFfpApi(hash, index, (statusCode, data) => {
            ffprobeHandler.handleFFprobeResponse(httpRes, statusCode, data, ffprobeConfig);
          });
          return;
        }

        torrserver.addTorrent(hash, title, (success, result) => {
          if (!success) {
            console.log(`  ✗ Failed to add torrent`);
            httpUtils.sendJsonError(httpRes, 400, 'Failed to add torrent to TorrServer', {
              hash,
              details: 'Check if hash is valid and TorrServer is accessible',
            });
            return;
          }

          if (torrserver.hasFileStats(result)) {
            console.log(`  Torrent added, metadata ready. Calling /ffp`);
            torrserver.callFfpApi(hash, index, (statusCode, data) => {
              ffprobeHandler.handleFFprobeResponse(httpRes, statusCode, data, ffprobeConfig);
            });
            return;
          }

          const maxWaitSec = Math.round(
            (TORRSERVER_METADATA_MAX_ATTEMPTS * TORRSERVER_METADATA_ATTEMPT_DELAY) / 1000,
          );
          console.log(`  ⏳ Waiting for metadata (max ${maxWaitSec}s), then calling /ffp`);
          torrserver.waitForMetadataThenFfp(hash, index, (statusCode, data) => {
            ffprobeHandler.handleFFprobeResponse(httpRes, statusCode, data, ffprobeConfig);
          });
        });
      });
      return;
    }

    staticServer.serveStatic(httpRes, pathname, baseDir, STATIC_CACHE_FILES);
  };
}

module.exports = {
  createRequestHandler,
};
