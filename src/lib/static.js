const fs = require('fs');
const path = require('path');

const staticCache = Object.create(null);

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/**
 * Serves static files from baseDir with optional caching for listed files.
 * @param {Object} httpRes - HTTP response object
 * @param {string} pathname - Request pathname (e.g. '/' or '/app.js')
 * @param {string} baseDir - Absolute path to static files directory
 * @param {string[]} cacheFiles - Filenames to cache in memory (e.g. ['index.html', 'app.js'])
 */
function serveStatic(httpRes, pathname, baseDir, cacheFiles = []) {
  const normalized =
    pathname === '/' || pathname === ''
      ? 'index.html'
      : path
          .normalize(pathname)
          .replace(/^(\.\.(\/|\\))+/i, '')
          .replace(/^\/+/, '');
  const filePath = path.resolve(baseDir, normalized);
  const relative = path.relative(baseDir, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    httpRes.writeHead(403, { 'Content-Type': 'application/json' });
    httpRes.end(JSON.stringify({ error: 'Forbidden' }));
    return;
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  const cacheKey = cacheFiles.includes(normalized) ? normalized : null;
  if (cacheKey && staticCache[cacheKey]) {
    const cached = staticCache[cacheKey];
    httpRes.writeHead(200, { 'Content-Type': cached.contentType });
    httpRes.end(cached.content, 'utf-8');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        httpRes.writeHead(404, { 'Content-Type': 'text/html' });
        httpRes.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        httpRes.writeHead(500);
        httpRes.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      if (cacheKey) {
        staticCache[cacheKey] = { content, contentType };
      }
      httpRes.writeHead(200, { 'Content-Type': contentType });
      httpRes.end(content, 'utf-8');
    }
  });
}

module.exports = {
  serveStatic,
};
