require('dotenv').config();

const http = require('http');
const config = require('./config');
const { createRequestHandler } = require('./routes');
const { defaultLogger } = require('./lib/logger');

const logger = defaultLogger;

config.printBanner();

const requestHandler = createRequestHandler(config);
const httpServer = http.createServer(requestHandler);

let isShuttingDown = false;
let forceShutdownTimeoutId = null;

httpServer.listen(config.HTTP_PORT, () => {
  logger.info('HTTP/API server started', {
    port: config.HTTP_PORT,
    http: `http://localhost:${config.HTTP_PORT}`,
    apiV1: `http://localhost:${config.HTTP_PORT}/api/v1/tracks`,
    apiV1Auto: `http://localhost:${config.HTTP_PORT}/api/v1/tracks/auto`,
    health: `http://localhost:${config.HTTP_PORT}/health`,
  });
});

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('Shutting down server...', { signal });

  // Force-shutdown guard: fires only if close callback never runs.
  forceShutdownTimeoutId = setTimeout(() => {
    logger.warn('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);

  httpServer.close(() => {
    if (forceShutdownTimeoutId != null) {
      clearTimeout(forceShutdownTimeoutId);
      forceShutdownTimeoutId = null;
    }
    logger.info('HTTP server closed');

    try {
      requestHandler.cleanup();
    } catch (error) {
      logger.error('Error during cleanup', { error: error.message });
    }

    logger.info('Cleanup complete');
    process.exit(0);
  });
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason?.message || String(reason),
  });
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
