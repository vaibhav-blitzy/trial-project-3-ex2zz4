/**
 * API Configuration Module
 * Defines core API client configuration including base URL, timeout settings,
 * request/response interceptors, caching strategies, monitoring, and security features
 * @version 1.0.0
 */

import axios, { AxiosRequestConfig } from 'axios'; // ^1.4.0
import { setupCache } from 'axios-cache-adapter'; // ^2.7.3
import axiosRetry from 'axios-retry'; // ^3.5.0
import CircuitBreaker from 'circuit-breaker-js'; // ^0.5.0

import { API_ENDPOINTS } from '../constants/api.constants';
import { ApiRequestOptions } from '../types/api.types';

// Default timeout in milliseconds
const DEFAULT_TIMEOUT = 30000;

// Default headers for all requests
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'X-Client-Version': process.env.REACT_APP_VERSION || '1.0.0'
};

// Default caching configuration
const CACHE_CONFIG = {
  maxAge: 15 * 60 * 1000, // 15 minutes
  exclude: {
    query: false,
    methods: ['POST', 'PUT', 'DELETE', 'PATCH']
  }
};

// Retry configuration for failed requests
const RETRY_CONFIG = {
  retries: 3,
  retryDelay: 1000,
  retryCondition: axiosRetry.isNetworkOrIdempotentRequestError
};

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  windowDuration: 10000, // 10 seconds
  numBuckets: 10,
  timeoutDuration: 2000,
  errorThreshold: 50,
  volumeThreshold: 10
};

/**
 * Interface for API configuration options
 */
export interface ApiConfigOptions {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
  withCredentials: boolean;
  cache: {
    maxAge: number;
    exclude: {
      query: boolean;
      methods: string[];
    };
  };
  retry: {
    retries: number;
    retryDelay: number;
    retryCondition: (error: any) => boolean;
  };
  circuitBreaker: {
    windowDuration: number;
    numBuckets: number;
    timeoutDuration: number;
    errorThreshold: number;
    volumeThreshold: number;
  };
  monitoring: {
    enabled: boolean;
    metricsEndpoint?: string;
  };
}

/**
 * Default API configuration
 */
export const apiConfig: ApiConfigOptions = {
  baseURL: API_ENDPOINTS.API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: DEFAULT_HEADERS,
  withCredentials: true,
  cache: CACHE_CONFIG,
  retry: RETRY_CONFIG,
  circuitBreaker: CIRCUIT_BREAKER_CONFIG,
  monitoring: {
    enabled: true,
    metricsEndpoint: '/metrics'
  }
};

/**
 * Creates an API configuration with custom options merged with defaults
 * @param options Custom API configuration options
 * @returns Merged API configuration
 */
export function createApiConfig(options: ApiRequestOptions): AxiosRequestConfig {
  // Set up caching adapter
  const cache = setupCache({
    maxAge: CACHE_CONFIG.maxAge,
    exclude: CACHE_CONFIG.exclude
  });

  // Initialize circuit breaker
  const breaker = new CircuitBreaker(CIRCUIT_BREAKER_CONFIG);

  // Create base axios config
  const config: AxiosRequestConfig = {
    baseURL: options.headers?.['X-Base-URL'] || apiConfig.baseURL,
    timeout: options.timeout || apiConfig.timeout,
    headers: {
      ...apiConfig.headers,
      ...options.headers
    },
    withCredentials: options.withCredentials ?? apiConfig.withCredentials,
    adapter: cache.adapter
  };

  // Add authentication header if required
  if (options.withAuth) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers!.Authorization = `Bearer ${token}`;
    }
  }

  // Add security headers
  config.headers = {
    ...config.headers,
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  };

  // Configure request interceptors
  axios.interceptors.request.use(
    (config) => {
      // Add request ID for tracing
      config.headers!['X-Request-ID'] = crypto.randomUUID();
      
      // Add timestamp for monitoring
      config.headers!['X-Request-Time'] = new Date().toISOString();
      
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Configure response interceptors
  axios.interceptors.response.use(
    (response) => {
      // Log response time for monitoring
      const requestTime = new Date(response.config.headers!['X-Request-Time']);
      const responseTime = new Date();
      const duration = responseTime.getTime() - requestTime.getTime();
      
      // Record metrics if monitoring is enabled
      if (apiConfig.monitoring.enabled) {
        // Implementation for metrics recording would go here
        console.log(`Request duration: ${duration}ms`);
      }
      
      return response;
    },
    (error) => {
      // Handle specific error types
      if (error.response) {
        switch (error.response.status) {
          case 401:
            // Handle unauthorized access
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            break;
          case 403:
            // Handle forbidden access
            window.dispatchEvent(new CustomEvent('auth:forbidden'));
            break;
          case 429:
            // Handle rate limiting
            window.dispatchEvent(new CustomEvent('api:rate-limited'));
            break;
        }
      }
      
      return Promise.reject(error);
    }
  );

  // Configure retry mechanism
  axiosRetry(axios, {
    retries: options.retries || apiConfig.retry.retries,
    retryDelay: (retryCount) => {
      return retryCount * (options.retryDelay || apiConfig.retry.retryDelay);
    },
    retryCondition: apiConfig.retry.retryCondition
  });

  // Wrap axios instance with circuit breaker
  const originalRequest = axios.request;
  axios.request = (config: AxiosRequestConfig) => {
    return new Promise((resolve, reject) => {
      breaker.run(
        () => originalRequest(config),
        (err: any) => reject(err)
      ).then(resolve);
    });
  };

  return config;
}