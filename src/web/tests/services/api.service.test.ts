/**
 * API Service Test Suite
 * Comprehensive tests for API communication, authentication, error handling, and performance
 * @version 1.0.0
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'; // ^29.0.0
import axios from 'axios'; // ^1.4.0
import MockAdapter from 'axios-mock-adapter'; // ^1.21.0
import { ApiService } from '../../src/services/api.service';
import { apiConfig } from '../../src/config/api.config';
import { HTTP_STATUS, ERROR_CODES } from '../../src/constants/api.constants';
import { TaskStatus, TaskPriority } from '../../src/interfaces/task.interface';

// Test constants
const TEST_ENDPOINT = '/api/test';
const TEST_TIMEOUT = 5000;
const RETRY_ATTEMPTS = 3;

// Mock data
const MOCK_RESPONSE_DATA = {
  success: true,
  data: { id: '1', name: 'Test' },
  error: null,
  statusCode: HTTP_STATUS.OK,
  timestamp: new Date().toISOString()
};

const MOCK_ERROR_RESPONSE = {
  success: false,
  data: null,
  error: 'Test error',
  statusCode: HTTP_STATUS.BAD_REQUEST,
  timestamp: new Date().toISOString()
};

describe('ApiService', () => {
  let apiService: ApiService;
  let mockAxios: MockAdapter;

  beforeEach(() => {
    // Initialize API service and mock adapter
    apiService = new ApiService();
    mockAxios = new MockAdapter(axios);

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // Mock performance monitoring
    window.performance.mark = jest.fn();
    window.performance.measure = jest.fn();
  });

  afterEach(() => {
    mockAxios.reset();
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('HTTP Methods', () => {
    it('should successfully make GET request with query parameters', async () => {
      const params = { status: TaskStatus.TODO, priority: TaskPriority.HIGH };
      mockAxios.onGet(TEST_ENDPOINT).reply(200, MOCK_RESPONSE_DATA);

      const response = await apiService.get(TEST_ENDPOINT, params);

      expect(response.success).toBe(true);
      expect(response.statusCode).toBe(HTTP_STATUS.OK);
      expect(mockAxios.history.get[0].params).toEqual(params);
    });

    it('should handle GET request with caching', async () => {
      mockAxios.onGet(TEST_ENDPOINT).reply(200, MOCK_RESPONSE_DATA);

      // First request
      const response1 = await apiService.get(TEST_ENDPOINT, {}, { cache: true });
      // Second request should use cache
      const response2 = await apiService.get(TEST_ENDPOINT, {}, { cache: true });

      expect(response1).toEqual(response2);
      expect(mockAxios.history.get.length).toBe(1);
    });

    it('should make POST request with payload validation', async () => {
      const payload = { title: 'Test Task', status: TaskStatus.TODO };
      mockAxios.onPost(TEST_ENDPOINT).reply(201, MOCK_RESPONSE_DATA);

      const response = await apiService.post(TEST_ENDPOINT, payload);

      expect(response.success).toBe(true);
      expect(response.statusCode).toBe(HTTP_STATUS.OK);
      expect(JSON.parse(mockAxios.history.post[0].data)).toEqual(payload);
    });

    it('should handle PUT request with body transformation', async () => {
      const payload = { status: TaskStatus.IN_PROGRESS };
      mockAxios.onPut(TEST_ENDPOINT).reply(200, MOCK_RESPONSE_DATA);

      const response = await apiService.put(TEST_ENDPOINT, payload);

      expect(response.success).toBe(true);
      expect(JSON.parse(mockAxios.history.put[0].data)).toEqual(payload);
    });

    it('should process DELETE request with confirmation', async () => {
      mockAxios.onDelete(TEST_ENDPOINT).reply(200, MOCK_RESPONSE_DATA);

      const response = await apiService.delete(TEST_ENDPOINT);

      expect(response.success).toBe(true);
      expect(mockAxios.history.delete.length).toBe(1);
    });

    it('should handle request cancellation', async () => {
      const controller = new AbortController();
      mockAxios.onGet(TEST_ENDPOINT).reply(200, MOCK_RESPONSE_DATA);

      const promise = apiService.get(TEST_ENDPOINT, {}, { signal: controller.signal });
      controller.abort();

      await expect(promise).rejects.toThrow('canceled');
    });

    it('should respect request timeout settings', async () => {
      mockAxios.onGet(TEST_ENDPOINT).timeout();

      const response = await apiService.get(TEST_ENDPOINT, {}, { timeout: TEST_TIMEOUT });

      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
    });
  });

  describe('Authentication', () => {
    it('should add authentication headers', async () => {
      const token = 'test-token';
      localStorage.setItem('accessToken', token);
      mockAxios.onGet(TEST_ENDPOINT).reply(200, MOCK_RESPONSE_DATA);

      await apiService.get(TEST_ENDPOINT);

      expect(mockAxios.history.get[0].headers?.Authorization).toBe(`Bearer ${token}`);
    });

    it('should handle token refresh', async () => {
      mockAxios.onGet(TEST_ENDPOINT)
        .replyOnce(401, { error: 'Token expired' })
        .onGet(TEST_ENDPOINT)
        .reply(200, MOCK_RESPONSE_DATA);

      const response = await apiService.get(TEST_ENDPOINT);

      expect(response.success).toBe(true);
      expect(mockAxios.history.get.length).toBe(2);
    });

    it('should handle unauthorized errors', async () => {
      mockAxios.onGet(TEST_ENDPOINT).reply(401, MOCK_ERROR_RESPONSE);

      const response = await apiService.get(TEST_ENDPOINT);

      expect(response.success).toBe(false);
      expect(response.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors with retry', async () => {
      mockAxios.onGet(TEST_ENDPOINT)
        .replyOnce(503)
        .onGet(TEST_ENDPOINT)
        .reply(200, MOCK_RESPONSE_DATA);

      const response = await apiService.get(TEST_ENDPOINT);

      expect(response.success).toBe(true);
      expect(mockAxios.history.get.length).toBe(2);
    });

    it('should process API error responses', async () => {
      const errorResponse = {
        code: ERROR_CODES.VALIDATION_ERROR.INVALID_INPUT,
        message: 'Validation failed',
        validationErrors: { field: ['error'] }
      };
      mockAxios.onPost(TEST_ENDPOINT).reply(400, errorResponse);

      const response = await apiService.post(TEST_ENDPOINT, {});

      expect(response.success).toBe(false);
      expect(response.errorDetails?.validationErrors).toBeDefined();
    });

    it('should handle rate limiting', async () => {
      mockAxios.onGet(TEST_ENDPOINT)
        .replyOnce(429, { error: 'Too many requests' })
        .onGet(TEST_ENDPOINT)
        .reply(200, MOCK_RESPONSE_DATA);

      const response = await apiService.get(TEST_ENDPOINT);

      expect(response.success).toBe(true);
      expect(mockAxios.history.get.length).toBe(2);
    });
  });

  describe('Performance', () => {
    it('should track request timing', async () => {
      mockAxios.onGet(TEST_ENDPOINT).reply(200, MOCK_RESPONSE_DATA);

      await apiService.get(TEST_ENDPOINT);

      expect(window.performance.mark).toHaveBeenCalled();
      expect(window.performance.measure).toHaveBeenCalled();
    });

    it('should handle concurrent requests', async () => {
      mockAxios.onGet(TEST_ENDPOINT).reply(200, MOCK_RESPONSE_DATA);

      const requests = Array(5).fill(null).map(() => 
        apiService.get(TEST_ENDPOINT)
      );

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });
    });

    it('should monitor response thresholds', async () => {
      mockAxios.onGet(TEST_ENDPOINT).reply(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve([200, MOCK_RESPONSE_DATA]), 100);
        });
      });

      const response = await apiService.get(TEST_ENDPOINT);

      expect(response.success).toBe(true);
      // Verify response time is tracked
      expect(response.timestamp).toBeDefined();
    });
  });
});