function sendJsonError(httpRes, statusCode, message, extra = {}) {
  httpRes.writeHead(statusCode, { 'Content-Type': 'application/json' });
  httpRes.end(JSON.stringify({ error: message, ...extra }));
}

module.exports = {
  sendJsonError,
};
