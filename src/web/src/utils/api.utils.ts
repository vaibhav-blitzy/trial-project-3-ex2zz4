/**
 * API Utilities Module
 * Provides comprehensive utility functions for API communication, error handling,
 * and response transformation in the frontend application.
 * @version 1.0.0
 */

import axios, { AxiosError, AxiosResponse } from 'axios'; // ^1.4.0
import qs from 'qs'; // ^6.11.0

import { ApiResponse, ApiError } from '../types/api.types';
import { HTTP_STATUS, ERROR_CODES } from '../constants/api.constants';
import { apiConfig } from '../config/api.config';

/**
 * Default error messages with i18n support
 */
const DEFAULT_ERROR_MESSAGES: Record<string, string> = {
  en: 'An unexpected error occurred. Please try again.',
  es: 'Ocurrió un error inesperado. Por favor, inténtelo de nuevo.',
  fr: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
};

/**
 * Maximum number of retry attempts for failed requests
 */
const MAX_RETRIES = 3;

/**
 * Delay between retry attempts in milliseconds
 */
const RETRY_DELAY = 1000;

/**
 * Interface for response metadata
 */
interface ResponseMetadata {
  timestamp: string;
  requestId: string;
  duration: number;
  cache: boolean;
}

/**
 * Creates a standardized API response with enhanced metadata
 * @param data Response data
 * @param success Success status
 * @param error Error object if any
 * @param metadata Response metadata
 * @returns Standardized API response
 */
export function createApiResponse<T>(
  data: T,
  success: boolean = true,
  error: ApiError | null = null,
  metadata?: Partial<ResponseMetadata>
): ApiResponse<T> {
  const responseMetadata: ResponseMetadata = {
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
    duration: 0,
    cache: false,
    ...metadata
  };

  return {
    success,
    data,
    error,
    statusCode: success ? HTTP_STATUS.OK : (error?.code || HTTP_STATUS.INTERNAL_SERVER_ERROR),
    errorDetails: error,
    timestamp: responseMetadata.timestamp
  };
}

/**
 * Handles API errors with comprehensive error categorization and retry logic
 * @param error Error object
 * @param retryCount Current retry attempt
 * @returns Standardized error object
 */
export function handleApiError(error: Error | AxiosError, retryCount: number = 0): ApiError {
  // Initialize error object
  const apiError: ApiError = {
    code: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: DEFAULT_ERROR_MESSAGES.en,
    details: {},
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
    validationErrors: {}
  };

  if (axios.isAxiosError(error)) {
    const response = error.response;
    
    if (response) {
      apiError.code = response.status;
      apiError.details = response.data;

      // Handle specific error types
      switch (response.status) {
        case HTTP_STATUS.BAD_REQUEST:
          apiError.code = ERROR_CODES.VALIDATION_ERROR.INVALID_INPUT;
          apiError.validationErrors = response.data.validationErrors || {};
          break;
        case HTTP_STATUS.UNAUTHORIZED:
          apiError.code = ERROR_CODES.AUTH_ERROR.INVALID_TOKEN;
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          break;
        case HTTP_STATUS.FORBIDDEN:
          apiError.code = ERROR_CODES.BUSINESS_ERROR.INSUFFICIENT_PERMISSIONS;
          break;
        case HTTP_STATUS.NOT_FOUND:
          apiError.code = ERROR_CODES.SYSTEM_ERROR.DATABASE_ERROR;
          break;
      }

      // Apply retry logic for specific error types
      if (
        retryCount < MAX_RETRIES &&
        [HTTP_STATUS.SERVICE_UNAVAILABLE, HTTP_STATUS.TOO_MANY_REQUESTS].includes(response.status)
      ) {
        return retryRequest(error, retryCount);
      }
    }
  }

  // Log error for monitoring
  console.error('[API Error]', {
    error: apiError,
    originalError: error,
    timestamp: apiError.timestamp,
    requestId: apiError.requestId
  });

  return apiError;
}

/**
 * Retries failed requests with exponential backoff
 * @param error Original error
 * @param retryCount Current retry attempt
 * @returns Promise that resolves to API error
 */
async function retryRequest(error: AxiosError, retryCount: number): Promise<ApiError> {
  const delay = RETRY_DELAY * Math.pow(2, retryCount);
  
  await new Promise(resolve => setTimeout(resolve, delay));
  
  try {
    const response = await axios.request({
      ...error.config,
      headers: {
        ...error.config?.headers,
        'X-Retry-Count': retryCount + 1
      }
    });
    
    return createApiResponse(response.data).error!;
  } catch (retryError) {
    return handleApiError(retryError as Error, retryCount + 1);
  }
}

/**
 * Transforms API responses with enhanced validation and sanitization
 * @param response Axios response object
 * @returns Transformed and validated response
 */
export function transformResponse<T>(response: AxiosResponse): ApiResponse<T> {
  const startTime = new Date(response.config.headers['X-Request-Time'] as string);
  const endTime = new Date();
  
  const metadata: ResponseMetadata = {
    timestamp: endTime.toISOString(),
    requestId: response.config.headers['X-Request-ID'] as string,
    duration: endTime.getTime() - startTime.getTime(),
    cache: response.headers['x-cache'] === 'HIT'
  };

  // Validate response structure
  if (!response.data) {
    return createApiResponse<T>(
      {} as T,
      false,
      {
        code: ERROR_CODES.SYSTEM_ERROR.INTEGRATION_ERROR,
        message: 'Invalid response structure',
        details: {},
        timestamp: metadata.timestamp,
        requestId: metadata.requestId,
        validationErrors: {}
      },
      metadata
    );
  }

  // Transform and sanitize response data
  const transformedData = sanitizeResponseData(response.data);

  return createApiResponse<T>(
    transformedData,
    response.status === HTTP_STATUS.OK,
    null,
    metadata
  );
}

/**
 * Sanitizes response data to prevent XSS and other security issues
 * @param data Response data to sanitize
 * @returns Sanitized data
 */
function sanitizeResponseData<T>(data: T): T {
  if (typeof data === 'string') {
    // Sanitize strings to prevent XSS
    return data.replace(/[<>]/g, '') as unknown as T;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponseData(item)) as unknown as T;
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeResponseData(value);
    }
    
    return sanitized;
  }
  
  return data;
}