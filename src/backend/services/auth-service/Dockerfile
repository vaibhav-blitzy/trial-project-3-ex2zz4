# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Install build essentials and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files with appropriate permissions
COPY --chown=node:node package*.json ./
COPY --chown=node:node tsconfig*.json ./

# Install dependencies with security flags
RUN npm ci --audit=true --fund=false --ignore-scripts=false && \
    npm cache clean --force

# Copy source code and config files
COPY --chown=node:node . .

# Build TypeScript code with production optimizations
RUN npm run build && \
    npm prune --production && \
    npm cache clean --force

# Verify build artifacts
RUN test -d dist && \
    test -f dist/main.js

# Stage 2: Production
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Create non-root user and group
RUN addgroup -S nodegroup && \
    adduser -S nodeuser -G nodegroup

# Install production dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Copy built artifacts and dependencies from builder
COPY --from=builder --chown=nodeuser:nodegroup /usr/src/app/dist ./dist
COPY --from=builder --chown=nodeuser:nodegroup /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodegroup /usr/src/app/package*.json ./

# Set secure file permissions
RUN chmod 644 package.json package-lock.json && \
    chmod -R 755 dist node_modules

# Configure security policies
RUN echo "fs.file-max = 1000" >> /etc/sysctl.conf && \
    echo "kernel.pid_max = 50" >> /etc/sysctl.conf

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Set resource limits
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Switch to non-root user
USER nodeuser

# Expose service port
EXPOSE 3001

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start service with security flags
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "--no-deprecation", "--no-warnings", "--max-http-header-size=8192", "dist/main.js"]

# Security labels
LABEL org.opencontainers.image.source="https://github.com/task-management/auth-service" \
      org.opencontainers.image.description="Authentication Service for Task Management System" \
      org.opencontainers.image.vendor="Task Management System" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.licenses="MIT" \
      security.protocol="strict" \
      security.alpine.no-cache="true" \
      security.root.user="false"