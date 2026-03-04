const fs = require('fs');
const path = require('path');
const { defaultLogger } = require('./logger');

const logger = defaultLogger;
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
  // Normalize and sanitize pathname
  const normalized =
    pathname === '/' || pathname === ''
      ? 'index.html'
      : pathname
          .replace(/\\/g, '/') // Normalize path separators
          .replace(/^(\.\.(\/))+/, '') // Remove leading ../ sequences
          .replace(/^\/+/, ''); // Remove leading slashes

  // Additional security: prevent directory traversal
  if (normalized.includes('..') || normalized.includes('\0')) {
    logger.warn('Path traversal attempt blocked', { pathname, normalized });
    httpRes.writeHead(403, { 'Content-Type': 'application/json' });
    httpRes.end(JSON.stringify({ error: 'Forbidden', code: 'INVALID_PATH' }));
    return;
  }

  const filePath = path.join(baseDir, normalized);
  const relative = path.relative(baseDir, filePath);

  // Verify file is within base directory
  const isOutside =
    relative.startsWith('..') || path.isAbsolute(relative) || /^[a-zA-Z]:/.test(relative);
  if (isOutside) {
    logger.warn('Path outside base directory blocked', { pathname, normalized, relative });
    httpRes.writeHead(403, { 'Content-Type': 'application/json' });
    httpRes.end(JSON.stringify({ error: 'Forbidden', code: 'INVALID_PATH' }));
    return;
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  const cacheKey = cacheFiles.includes(normalized) ? normalized : null;
  if (cacheKey && staticCache[cacheKey]) {
    const cached = staticCache[cacheKey];
    httpRes.writeHead(200, {
      'Content-Type': cached.contentType,
      'Content-Length': cached.content.length,
    });
    httpRes.end(cached.content);
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        logger.debug('Static file not found', { pathname, filePath: relative });
        httpRes.writeHead(404, { 'Content-Type': 'text/html' });
        httpRes.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        logger.error('Error reading static file', {
          pathname,
          filePath: relative,
          error: error.message,
          code: error.code,
        });
        httpRes.writeHead(500);
        httpRes.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      if (cacheKey) {
        staticCache[cacheKey] = { content, contentType };
        logger.debug('Static file cached', { file: normalized });
      }
      httpRes.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': content.length,
      });
      httpRes.end(content);
    }
  });
}

module.exports = {
  serveStatic,
};
