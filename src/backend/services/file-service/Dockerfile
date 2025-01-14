# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies for build
RUN npm ci

# Copy source code and config files
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install production dependencies
RUN apk add --no-cache curl tini

# Create non-root user and group
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Create necessary directories with proper permissions
RUN mkdir -p /app/uploads /app/logs && \
    chown -R appuser:appgroup /app

# Copy built artifacts and dependencies from builder
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package*.json ./

# Set secure file permissions
RUN chmod -R 550 /app && \
    chmod -R 770 /app/uploads /app/logs

# Set environment variables
ENV NODE_ENV=production \
    PORT=3003 \
    AWS_REGION=us-east-1 \
    S3_BUCKET=task-attachments

# Expose service port
EXPOSE 3003

# Set resource limits
LABEL com.docker.resource.cpu="1" \
      com.docker.resource.memory="2Gi"

# Switch to non-root user
USER appuser

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Use tini as init process
ENTRYPOINT ["/sbin/tini", "--"]

# Set the startup command
CMD ["node", "dist/main"]