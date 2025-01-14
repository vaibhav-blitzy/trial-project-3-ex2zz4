/**
 * @fileoverview Enhanced API Gateway logging middleware with security monitoring,
 * performance tracking, and distributed tracing capabilities.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import Logger, { SecurityEventType, SecuritySeverity } from '../../../shared/utils/logger.util';

// Constants for logging configuration
const EXCLUDED_PATHS: string[] = ['/health', '/metrics', '/ready', '/live'];
const SENSITIVE_HEADERS: string[] = ['authorization', 'cookie', 'x-api-key', 'session-id', 'token'];
const SENSITIVE_QUERY_PARAMS: string[] = ['token', 'key', 'password', 'secret', 'auth'];
const LOG_SAMPLING_RATE = 0.1;
const CIRCUIT_BREAKER_THRESHOLD = 100;

/**
 * Enhanced interface for API Gateway specific log metadata
 */
export interface ApiGatewayLogMetadata {
  correlationId: string;
  traceId: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  service: string;
  rateLimit: {
    remaining: number;
    reset: number;
  };
  authenticated: boolean;
  requestSize: number;
  responseSize: number;
  clientIp: string;
  userAgent: string;
}

/**
 * Utility function to mask sensitive data in logs
 */
function maskSensitiveData(data: any, patterns: string[]): any {
  if (!data) return data;
  
  const masked = JSON.parse(JSON.stringify(data));
  
  patterns.forEach(pattern => {
    if (masked[pattern]) {
      masked[pattern] = '***REDACTED***';
    }
  });

  return masked;
}

/**
 * Enhanced API Gateway logging middleware
 */
export default function apiGatewayLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip logging for excluded paths
  if (EXCLUDED_PATHS.includes(req.path)) {
    return next();
  }

  // Generate correlation and trace IDs
  const correlationId = uuidv4();
  const traceId = uuidv4();
  const startTime = process.hrtime();

  // Add tracing headers
  req.headers['x-correlation-id'] = correlationId;
  req.headers['x-trace-id'] = traceId;

  // Capture original end method
  const originalEnd = res.end;
  let responseBody = '';

  // Override end method to capture response data
  res.end = function(chunk: any, ...args: any[]): any {
    if (chunk) {
      responseBody = chunk;
    }
    
    // Calculate request duration
    const duration = process.hrtime(startTime);
    const durationMs = (duration[0] * 1000) + (duration[1] / 1000000);

    // Prepare log metadata
    const metadata: ApiGatewayLogMetadata = {
      correlationId,
      traceId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: durationMs,
      service: req.headers['x-target-service'] as string || 'unknown',
      rateLimit: {
        remaining: parseInt(res.getHeader('x-ratelimit-remaining') as string || '0'),
        reset: parseInt(res.getHeader('x-ratelimit-reset') as string || '0')
      },
      authenticated: !!req.headers.authorization,
      requestSize: parseInt(req.headers['content-length'] as string || '0'),
      responseSize: Buffer.byteLength(responseBody),
      clientIp: req.ip,
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    // Log request completion with security context
    const logger = Logger.getInstance('api-gateway', {
      enableConsole: true,
      enableFile: true
    });

    // Implement log sampling for high-traffic paths
    if (Math.random() < LOG_SAMPLING_RATE) {
      // Log HTTP request details
      logger.http(`API Gateway Request Complete: ${req.method} ${req.path}`, {
        ...metadata,
        headers: maskSensitiveData(req.headers, SENSITIVE_HEADERS),
        query: maskSensitiveData(req.query, SENSITIVE_QUERY_PARAMS)
      });

      // Log security events if applicable
      if (res.statusCode === 401 || res.statusCode === 403) {
        logger.security('API Gateway Security Event', {
          eventType: SecurityEventType.ACCESS_DENIED,
          severity: SecuritySeverity.MEDIUM,
          ...metadata,
          resourceType: 'api',
          resourceId: req.path,
          action: req.method,
          outcome: 'denied'
        });
      }

      // Log performance metrics
      if (durationMs > 1000) {
        logger.performance('API Gateway Slow Request', {
          ...metadata,
          threshold: 1000
        });
      }
    }

    // Call original end method
    return originalEnd.call(res, chunk, ...args);
  };

  // Initial request logging
  const logger = Logger.getInstance('api-gateway', {
    enableConsole: true,
    enableFile: true
  });

  logger.info(`API Gateway Request Started: ${req.method} ${req.path}`, {
    correlationId,
    traceId,
    method: req.method,
    path: req.path,
    query: maskSensitiveData(req.query, SENSITIVE_QUERY_PARAMS),
    headers: maskSensitiveData(req.headers, SENSITIVE_HEADERS)
  });

  next();
}