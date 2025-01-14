/**
 * @file status-codes.ts
 * @description Defines standardized HTTP status codes and their descriptions for consistent 
 * response handling across the task management system microservices.
 * Implements RFC-compliant HTTP status codes with type-safe enums and immutable message mappings.
 */

/**
 * Enum representing standardized HTTP status codes used across the system.
 * Values follow RFC 7231 standards for HTTP/1.1 status codes.
 */
export enum HttpStatusCodes {
    /** Successful request completion */
    OK = 200,
    
    /** Resource successfully created */
    CREATED = 201,
    
    /** Request contains invalid parameters or payload */
    BAD_REQUEST = 400,
    
    /** Authentication credentials missing or invalid */
    UNAUTHORIZED = 401,
    
    /** User lacks required permissions for the operation */
    FORBIDDEN = 403,
    
    /** Requested resource does not exist */
    NOT_FOUND = 404,
    
    /** Request conflicts with existing resource state */
    CONFLICT = 409,
    
    /** Client has exceeded rate limits */
    TOO_MANY_REQUESTS = 429,
    
    /** Unexpected server-side error occurred */
    INTERNAL_SERVER_ERROR = 500,
    
    /** Service temporarily unavailable */
    SERVICE_UNAVAILABLE = 503
}

/**
 * Immutable mapping of HTTP status codes to standardized human-readable messages.
 * Used for consistent error messaging across all microservices.
 */
export const StatusMessages: Record<HttpStatusCodes, string> = {
    [HttpStatusCodes.OK]: 'Successful request',
    [HttpStatusCodes.CREATED]: 'Resource created',
    [HttpStatusCodes.BAD_REQUEST]: 'Invalid input',
    [HttpStatusCodes.UNAUTHORIZED]: 'Missing/invalid authentication',
    [HttpStatusCodes.FORBIDDEN]: 'Insufficient permissions',
    [HttpStatusCodes.NOT_FOUND]: 'Resource not found',
    [HttpStatusCodes.CONFLICT]: 'Resource conflict',
    [HttpStatusCodes.TOO_MANY_REQUESTS]: 'Rate limit exceeded',
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: 'Internal server error',
    [HttpStatusCodes.SERVICE_UNAVAILABLE]: 'Service down'
} as const;