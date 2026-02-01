/**
 * Handles FFprobe API response and sends appropriate HTTP response.
 * @param {Object} httpRes - HTTP response object
 * @param {number} statusCode - Status code from TorrServer
 * @param {string} data - Response body
 * @param {Object} config - Optional config for logging (metadataMaxAttempts, metadataAttemptDelay)
 */
function handleFFprobeResponse(httpRes, statusCode, data, config = {}) {
  const { metadataMaxAttempts = 60, metadataAttemptDelay = 1000 } = config;

  if (statusCode === 200) {
    try {
      const jsonData = JSON.parse(data);
      console.log(`  ✓ Received ${jsonData.streams?.length || 0} streams`);
      httpRes.writeHead(200, { 'Content-Type': 'application/json' });
      httpRes.end(data);
    } catch (error) {
      console.log(`  ✗ JSON parse error: ${error.message}`);
      httpRes.writeHead(500, { 'Content-Type': 'application/json' });
      httpRes.end(JSON.stringify({ error: 'Failed to parse response' }));
    }
  } else if (statusCode === 401) {
    console.log(`  ✗ Authentication failed`);
    httpRes.writeHead(401, { 'Content-Type': 'application/json' });
    httpRes.end(JSON.stringify({ error: 'Authentication failed. Check server credentials.' }));
  } else if (statusCode === 408) {
    const cfgMaxSec = Math.round((metadataMaxAttempts * metadataAttemptDelay) / 1000);
    console.log(`  ✗ Timeout: Metadata not loaded within ${cfgMaxSec} seconds`);
    httpRes.writeHead(408, { 'Content-Type': 'application/json' });
    httpRes.end(data);
  } else if (statusCode === 504) {
    console.log(`  ✗ TorrServer request timeout`);
    httpRes.writeHead(504, { 'Content-Type': 'application/json' });
    httpRes.end(data);
  } else {
    console.log(`  ✗ HTTP error: ${statusCode}`);
    httpRes.writeHead(statusCode, { 'Content-Type': 'application/json' });
    httpRes.end(data);
  }
}

module.exports = {
  handleFFprobeResponse,
};
