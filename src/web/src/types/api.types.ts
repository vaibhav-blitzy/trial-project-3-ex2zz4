/**
 * @fileoverview API Types and Interfaces
 * Version: 1.0.0
 * 
 * Defines comprehensive TypeScript types and interfaces for API request/response 
 * structures, ensuring type safety in API communications between frontend and 
 * backend services.
 */

import { AxiosResponse } from 'axios'; // ^1.4.0
import { IAuthTokens } from '../interfaces/auth.interface';
import { IProject } from '../interfaces/project.interface';
import { ITask } from '../interfaces/task.interface';

/**
 * API version constant for consistent versioning across requests
 */
export const API_VERSION = 'v1';

/**
 * Default timeout for API requests in milliseconds
 */
export const DEFAULT_API_TIMEOUT = 30000;

/**
 * Maximum number of retry attempts for failed requests
 */
export const MAX_RETRIES = 3;

/**
 * Delay between retry attempts in milliseconds
 */
export const RETRY_DELAY = 1000;

/**
 * Supported HTTP methods for API requests
 */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Type-safe API endpoint path structure
 */
export type ApiEndpoint = `/api/${string}/v${number}/${string}`;

/**
 * Type-safe structure for API request headers
 */
export type ApiHeaders = Record<'Authorization' | 'Content-Type' | 'Accept' | 'X-Request-ID' | string, string>;

/**
 * Generic interface for all API responses
 * Provides consistent structure with comprehensive error handling
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
  statusCode: number;
  errorDetails: ApiError | null;
  timestamp: string;
}

/**
 * Comprehensive error structure for API responses
 * Includes detailed error information for debugging and user feedback
 */
export interface ApiError {
  code: number;
  message: string;
  details: Record<string, any>;
  timestamp: string;
  requestId: string;
  validationErrors: Record<string, string[]>;
}

/**
 * Interface for paginated API responses
 * Includes metadata for pagination handling
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Configuration options for API requests
 * Provides comprehensive request customization
 */
export interface ApiRequestOptions {
  withAuth: boolean;
  headers: Record<string, string>;
  timeout: number;
  withCredentials: boolean;
  signal?: AbortSignal;
  cache: boolean;
  retries: number;
  retryDelay: number;
}

/**
 * Type alias for API responses using Axios
 */
export type ApiAxiosResponse<T> = AxiosResponse<ApiResponse<T>>;

/**
 * Type for authentication API responses
 */
export type AuthApiResponse = ApiResponse<{
  tokens: IAuthTokens;
  user: {
    id: string;
    email: string;
    role: string;
  };
}>;

/**
 * Type for project-related API responses
 */
export type ProjectApiResponse = ApiResponse<IProject>;

/**
 * Type for task-related API responses
 */
export type TaskApiResponse = ApiResponse<ITask>;

/**
 * Type for paginated project list responses
 */
export type PaginatedProjectResponse = ApiResponse<PaginatedResponse<IProject>>;

/**
 * Type for paginated task list responses
 */
export type PaginatedTaskResponse = ApiResponse<PaginatedResponse<ITask>>;

/**
 * Type for API error responses with validation details
 */
export type ValidationErrorResponse = ApiResponse<{
  validationErrors: Record<string, string[]>;
}>;

/**
 * Type guard to check if response is paginated
 */
export function isPaginatedResponse<T>(response: ApiResponse<T> | ApiResponse<PaginatedResponse<T>>): 
  response is ApiResponse<PaginatedResponse<T>> {
  return 'items' in (response.data as any);
}

/**
 * Type guard to check if response contains validation errors
 */
export function isValidationError(error: ApiError): error is ValidationErrorResponse['data'] {
  return 'validationErrors' in error && Object.keys(error.validationErrors).length > 0;
}