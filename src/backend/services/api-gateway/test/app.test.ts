/**
 * @fileoverview Comprehensive test suite for API Gateway service
 * Testing middleware configurations, authentication, rate limiting, and error handling
 * @version 1.0.0
 */

import request from 'supertest'; // v6.3.3
import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals'; // v29.5.0
import nock from 'nock'; // v13.3.0
import app from '../src/app';
import { authenticate } from '../src/middleware/auth.middleware';
import errorHandler from '../src/middleware/error.middleware';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { HttpStatusCodes } from '../../../shared/constants/status-codes';
import { RedisConnection } from '../../../shared/utils/redis.util';
import { TokenService } from '../../auth-service/src/services/token.service';

// Test utilities
const generateTestToken = (payload: any = {}, type: 'access' | 'refresh' = 'access'): string => {
  const tokenService = new TokenService(null);
  return tokenService.generateTokens({
    sub: 'test-user',
    role: 'ADMIN',
    permissions: ['read', 'write'],
    ...payload
  }).then(tokens => type === 'access' ? tokens.accessToken : tokens.refreshToken);
};

// Mock services
const mockAuthService = nock('http://auth-service')
  .defaultReplyHeaders({
    'access-control-allow-origin': '*',
    'access-control-allow-credentials': 'true'
  });

describe('API Gateway Integration Tests', () => {
  let redis: RedisConnection;

  beforeAll(async () => {
    // Initialize Redis connection for tests
    redis = RedisConnection.getInstance({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || '',
      db: 0,
      keyPrefix: 'test:',
      cluster: false,
      maxRetriesPerRequest: 3,
      piiEnabled: false,
      compressionThreshold: 1024
    });
    await redis.connect();

    // Clear any existing test data
    await redis.delete('test:*');
  });

  afterAll(async () => {
    await redis.disconnect();
    nock.cleanAll();
  });

  describe('Middleware Configuration', () => {
    test('should apply security headers correctly', async () => {
      const response = await request(app).get('/health/live');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('deny');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/health/live')
        .set('Origin', process.env.FRONTEND_URL || 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    test('should reject invalid CORS origins', async () => {
      const response = await request(app)
        .get('/health/live')
        .set('Origin', 'http://malicious-site.com');

      expect(response.status).toBe(403);
    });
  });

  describe('Authentication and Authorization', () => {
    test('should reject requests without authentication', async () => {
      const response = await request(app).get('/api/v1/tasks');
      
      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
      expect(response.body.code).toBe(ErrorCodes.INVALID_CREDENTIALS);
    });

    test('should validate JWT tokens correctly', async () => {
      const token = await generateTestToken();
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(HttpStatusCodes.OK);
    });

    test('should handle expired tokens', async () => {
      const token = await generateTestToken({ exp: Math.floor(Date.now() / 1000) - 3600 });
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
      expect(response.body.code).toBe(ErrorCodes.TOKEN_EXPIRED);
    });

    test('should enforce role-based access control', async () => {
      const guestToken = await generateTestToken({ role: 'GUEST' });
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
      expect(response.body.code).toBe(ErrorCodes.INSUFFICIENT_PERMISSIONS);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const token = await generateTestToken();
      const requests = Array(101).fill(null).map(() => 
        request(app)
          .get('/api/v1/tasks')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(r => r.status === 429);
      
      expect(tooManyRequests.length).toBeGreaterThan(0);
    });

    test('should apply different limits per endpoint', async () => {
      const token = await generateTestToken();
      const authRequests = Array(101).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'test@example.com', password: 'password' })
      );

      const responses = await Promise.all(authRequests);
      const tooManyRequests = responses.filter(r => r.status === 429);
      
      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors correctly', async () => {
      const token = await generateTestToken();
      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST);
      expect(response.body.code).toBe(ErrorCodes.INVALID_INPUT_FORMAT);
    });

    test('should mask sensitive data in error responses', async () => {
      const token = await generateTestToken();
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'test@example.com',
          ssn: '123-45-6789',
          creditCard: '4111-1111-1111-1111'
        });

      expect(response.body.details).not.toContain('123-45-6789');
      expect(response.body.details).not.toContain('4111-1111-1111-1111');
    });

    test('should include correlation ID in error responses', async () => {
      const response = await request(app)
        .get('/api/v1/invalid-endpoint');

      expect(response.body.correlationId).toBeDefined();
      expect(response.body.requestId).toBeDefined();
    });
  });

  describe('Health Checks', () => {
    test('should respond to liveness probe', async () => {
      const response = await request(app).get('/health/live');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    test('should respond to readiness probe', async () => {
      const response = await request(app).get('/health/ready');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});