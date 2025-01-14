/**
 * @fileoverview Express middleware for standardized HTTP request/response logging
 * with request tracing, performance monitoring, and ELK Stack integration.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import Logger from '../utils/logger.util';

/**
 * Interface for comprehensive HTTP request log metadata
 */
export interface RequestLogMetadata {
  correlationId: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userAgent: string;
  ip: string;
  timestamp: Date;
  samplingRate: number;
}

// Paths excluded from logging to reduce noise
const EXCLUDED_PATHS = ['/health', '/metrics', '/readiness', '/liveness'];

// Headers that should be masked for security
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'session-id'];

// Sampling rates for high-traffic endpoints
const SAMPLING_RATES: Record<string, number> = {
  '/api/v1/events': 0.1,
  '/api/v1/metrics': 0.5
};

// Constants for log batching
const LOG_BATCH_SIZE = 100;
const LOG_FLUSH_INTERVAL = 1000;

// Initialize logger instance
const logger = Logger.getInstance('http-middleware', {
  enableConsole: true,
  enableFile: true,
  enableElk: true
});

/**
 * Masks sensitive data in headers and query parameters
 */
function maskSensitiveData(obj: Record<string, any>): Record<string, any> {
  const masked = { ...obj };
  for (const key in masked) {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      masked[key] = '***REDACTED***';
    }
  }
  return masked;
}

/**
 * Determines if request should be sampled based on endpoint
 */
function shouldSampleRequest(path: string): boolean {
  const samplingRate = SAMPLING_RATES[path] || 1;
  return Math.random() <= samplingRate;
}

/**
 * Express middleware that implements secure, performant HTTP request and response logging
 */
export default function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip excluded paths
  if (EXCLUDED_PATHS.includes(req.path)) {
    return next();
  }

  // Generate correlation ID for request tracing
  const correlationId = uuidv4();
  req.headers['x-correlation-id'] = correlationId;

  // Record request start time with high precision
  const startTime = process.hrtime();

  // Check sampling rate for this endpoint
  const shouldSample = shouldSampleRequest(req.path);

  // Prepare initial log metadata
  const baseMetadata: Partial<RequestLogMetadata> = {
    correlationId,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'] || 'unknown',
    ip: req.ip,
    timestamp: new Date(),
    samplingRate: SAMPLING_RATES[req.path] || 1
  };

  // Capture original response end method
  const originalEnd = res.end;
  let endCalled = false;

  // Override response end to capture final status and duration
  res.end = function(chunk?: any, encoding?: string, callback?: () => void): Response {
    if (endCalled) {
      return originalEnd.call(this, chunk, encoding, callback);
    }
    endCalled = true;

    // Calculate request duration
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000;

    // Prepare final log metadata
    const logMetadata: RequestLogMetadata = {
      ...baseMetadata as RequestLogMetadata,
      statusCode: res.statusCode,
      duration
    };

    // Log request completion if sampled
    if (shouldSample) {
      logger.http('Request completed', {
        ...logMetadata,
        headers: maskSensitiveData(req.headers),
        query: maskSensitiveData(req.query)
      });
    }

    // Log errors with full detail
    if (res.statusCode >= 400) {
      logger.error('Request error', {
        ...logMetadata,
        error: res.locals.error
      });
    }

    // Restore original end behavior
    return originalEnd.call(this, chunk, encoding, callback);
  };

  // Log initial request if sampled
  if (shouldSample) {
    logger.http('Request started', {
      ...baseMetadata,
      headers: maskSensitiveData(req.headers),
      query: maskSensitiveData(req.query)
    });
  }

  next();
}