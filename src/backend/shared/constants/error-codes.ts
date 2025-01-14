/**
 * @fileoverview Defines standardized error codes and their descriptions for consistent 
 * error handling across the task management system microservices.
 * @version 1.0.0
 */

/**
 * Enumeration of error categories for logical grouping of errors
 */
export enum ErrorCategories {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS = 'business',
  SYSTEM = 'system',
  INTEGRATION = 'integration'
}

/**
 * Enumeration of all system error codes with specific numeric ranges:
 * - Authentication (1000-1999)
 * - Authorization (2000-2999)
 * - Validation (3000-3999)
 * - Business Logic (4000-4999)
 * - System (5000-5999)
 * - Integration (6000-6999)
 */
export enum ErrorCodes {
  // Authentication Errors (1000-1999)
  INVALID_CREDENTIALS = 1001,
  TOKEN_EXPIRED = 1002,

  // Authorization Errors (2000-2999)
  INSUFFICIENT_PERMISSIONS = 2001,
  RESOURCE_ACCESS_DENIED = 2002,

  // Validation Errors (3000-3999)
  INVALID_INPUT_FORMAT = 3001,
  REQUIRED_FIELD_MISSING = 3002,

  // Business Logic Errors (4000-4999)
  TASK_ALREADY_COMPLETED = 4001,
  PROJECT_ALREADY_ARCHIVED = 4002,

  // System Errors (5000-5999)
  DATABASE_CONNECTION_ERROR = 5001,
  CACHE_SERVICE_ERROR = 5002,

  // Integration Errors (6000-6999)
  EXTERNAL_SERVICE_TIMEOUT = 6001,
  INTEGRATION_SYNC_FAILED = 6002
}

/**
 * Type-safe mapping of error codes to their corresponding human-readable messages
 */
export const ErrorMessages: Record<ErrorCodes, string> = {
  [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid credentials provided',
  [ErrorCodes.TOKEN_EXPIRED]: 'Authentication token has expired',
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions to perform this action',
  [ErrorCodes.RESOURCE_ACCESS_DENIED]: 'Access to requested resource is denied',
  [ErrorCodes.INVALID_INPUT_FORMAT]: 'Invalid input format detected',
  [ErrorCodes.REQUIRED_FIELD_MISSING]: 'Required field is missing',
  [ErrorCodes.TASK_ALREADY_COMPLETED]: 'Task has already been marked as completed',
  [ErrorCodes.PROJECT_ALREADY_ARCHIVED]: 'Project is already in archived state',
  [ErrorCodes.DATABASE_CONNECTION_ERROR]: 'Unable to connect to database',
  [ErrorCodes.CACHE_SERVICE_ERROR]: 'Cache service is unavailable',
  [ErrorCodes.EXTERNAL_SERVICE_TIMEOUT]: 'External service request timed out',
  [ErrorCodes.INTEGRATION_SYNC_FAILED]: 'Failed to synchronize with external system'
};

/**
 * Error code ranges for different categories
 */
export const ERROR_CODE_RANGES = {
  [ErrorCategories.AUTHENTICATION]: '1000-1999',
  [ErrorCategories.AUTHORIZATION]: '2000-2999',
  [ErrorCategories.VALIDATION]: '3000-3999',
  [ErrorCategories.BUSINESS]: '4000-4999',
  [ErrorCategories.SYSTEM]: '5000-5999',
  [ErrorCategories.INTEGRATION]: '6000-6999'
} as const;

/**
 * Retrieves the human-readable message for a given error code
 * @param code - The error code to get the message for
 * @returns The corresponding error message or a default message if not found
 */
export function getErrorMessage(code: ErrorCodes): string {
  return ErrorMessages[code] || 'An unexpected error occurred';
}

/**
 * Type guard to check if a number is a valid ErrorCode
 * @param code - The number to check
 * @returns Boolean indicating if the code is a valid ErrorCode
 */
export function isValidErrorCode(code: number): code is ErrorCodes {
  return Object.values(ErrorCodes).includes(code);
}

/**
 * Gets the category for a given error code
 * @param code - The error code to categorize
 * @returns The corresponding ErrorCategory
 */
export function getErrorCategory(code: ErrorCodes): ErrorCategories {
  if (code >= 1000 && code < 2000) return ErrorCategories.AUTHENTICATION;
  if (code >= 2000 && code < 3000) return ErrorCategories.AUTHORIZATION;
  if (code >= 3000 && code < 4000) return ErrorCategories.VALIDATION;
  if (code >= 4000 && code < 5000) return ErrorCategories.BUSINESS;
  if (code >= 5000 && code < 6000) return ErrorCategories.SYSTEM;
  if (code >= 6000 && code < 7000) return ErrorCategories.INTEGRATION;
  throw new Error('Invalid error code range');
}