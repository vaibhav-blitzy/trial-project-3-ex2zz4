/**
 * @fileoverview Enhanced error handling middleware for API Gateway service with security monitoring
 * and performance tracking capabilities.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { HttpStatusCodes } from '../../../shared/constants/status-codes';
import { Logger, SecurityEventType, SecuritySeverity } from '../../../shared/utils/logger.util';

/**
 * Interface for enhanced API error response
 */
interface ApiError {
  code: number;
  message: string;
  details?: any;
  timestamp: Date;
  path: string;
  correlationId: string;
  requestId: string;
  errorType: string;
}

// Initialize logger instance
const logger = Logger.getInstance('api-gateway', {
  enableConsole: true,
  enableFile: true,
  enableElk: true
});

/**
 * Sensitive data patterns for masking in error responses
 */
const SENSITIVE_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g
};

/**
 * Masks sensitive information in error details
 * @param details Error details object to mask
 * @returns Masked error details
 */
const maskSensitiveData = (details: any): any => {
  if (!details) return details;
  const detailsStr = JSON.stringify(details);
  let maskedStr = detailsStr;
  
  Object.entries(SENSITIVE_PATTERNS).forEach(([_, pattern]) => {
    maskedStr = maskedStr.replace(pattern, '***REDACTED***');
  });
  
  return JSON.parse(maskedStr);
};

/**
 * Maps internal error codes to HTTP status codes
 * @param errorCode Internal error code
 * @returns Corresponding HTTP status code
 */
const mapErrorToStatusCode = (errorCode: number): number => {
  if (errorCode >= 1000 && errorCode < 2000) {
    return HttpStatusCodes.UNAUTHORIZED;
  } else if (errorCode >= 2000 && errorCode < 3000) {
    return HttpStatusCodes.FORBIDDEN;
  } else if (errorCode >= 3000 && errorCode < 4000) {
    return HttpStatusCodes.BAD_REQUEST;
  } else if (errorCode >= 4000 && errorCode < 5000) {
    return HttpStatusCodes.CONFLICT;
  } else if (errorCode >= 5000 && errorCode < 6000) {
    return HttpStatusCodes.INTERNAL_SERVER_ERROR;
  } else if (errorCode >= 6000 && errorCode < 7000) {
    return HttpStatusCodes.SERVICE_UNAVAILABLE;
  }
  return HttpStatusCodes.INTERNAL_SERVER_ERROR;
};

/**
 * Enhanced error handling middleware
 */
const errorHandler = async (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();

  try {
    // Determine error code and type
    const errorCode = error.code || ErrorCodes.SYSTEM_ERROR;
    const httpStatus = mapErrorToStatusCode(errorCode);
    const errorType = Object.keys(ErrorCodes)[Object.values(ErrorCodes).indexOf(errorCode)];

    // Mask sensitive data in error details
    const maskedDetails = maskSensitiveData(error.details);

    // Prepare enhanced error response
    const apiError: ApiError = {
      code: errorCode,
      message: error.message || 'An unexpected error occurred',
      details: maskedDetails,
      timestamp: new Date(),
      path: req.path,
      correlationId,
      requestId,
      errorType
    };

    // Log error with security context
    await logger.error('API Error occurred', {
      correlationId,
      requestId,
      error,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Log security events for authentication/authorization errors
    if (errorCode >= 1000 && errorCode < 3000) {
      await logger.security('Security event detected', {
        eventType: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.HIGH,
        correlationId,
        requestId,
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        resourceType: 'api',
        resourceId: req.path,
        action: req.method,
        outcome: 'failure'
      });
    }

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Send error response
    res.status(httpStatus).json(apiError);

    // Log performance metrics
    const duration = Date.now() - startTime;
    await logger.info('Error handling completed', {
      correlationId,
      requestId,
      duration,
      httpStatus
    });
  } catch (handlingError) {
    // Fallback error handling
    await logger.error('Error in error handler', {
      correlationId,
      requestId,
      error: handlingError
    });
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      code: ErrorCodes.SYSTEM_ERROR,
      message: 'Internal server error',
      correlationId,
      requestId,
      timestamp: new Date()
    });
  }
};

export default errorHandler;