# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies with exact versions and clean npm cache
RUN npm ci && \
    npm cache clean --force

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Add non-root user and group
RUN addgroup -g 1000 taskapp && \
    adduser -u 1000 -G taskapp -s /bin/sh -D taskapp

# Install production dependencies
RUN apk add --no-cache tini

# Copy built artifacts and dependencies from builder
COPY --from=builder --chown=taskapp:taskapp /app/dist ./dist
COPY --from=builder --chown=taskapp:taskapp /app/node_modules ./node_modules
COPY --from=builder --chown=taskapp:taskapp /app/package*.json ./

# Set secure permissions
RUN chmod 644 package*.json && \
    chmod -R 644 dist/* && \
    chmod -R 755 node_modules && \
    chown -R taskapp:taskapp .

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Switch to non-root user
USER taskapp

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Expose service port
EXPOSE 3000

# Set container init process
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/app.js"]

# Add metadata labels
LABEL maintainer="DevOps Team" \
      service="task-service" \
      version="1.0.0"