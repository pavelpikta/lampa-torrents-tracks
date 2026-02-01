# Production-ready image (no external dependencies needed)
FROM node:24-alpine

WORKDIR /app

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application files
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs public/ ./public/
RUN chown -R nodejs:nodejs /app

# Expose HTTP port (used for both API and static files)
EXPOSE 3000

# Environment variables with defaults
ENV NODE_ENV=production
ENV HTTP_PORT=3000
ENV TORRSERVER_URL=http://localhost:8090
ENV TORRSERVER_USERNAME=
ENV TORRSERVER_PASSWORD=
ENV TORRSERVER_METADATA_MAX_ATTEMPTS=60
ENV TORRSERVER_METADATA_ATTEMPT_DELAY=1000
ENV TORRSERVER_REQUEST_TIMEOUT_MS=60000
ENV TORRSERVER_RESPONSE_MAX_BYTES=5242880

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Switch to non-root user
USER nodejs

# Start server
CMD ["node", "src/server-nodejs.js"]
