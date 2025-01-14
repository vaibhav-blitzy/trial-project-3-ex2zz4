/**
 * Application Constants
 * Defines core application-wide constants and configurations
 * Version: 1.0.0
 */

import { THEME_MODES } from './theme.constants';

/**
 * Core application configuration
 * Contains essential app metadata and settings
 */
export const APP_CONFIG = {
  name: 'Task Management System',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  defaultTheme: THEME_MODES.SYSTEM
} as const;

/**
 * API request configuration
 * Implements system availability requirements:
 * - 99.9% uptime
 * - < 2 seconds response time for 90% of requests
 */
export const API_CONFIG = {
  timeout: 2000, // 2 seconds max response time
  retryAttempts: 3, // Retry failed requests to maintain uptime
  retryDelay: 1000, // 1 second between retries
  maxConcurrentRequests: 10 // Prevent request flooding
} as const;

/**
 * Pagination configuration
 * Implements UI design specifications for data presentation
 * with consistent spacing and hierarchy
 */
export const PAGINATION_CONFIG = {
  defaultPageSize: 10,
  maxPageSize: 100,
  pageSizeOptions: [10, 25, 50, 100] // Standard page size options
} as const;

/**
 * Rate limiting configuration
 * Implements security controls for API protection
 * using Redis-based rate limiting
 */
export const RATE_LIMIT_CONFIG = {
  standard: 100, // Standard API requests per window
  authenticated: 1000, // Authenticated API requests per window
  windowMs: 60000 // 1 minute window
} as const;

/**
 * Error handling configuration
 * Defines retry and timeout strategies for system resilience
 */
export const ERROR_CONFIG = {
  maxRetries: API_CONFIG.retryAttempts,
  backoffMultiplier: 1.5, // Exponential backoff
  maxBackoffDelay: 5000, // Maximum 5 seconds between retries
  errorCodes: {
    rateLimitExceeded: 429,
    serverError: 500,
    serviceUnavailable: 503
  }
} as const;

/**
 * Cache configuration
 * Defines caching strategies for improved performance
 */
export const CACHE_CONFIG = {
  ttl: 300000, // 5 minutes default TTL
  maxSize: 100, // Maximum cache entries
  staleWhileRevalidate: 60000 // 1 minute stale-while-revalidate window
} as const;

/**
 * Validation configuration
 * Defines input validation rules and constraints
 */
export const VALIDATION_CONFIG = {
  minPasswordLength: 8,
  maxPasswordLength: 128,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  maxTitleLength: 200,
  maxDescriptionLength: 5000
} as const;

/**
 * Analytics configuration
 * Defines tracking and monitoring parameters
 */
export const ANALYTICS_CONFIG = {
  sampleRate: 0.1, // 10% sampling for performance metrics
  errorSampleRate: 1.0, // 100% sampling for errors
  performanceMetrics: {
    longTaskThreshold: 50, // 50ms threshold for long tasks
    interactionTimeout: 5000 // 5 seconds interaction timeout
  }
} as const;