/**
 * @fileoverview Global error handling middleware for standardized error processing
 * across all microservices with enhanced security and monitoring features.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { getId as getCorrelationId } from 'correlation-id'; // v1.0.0
import { ErrorCodes, getErrorMessage, getErrorCategory } from '../constants/error-codes';
import { HttpStatusCodes, StatusMessages } from '../constants/status-codes';
import Logger from '../utils/logger.util';

/**
 * Error severity levels for logging and monitoring
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Enhanced custom error interface with additional context
 */
export interface AppError extends Error {
  code: ErrorCodes;
  statusCode: HttpStatusCodes;
  details?: Record<string, any>;
  correlationId?: string;
  severity: ErrorSeverity;
}

/**
 * Standardized error response structure
 */
interface ErrorResponse {
  code: number;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  correlationId: string;
  path: string;
}

/**
 * Security headers for error responses
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'",
  'Cache-Control': 'no-store'
};

/**
 * Sensitive data patterns to be sanitized from error details
 */
const SENSITIVE_PATTERNS = {
  password: /password/i,
  token: /token/i,
  key: /key/i,
  secret: /secret/i,
  credential: /credential/i
};

/**
 * Initialize logger instance
 */
const logger = Logger.getInstance('ErrorHandler', {
  enableConsole: true,
  enableFile: true,
  enableElk: true
});

/**
 * Maps error codes to HTTP status codes
 */
const statusCodeMap = new Map<ErrorCodes, HttpStatusCodes>([
  [ErrorCodes.INVALID_CREDENTIALS, HttpStatusCodes.UNAUTHORIZED],
  [ErrorCodes.TOKEN_EXPIRED, HttpStatusCodes.UNAUTHORIZED],
  [ErrorCodes.INSUFFICIENT_PERMISSIONS, HttpStatusCodes.FORBIDDEN],
  [ErrorCodes.RESOURCE_ACCESS_DENIED, HttpStatusCodes.FORBIDDEN],
  [ErrorCodes.INVALID_INPUT_FORMAT, HttpStatusCodes.BAD_REQUEST],
  [ErrorCodes.REQUIRED_FIELD_MISSING, HttpStatusCodes.BAD_REQUEST],
  [ErrorCodes.TASK_ALREADY_COMPLETED, HttpStatusCodes.CONFLICT],
  [ErrorCodes.PROJECT_ALREADY_ARCHIVED, HttpStatusCodes.CONFLICT],
  [ErrorCodes.DATABASE_CONNECTION_ERROR, HttpStatusCodes.SERVICE_UNAVAILABLE],
  [ErrorCodes.CACHE_SERVICE_ERROR, HttpStatusCodes.SERVICE_UNAVAILABLE],
  [ErrorCodes.EXTERNAL_SERVICE_TIMEOUT, HttpStatusCodes.SERVICE_UNAVAILABLE]
]);

/**
 * Determines error severity based on error category and status code
 */
function determineErrorSeverity(error: AppError): ErrorSeverity {
  const category = getErrorCategory(error.code);
  const statusCode = error.statusCode;

  if (statusCode >= 500) return ErrorSeverity.CRITICAL;
  if (category === 'authentication' || category === 'authorization') return ErrorSeverity.HIGH;
  if (category === 'validation') return ErrorSeverity.LOW;
  return ErrorSeverity.MEDIUM;
}

/**
 * Sanitizes error details to remove sensitive information
 */
function sanitizeErrorDetails(details: Record<string, any>): Record<string, any> {
  const sanitized = { ...details };
  
  const sanitizeValue = (obj: any): any => {
    if (!obj) return obj;
    
    if (typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (SENSITIVE_PATTERNS.password.test(key) ||
            SENSITIVE_PATTERNS.token.test(key) ||
            SENSITIVE_PATTERNS.key.test(key) ||
            SENSITIVE_PATTERNS.secret.test(key) ||
            SENSITIVE_PATTERNS.credential.test(key)) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          obj[key] = sanitizeValue(obj[key]);
        }
      });
    }
    return obj;
  };

  return sanitizeValue(sanitized);
}

/**
 * Global error handling middleware
 */
export default function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract correlation ID or generate new one
  const correlationId = getCorrelationId() || req.headers['x-correlation-id'] as string || 'unknown';

  // Convert standard Error to AppError if needed
  const appError = error as AppError;
  if (!appError.code) {
    appError.code = ErrorCodes.SYSTEM_ERROR;
    appError.statusCode = HttpStatusCodes.INTERNAL_SERVER_ERROR;
    appError.severity = ErrorSeverity.CRITICAL;
  }

  // Determine final status code and severity
  const statusCode = statusCodeMap.get(appError.code) || HttpStatusCodes.INTERNAL_SERVER_ERROR;
  const severity = appError.severity || determineErrorSeverity(appError);

  // Sanitize error details
  const sanitizedDetails = appError.details ? sanitizeErrorDetails(appError.details) : undefined;

  // Construct error response
  const errorResponse: ErrorResponse = {
    code: appError.code,
    message: getErrorMessage(appError.code),
    details: sanitizedDetails,
    timestamp: new Date().toISOString(),
    correlationId,
    path: req.path
  };

  // Log error with context
  logger.error('Request error occurred', {
    error: appError,
    correlationId,
    severity,
    path: req.path,
    method: req.method,
    statusCode,
    userId: req.user?.id,
    requestId: req.id
  });

  // Set security headers
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value);
  });

  // Send error response
  res.status(statusCode)
     .setHeader('X-Correlation-ID', correlationId)
     .json(errorResponse);
}

/**
 * Error handler wrapper for async route handlers
 */
export const asyncErrorHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};