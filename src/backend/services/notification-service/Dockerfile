# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3003 \
    NODE_OPTIONS="--max-old-space-size=2048"

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 nodeapp && \
    adduser -u 1001 -G nodeapp -s /bin/sh -D nodeapp

# Set correct permissions
RUN chown -R nodeapp:nodeapp /usr/src/app && \
    chmod -R 755 /usr/src/app

# Switch to non-root user
USER nodeapp

# Expose notification service port
EXPOSE 3003

# Set resource limits
RUN echo "ulimit -n 65535" >> ~/.profile && \
    echo "vm.max_map_count=262144" >> /etc/sysctl.conf

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health || exit 1

# Start notification service
CMD ["node", "dist/app.js"]