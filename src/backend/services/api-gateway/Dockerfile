# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies with cache mounting
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source code
COPY . .

# Run security audit
RUN npm audit

# Build TypeScript code
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Install tini for proper signal handling
RUN apk add --no-cache tini curl

# Create non-root user/group
RUN addgroup -g 1001 node && \
    adduser -u 1001 -G node -s /bin/sh -D node

# Set working directory
WORKDIR /usr/src/app

# Copy built artifacts and dependencies from builder
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=node:node /usr/src/app/package*.json ./

# Set secure permissions
RUN chmod -R 550 . && \
    chmod -R 770 node_modules

# Create directory for temporary files
RUN mkdir -p /tmp/api-gateway && \
    chown -R node:node /tmp/api-gateway && \
    chmod 770 /tmp/api-gateway

# Environment configuration
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=4096"

# Set resource limits
ENV MEMORY_LIMIT="4Gi" \
    CPU_LIMIT="2"

# Switch to non-root user
USER node

# Expose service port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Set read-only root filesystem
RUN chmod a-w /usr/src/app

# Start application with Tini
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/app.js"]

# Security labels
LABEL org.opencontainers.image.source="https://github.com/task-management/api-gateway" \
      org.opencontainers.image.description="API Gateway service for Task Management System" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.licenses="MIT" \
      security.capabilities.drop="ALL" \
      security.seccomp.profile="default" \
      security.non-root="true" \
      security.no-new-privileges="true" \
      security.readonly-root-filesystem="true"