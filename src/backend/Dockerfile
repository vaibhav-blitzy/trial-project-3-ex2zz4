# Stage 1: Builder
FROM node:18-alpine AS builder

# Install build essentials
RUN apk add --no-cache python3 make g++ 

# Set working directory
WORKDIR /app

# Copy package files for workspace
COPY package*.json ./
COPY lerna.json ./
COPY services/*/package*.json ./services/
COPY shared/package*.json ./shared/

# Install all dependencies including dev dependencies
RUN npm ci

# Copy source code and configs
COPY tsconfig.json ./
COPY services/ ./services/
COPY shared/ ./shared/

# Build TypeScript code
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Remove source maps and build artifacts
RUN find . -name "*.map" -type f -delete

# Stage 2: Production
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 nodeapp && \
    adduser -u 1001 -G nodeapp -s /bin/sh -D nodeapp

# Set working directory
WORKDIR /app

# Copy built artifacts and dependencies from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Set production environment
ENV NODE_ENV=production \
    PORT=3000 \
    METRICS_PORT=9090 \
    NODE_OPTIONS="--max-old-space-size=2048" \
    TZ=UTC

# Configure security policies
RUN apk add --no-cache curl && \
    chmod -R 550 /app/dist && \
    chmod -R 550 /app/node_modules && \
    mkdir -p /tmp && \
    chown -R nodeapp:nodeapp /app /tmp

# Expose service ports
EXPOSE 3000 3001 3002 3003 3004 9090

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER nodeapp

# Start the application with clustering
CMD ["node", "--require", "./dist/shared/tracing.js", "./dist/services/api-gateway/main.js"]