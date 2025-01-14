/**
 * Core API Service
 * Provides a centralized client for making HTTP requests to backend services
 * with comprehensive request/response handling, security, caching, and error management
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'; // ^1.4.0
import { apiConfig } from '../config/api.config';
import { ApiResponse, ApiRequestOptions, ApiError } from '../types/api.types';
import { handleApiError, transformResponse } from '../utils/api.utils';

/**
 * Cache duration in milliseconds (5 minutes)
 */
const CACHE_DURATION = 300000;

/**
 * Maximum number of retries for failed requests
 */
const MAX_RETRIES = 3;

/**
 * Base delay between retries in milliseconds
 */
const RETRY_DELAY = 1000;

/**
 * Request timeout in milliseconds
 */
const REQUEST_TIMEOUT = 30000;

/**
 * Interface for request cache entries
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Core API service class for handling all HTTP communications
 */
export class ApiService {
  private readonly axiosInstance: AxiosInstance;
  private readonly requestCache: Map<string, CacheEntry<any>>;
  private readonly pendingRequests: Map<string, Promise<any>>;

  constructor() {
    // Initialize axios instance with enhanced configuration
    this.axiosInstance = axios.create({
      baseURL: apiConfig.baseURL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Version': process.env.REACT_APP_VERSION || '1.0.0'
      },
      withCredentials: true
    });

    // Initialize request cache and pending requests tracking
    this.requestCache = new Map();
    this.pendingRequests = new Map();

    // Setup request interceptors
    this.setupRequestInterceptors();

    // Setup response interceptors
    this.setupResponseInterceptors();
  }

  /**
   * Performs a GET request with caching and error handling
   * @param endpoint API endpoint
   * @param params Query parameters
   * @param options Request options
   * @returns Promise resolving to API response
   */
  public async get<T>(
    endpoint: string,
    params: Record<string, any> = {},
    options: Partial<ApiRequestOptions> = {}
  ): Promise<ApiResponse<T>> {
    const cacheKey = this.generateCacheKey(endpoint, params);

    // Check cache if enabled
    if (options.cache !== false) {
      const cachedResponse = this.getCachedResponse<T>(cacheKey);
      if (cachedResponse) return cachedResponse;
    }

    // Check for pending requests to prevent duplicates
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) return pendingRequest;

    try {
      const request = this.makeRequest<T>('GET', endpoint, { params, ...options });
      this.pendingRequests.set(cacheKey, request);

      const response = await request;

      // Cache successful response if caching is enabled
      if (options.cache !== false) {
        this.cacheResponse(cacheKey, response);
      }

      return response;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Performs a POST request with error handling
   * @param endpoint API endpoint
   * @param data Request payload
   * @param options Request options
   * @returns Promise resolving to API response
   */
  public async post<T>(
    endpoint: string,
    data: any,
    options: Partial<ApiRequestOptions> = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('POST', endpoint, { data, ...options });
  }

  /**
   * Performs a PUT request with error handling
   * @param endpoint API endpoint
   * @param data Request payload
   * @param options Request options
   * @returns Promise resolving to API response
   */
  public async put<T>(
    endpoint: string,
    data: any,
    options: Partial<ApiRequestOptions> = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PUT', endpoint, { data, ...options });
  }

  /**
   * Performs a DELETE request with error handling
   * @param endpoint API endpoint
   * @param options Request options
   * @returns Promise resolving to API response
   */
  public async delete<T>(
    endpoint: string,
    options: Partial<ApiRequestOptions> = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('DELETE', endpoint, options);
  }

  /**
   * Makes an HTTP request with comprehensive error handling and retries
   * @param method HTTP method
   * @param endpoint API endpoint
   * @param options Request options
   * @returns Promise resolving to API response
   */
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    options: Partial<ApiRequestOptions> & AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const config: AxiosRequestConfig = {
        method,
        url: endpoint,
        ...options,
        headers: {
          ...options.headers,
          'X-Request-ID': crypto.randomUUID(),
          'X-Request-Time': new Date().toISOString()
        }
      };

      // Add authentication header if required
      if (options.withAuth !== false) {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers!.Authorization = `Bearer ${token}`;
        }
      }

      const response = await this.axiosInstance.request<T>(config);
      return transformResponse<T>(response);
    } catch (error) {
      const apiError = handleApiError(error as Error);
      return {
        success: false,
        data: {} as T,
        error: apiError.message,
        statusCode: apiError.code,
        errorDetails: apiError,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Sets up request interceptors for authentication and monitoring
   */
  private setupRequestInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add security headers
        config.headers = {
          ...config.headers,
          'X-XSS-Protection': '1; mode=block',
          'X-Content-Type-Options': 'nosniff',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
        };

        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * Sets up response interceptors for error handling and response transformation
   */
  private setupResponseInterceptors(): void {
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log response time for monitoring
        const requestTime = new Date(response.config.headers['X-Request-Time'] as string);
        const responseTime = new Date();
        const duration = responseTime.getTime() - requestTime.getTime();

        // Record metrics if monitoring is enabled
        if (apiConfig.monitoring.enabled) {
          console.log(`Request duration: ${duration}ms`);
        }

        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          // Handle token expiration
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generates a cache key for a request
   * @param endpoint API endpoint
   * @param params Query parameters
   * @returns Cache key string
   */
  private generateCacheKey(endpoint: string, params: Record<string, any>): string {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  /**
   * Retrieves a cached response if valid
   * @param key Cache key
   * @returns Cached response or null if not found/expired
   */
  private getCachedResponse<T>(key: string): ApiResponse<T> | null {
    const cached = this.requestCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    this.requestCache.delete(key);
    return null;
  }

  /**
   * Caches an API response
   * @param key Cache key
   * @param response API response to cache
   */
  private cacheResponse<T>(key: string, response: ApiResponse<T>): void {
    this.requestCache.set(key, {
      data: response,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();