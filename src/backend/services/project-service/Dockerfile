# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies including dev dependencies
RUN npm ci

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Production stage
FROM node:18-alpine

# Create non-root user/group
RUN addgroup -g 1001 -S node && \
    adduser -u 1001 -S node -G node

# Set working directory
WORKDIR /usr/src/app

# Set directory permissions
RUN chown -R node:node /usr/src/app && \
    chmod -R 755 /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Configure security options
RUN mkdir -p /tmp && chown -R node:node /tmp && chmod -R 755 /tmp
RUN chmod -R 555 /usr/src/app

# Set up health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

# Drop capabilities and set security options
USER node:node
EXPOSE 3000

# Set read-only root filesystem
RUN chmod 555 /usr/src/app/dist

# Configure entry point and command
ENTRYPOINT ["node"]
CMD ["dist/main"]

# Resource limits (applied at runtime via Docker/Kubernetes)
# CPU: 2
# Memory: 4GB

# Labels
LABEL maintainer="Task Management System Team" \
      version="1.0.0" \
      description="Project management microservice for Task Management System" \
      org.opencontainers.image.source="https://github.com/organization/task-management"