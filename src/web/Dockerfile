# Build stage
FROM node:18-alpine AS builder
# node:18-alpine v18.17.1

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine
# nginx:alpine v1.24.0

# Create nginx user and group with limited privileges
RUN addgroup -g 101 -S nginx \
    && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx

# Create necessary directories with proper permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx \
    && chown -R nginx:nginx /var/cache/nginx /var/log/nginx

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY security-headers.conf /etc/nginx/security-headers.conf

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html \
    && chown -R nginx:nginx /etc/nginx/nginx.conf \
    && chown -R nginx:nginx /etc/nginx/security-headers.conf

# Configure resource limits
RUN ulimit -n 1000 && \
    ulimit -u 50

# Remove default nginx configuration and unused files
RUN rm -rf /etc/nginx/conf.d/* \
    && rm -rf /usr/share/nginx/html/index.html

# Set environment variables
ENV NGINX_PORT=80
ENV NGINX_USER=nginx

# Set resource limits in container
LABEL com.docker.container.cpu="1"
LABEL com.docker.container.memory="2g"

# Expose port
EXPOSE 80

# Switch to non-root user
USER nginx

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1