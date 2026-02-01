const http = require('http');
const https = require('https');

/**
 * Creates a TorrServer API client with the given options.
 * @param {Object} options - { url, username, password, requestTimeoutMs, responseMaxBytes, metadataMaxAttempts, metadataAttemptDelay }
 * @returns {Object} - { makeTorrServerRequest, checkTorrentExists, addTorrent, callFfpApi, hasFileStats, waitForMetadataThenFfp }
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

  function makeTorrServerRequest(method, path, body, callback, silent = false) {
    const url = `${TORRSERVER_URL}${path}`;
    if (!silent) {
      console.log(`  [${method}] ${path}`);
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
          once(413, JSON.stringify({ error: 'TorrServer response too large' }));
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
      once(500, JSON.stringify({ error: `Failed to fetch data: ${error.message}` }));
    });

    timeoutId =
      TORRSERVER_REQUEST_TIMEOUT_MS > 0
        ? setTimeout(() => {
            httpReq.destroy();
            once(504, JSON.stringify({ error: 'TorrServer request timeout' }));
          }, TORRSERVER_REQUEST_TIMEOUT_MS)
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
      {
        action: 'get',
        hash: hash,
      },
      (statusCode, data) => {
        if (statusCode === 200) {
          try {
            const torrentData = JSON.parse(data);
            callback(true, torrentData);
          } catch (error) {
            console.log(`  ✗ Error parsing torrent data: ${error.message}`);
            callback(false, null);
          }
        } else {
          callback(false, null);
        }
      },
      true,
    );
  }

  function addTorrent(hash, title, callback) {
    console.log(`  Adding torrent with hash: ${hash}`);

    makeTorrServerRequest(
      'POST',
      '/torrents',
      {
        action: 'add',
        link: hash,
        title: title || '',
        save_to_db: false,
      },
      (statusCode, data) => {
        if (statusCode === 200) {
          try {
            const result = JSON.parse(data);
            console.log(`  ✓ Torrent added successfully`);
            callback(true, result);
          } catch (error) {
            console.log(`  ✗ Error parsing add torrent response: ${error.message}`);
            callback(false, null);
          }
        } else {
          console.log(`  ✗ Error adding torrent: HTTP ${statusCode}`);
          callback(false, null);
        }
      },
    );
  }

  function callFfpApi(hash, index, callback) {
    makeTorrServerRequest('GET', `/ffp/${hash}/${index}`, null, callback);
  }

  function hasFileStats(torrentData) {
    const stats = torrentData && (torrentData.file_stats || torrentData.FileStats);
    return Array.isArray(stats) && stats.length > 0;
  }

  const metadataWaiters = Object.create(null);

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
      intervalId: null,
      maxAttempts,
      attemptDelay,
      startTime: Date.now(),
    };
    metadataWaiters[hash] = entry;

    function finishAll(statusCode, data) {
      const list = metadataWaiters[hash];
      if (!list) return;
      delete metadataWaiters[hash];
      if (list.intervalId) clearInterval(list.intervalId);
      list.callbacks.forEach(({ callback: cb }) => cb(statusCode, data));
    }

    function doCheck() {
      entry.attempts++;

      makeTorrServerRequest(
        'POST',
        '/torrents',
        {
          action: 'get',
          hash: hash,
        },
        (statusCode, data) => {
          if (!metadataWaiters[hash]) return;

          if (statusCode === 200) {
            try {
              const torrentData = JSON.parse(data);
              if (hasFileStats(torrentData)) {
                const elapsed = Math.round((Date.now() - entry.startTime) / 1000);
                const count = (torrentData.file_stats || torrentData.FileStats).length;
                console.log(
                  `  ✓ Torrent metadata loaded (${elapsed}s), ${count} files. Calling /ffp for ${entry.callbacks.length} request(s)`,
                );
                entry.callbacks.forEach(({ index: idx, callback: cb }) => {
                  setTimeout(() => callFfpApi(hash, idx, cb), 500);
                });
                delete metadataWaiters[hash];
                if (entry.intervalId) clearInterval(entry.intervalId);
                return;
              }

              if (entry.attempts >= maxAttempts) {
                console.log(
                  `  ✗ Timeout: Torrent metadata not loaded after ${Math.round((Date.now() - entry.startTime) / 1000)}s`,
                );
                finishAll(408, JSON.stringify({ error: 'Timeout waiting for torrent metadata' }));
                return;
              }
            } catch (error) {
              console.log(`  ✗ Error parsing torrent data: ${error.message}`);
              finishAll(500, JSON.stringify({ error: `Error checking torrent: ${error.message}` }));
            }
          } else if (statusCode === 404) {
            if (entry.attempts >= maxAttempts) {
              console.log(`  ✗ Torrent not available after timeout`);
              finishAll(404, JSON.stringify({ error: 'Torrent not available' }));
            }
          } else {
            if (entry.attempts >= maxAttempts) {
              console.log(`  ✗ Error checking torrent: HTTP ${statusCode}`);
              finishAll(statusCode, data);
            }
          }
        },
        true,
      );
    }

    doCheck();
    if (maxAttempts > 1) {
      entry.intervalId = setInterval(doCheck, attemptDelay);
    }
  }

  return {
    makeTorrServerRequest,
    checkTorrentExists,
    addTorrent,
    callFfpApi,
    hasFileStats,
    waitForMetadataThenFfp,
  };
}

module.exports = {
  createTorrServerClient,
};
