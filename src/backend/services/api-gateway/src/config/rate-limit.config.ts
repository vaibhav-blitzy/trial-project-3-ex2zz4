/**
 * @fileoverview Enterprise-grade rate limiting configuration for API Gateway
 * Implements request throttling with Redis-based storage, monitoring, and security features
 * @version 1.0.0
 */

import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.x
import { RedisConnection } from '../../../shared/utils/redis.util';
import { Logger } from 'winston'; // v3.x
import { ErrorCodes } from '../../../shared/constants/error-codes';

/**
 * Interface defining rate limit configuration structure
 */
export interface IRateLimitConfig {
  points: number;              // Maximum number of requests allowed within duration
  duration: number;            // Time window in seconds for rate limiting
  blockDuration: number;       // Duration in seconds to block after limit exceeded
  bypassTokens?: string[];    // List of tokens that can bypass rate limiting
  customLimits?: Map<string, IRateLimitConfig>; // Custom limits for specific users or IPs
}

/**
 * Redis key prefixes for rate limiting
 */
export const RATE_LIMIT_PREFIX = 'tms:ratelimit:';
export const RATE_LIMIT_METRICS_PREFIX = 'tms:metrics:ratelimit:';

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMIT: IRateLimitConfig = {
  points: 100,
  duration: 60,
  blockDuration: 300,
  bypassTokens: [],
  customLimits: new Map()
};

/**
 * Endpoint-specific rate limit configurations
 */
export const ENDPOINT_RATE_LIMITS: Record<string, IRateLimitConfig> = {
  '/auth/*': {
    points: 100,
    duration: 60,
    blockDuration: 300
  },
  '/tasks/*': {
    points: 1000,
    duration: 60,
    blockDuration: 300
  },
  '/projects/*': {
    points: 500,
    duration: 60,
    blockDuration: 300
  },
  '/users/*': {
    points: 300,
    duration: 60,
    blockDuration: 300
  },
  '/files/*': {
    points: 200,
    duration: 60,
    blockDuration: 300
  }
};

/**
 * Creates a rate limiter instance for a specific endpoint with enhanced features
 * @param config - Rate limit configuration
 * @param keyPrefix - Redis key prefix for the rate limiter
 * @param clientId - Unique identifier for the client (IP or user ID)
 * @returns Configured rate limiter instance
 */
export async function createRateLimiter(
  config: IRateLimitConfig,
  keyPrefix: string,
  clientId: string
): Promise<RateLimiterRedis> {
  const redis = RedisConnection.getInstance({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: 0,
    keyPrefix: RATE_LIMIT_PREFIX,
    cluster: false,
    maxRetriesPerRequest: 3,
    piiEnabled: false,
    compressionThreshold: 1024
  });

  // Check for bypass tokens
  if (config.bypassTokens?.includes(clientId)) {
    config.points = Number.MAX_SAFE_INTEGER;
  }

  // Apply custom limits if available
  const customLimit = config.customLimits?.get(clientId);
  if (customLimit) {
    config = { ...config, ...customLimit };
  }

  const rateLimiter = new RateLimiterRedis({
    storeClient: redis.client,
    keyPrefix: `${RATE_LIMIT_PREFIX}${keyPrefix}`,
    points: config.points,
    duration: config.duration,
    blockDuration: config.blockDuration,
    insuranceLimiter: new RateLimiterRedis({
      storeClient: redis.client,
      keyPrefix: `${RATE_LIMIT_PREFIX}insurance:${keyPrefix}`,
      points: Math.ceil(config.points * 0.5),
      duration: config.duration
    })
  });

  // Initialize metrics collection
  await redis.set(
    `${RATE_LIMIT_METRICS_PREFIX}${keyPrefix}:config`,
    JSON.stringify(config),
    { ttl: 86400 }
  );

  return rateLimiter;
}

/**
 * Retrieves rate limit configuration for a specific endpoint with dynamic updates
 * @param endpoint - API endpoint path
 * @param clientId - Unique identifier for the client
 * @returns Rate limit configuration for the endpoint
 */
export async function getRateLimitByEndpoint(
  endpoint: string,
  clientId: string
): Promise<IRateLimitConfig> {
  const redis = RedisConnection.getInstance({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: 0,
    keyPrefix: RATE_LIMIT_PREFIX,
    cluster: false,
    maxRetriesPerRequest: 3,
    piiEnabled: false,
    compressionThreshold: 1024
  });

  // Check for dynamic rate limit updates in Redis
  const dynamicConfig = await redis.get<IRateLimitConfig>(
    `${RATE_LIMIT_PREFIX}dynamic:${endpoint}`
  );

  if (dynamicConfig) {
    return dynamicConfig;
  }

  // Find matching endpoint pattern
  const matchingPattern = Object.keys(ENDPOINT_RATE_LIMITS).find(pattern => {
    const regexPattern = pattern.replace('*', '.*');
    return new RegExp(regexPattern).test(endpoint);
  });

  const baseConfig = matchingPattern
    ? ENDPOINT_RATE_LIMITS[matchingPattern]
    : DEFAULT_RATE_LIMIT;

  // Check for custom client limits
  const customConfig = baseConfig.customLimits?.get(clientId);

  return {
    ...baseConfig,
    ...customConfig
  };
}

export default {
  createRateLimiter,
  getRateLimitByEndpoint,
  ENDPOINT_RATE_LIMITS
};