require('dotenv').config();

const http = require('http');
const config = require('./config');
const { createRequestHandler } = require('./routes');

config.printBanner();

const requestHandler = createRequestHandler(config);
const httpServer = http.createServer(requestHandler);

httpServer.listen(config.HTTP_PORT, () => {
  console.log(`✓ HTTP/API server is running on port ${config.HTTP_PORT}`);
  console.log(`  HTTP: http://localhost:${config.HTTP_PORT}`);
  console.log(`  API:  http://localhost:${config.HTTP_PORT}/api/ffprobe?hash={hash}&index={index}`);
  console.log(
    `  API:  http://localhost:${config.HTTP_PORT}/api/ffprobe-auto?hash={hash}&index={index}`,
  );
  console.log(`  Health: http://localhost:${config.HTTP_PORT}/health`);
  console.log('');
  console.log('Ready to accept requests!');
  console.log('');
});

function shutdown() {
  console.log('\nShutting down server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
