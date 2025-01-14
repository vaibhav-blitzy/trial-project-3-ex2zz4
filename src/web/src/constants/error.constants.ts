/**
 * @fileoverview Error Constants and Types
 * Version: 1.0.0
 * 
 * Defines standardized error codes, messages, and handling utilities for the
 * task management system frontend. Implements error tracking and monitoring
 * capabilities with internationalization support.
 */

import { ApiError } from '../types/api.types';
import i18next from 'i18next'; // ^21.0.0

/**
 * Enumeration of all error codes used in the frontend application
 * Aligned with technical specification A.5 Error Codes
 */
export enum ERROR_CODES {
  // Authentication Errors (1000-1999)
  AUTHENTICATION_ERROR = 1001,
  INVALID_CREDENTIALS = 1002,
  SESSION_EXPIRED = 1003,
  MFA_REQUIRED = 1004,

  // Authorization Errors (2000-2999)
  AUTHORIZATION_ERROR = 2001,
  INSUFFICIENT_PERMISSIONS = 2002,
  INVALID_TOKEN = 2003,
  ACCESS_DENIED = 2004,

  // Validation Errors (3000-3999)
  VALIDATION_ERROR = 3001,
  INVALID_INPUT = 3002,
  REQUIRED_FIELD = 3003,
  INVALID_FORMAT = 3004,

  // Business Logic Errors (4000-4999)
  BUSINESS_ERROR = 4001,
  TASK_NOT_FOUND = 4002,
  PROJECT_NOT_FOUND = 4003,
  DUPLICATE_ENTRY = 4004,

  // System Errors (5000-5999)
  SYSTEM_ERROR = 5001,
  DATABASE_ERROR = 5002,
  CACHE_ERROR = 5003,
  SERVICE_UNAVAILABLE = 5004,

  // Integration Errors (6000-6999)
  INTEGRATION_ERROR = 6001,
  API_ERROR = 6002,
  NETWORK_ERROR = 6003,
  TIMEOUT_ERROR = 6004
}

/**
 * Error severity levels for error tracking and monitoring
 */
export enum ERROR_SEVERITY {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Mapping of error codes to their corresponding i18n message keys
 */
export const ERROR_MESSAGES: Record<ERROR_CODES, string> = {
  [ERROR_CODES.AUTHENTICATION_ERROR]: 'errors.auth.failed',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'errors.auth.invalid_credentials',
  [ERROR_CODES.SESSION_EXPIRED]: 'errors.auth.session_expired',
  [ERROR_CODES.MFA_REQUIRED]: 'errors.auth.mfa_required',

  [ERROR_CODES.AUTHORIZATION_ERROR]: 'errors.auth.permission',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'errors.auth.insufficient_permissions',
  [ERROR_CODES.INVALID_TOKEN]: 'errors.auth.invalid_token',
  [ERROR_CODES.ACCESS_DENIED]: 'errors.auth.access_denied',

  [ERROR_CODES.VALIDATION_ERROR]: 'errors.validation.input',
  [ERROR_CODES.INVALID_INPUT]: 'errors.validation.invalid_input',
  [ERROR_CODES.REQUIRED_FIELD]: 'errors.validation.required_field',
  [ERROR_CODES.INVALID_FORMAT]: 'errors.validation.invalid_format',

  [ERROR_CODES.BUSINESS_ERROR]: 'errors.business.rule',
  [ERROR_CODES.TASK_NOT_FOUND]: 'errors.business.task_not_found',
  [ERROR_CODES.PROJECT_NOT_FOUND]: 'errors.business.project_not_found',
  [ERROR_CODES.DUPLICATE_ENTRY]: 'errors.business.duplicate_entry',

  [ERROR_CODES.SYSTEM_ERROR]: 'errors.system.unexpected',
  [ERROR_CODES.DATABASE_ERROR]: 'errors.system.database',
  [ERROR_CODES.CACHE_ERROR]: 'errors.system.cache',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'errors.system.unavailable',

  [ERROR_CODES.INTEGRATION_ERROR]: 'errors.integration.connection',
  [ERROR_CODES.API_ERROR]: 'errors.integration.api',
  [ERROR_CODES.NETWORK_ERROR]: 'errors.integration.network',
  [ERROR_CODES.TIMEOUT_ERROR]: 'errors.integration.timeout'
};

/**
 * Error code ranges for different error categories
 */
export const ERROR_RANGES = {
  AUTHENTICATION: '1000-1999',
  AUTHORIZATION: '2000-2999',
  VALIDATION: '3000-3999',
  BUSINESS: '4000-4999',
  SYSTEM: '5000-5999',
  INTEGRATION: '6000-6999'
} as const;

/**
 * Mapping of error categories to severity levels
 */
export const ERROR_SEVERITY_MAPPING: Record<keyof typeof ERROR_RANGES, ERROR_SEVERITY> = {
  AUTHENTICATION: ERROR_SEVERITY.ERROR,
  AUTHORIZATION: ERROR_SEVERITY.ERROR,
  VALIDATION: ERROR_SEVERITY.WARNING,
  BUSINESS: ERROR_SEVERITY.WARNING,
  SYSTEM: ERROR_SEVERITY.CRITICAL,
  INTEGRATION: ERROR_SEVERITY.ERROR
};

/**
 * Type for error categories
 */
export type ErrorType = keyof typeof ERROR_RANGES;

/**
 * Interface for error tracking metadata
 */
export interface ErrorMetadata {
  timestamp: number;
  severity: ERROR_SEVERITY;
  context: Record<string, unknown>;
  stackTrace?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
}

/**
 * Determines error severity based on error code
 * @param errorCode - The error code to check
 * @returns The corresponding severity level
 */
export function getErrorSeverity(errorCode: number): ERROR_SEVERITY {
  const range = Object.entries(ERROR_RANGES).find(([_, range]) => {
    const [min, max] = range.split('-').map(Number);
    return errorCode >= min && errorCode <= max;
  });

  if (!range) {
    return ERROR_SEVERITY.ERROR;
  }

  return ERROR_SEVERITY_MAPPING[range[0] as keyof typeof ERROR_RANGES];
}

/**
 * Tracks error occurrence with metadata for monitoring
 * @param errorCode - The error code to track
 * @param metadata - Additional error metadata
 */
export function trackError(errorCode: ERROR_CODES, metadata: ErrorMetadata): void {
  const errorMessage = i18next.t(ERROR_MESSAGES[errorCode]);
  const severity = getErrorSeverity(errorCode);

  const errorPayload = {
    code: errorCode,
    message: errorMessage,
    severity,
    ...metadata,
    timestamp: metadata.timestamp || Date.now()
  };

  // Log error to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Tracking]', errorPayload);
  }

  // Send error to monitoring system
  // Implementation would depend on monitoring solution (e.g., Sentry, LogRocket)
  if (typeof window !== 'undefined' && window.errorTracker) {
    window.errorTracker.captureError(errorPayload);
  }
}

/**
 * Type guard to check if an error is an API error
 * @param error - The error to check
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}