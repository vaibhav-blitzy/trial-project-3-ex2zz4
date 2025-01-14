import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import supertest from 'supertest';
import MockDate from 'mockdate';
import app from '../src/app';
import { Project } from '../src/models/project.model';
import { ProjectController } from '../src/controllers/project.controller';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { HttpStatusCodes } from '../../../shared/constants/status-codes';
import { ProjectStatus } from '../../../shared/interfaces/project.interface';
import { DatabaseConnection } from '../../../shared/utils/database.util';
import Logger from '../../../shared/utils/logger.util';

// Test constants
const API_BASE_PATH = '/api/v1/projects';
const TEST_TIMEOUT = 30000;

// Mock test project data
const TEST_PROJECT = {
  name: 'Test Project',
  description: 'Project for testing',
  status: ProjectStatus.ACTIVE,
  teamId: 'test-team-id',
  ownerId: 'test-owner-id',
  memberIds: ['member-1', 'member-2'],
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  settings: {
    visibility: 'private',
    notifications: true
  }
};

// Mock authentication token
const AUTH_TOKEN = 'Bearer test-token';

// Initialize test client
const request = supertest(app);

// Mock services and dependencies
jest.mock('../../../shared/utils/database.util');
jest.mock('../../../shared/utils/logger.util');

describe('Project Service API Tests', () => {
  let db: DatabaseConnection;
  let logger: Logger;

  beforeAll(async () => {
    // Initialize database connection
    db = DatabaseConnection.getInstance({} as any);
    await db.connect();

    // Initialize logger
    logger = Logger.getInstance('ProjectTest', {
      enableConsole: false,
      enableFile: false
    });

    // Set fixed date for consistent testing
    MockDate.set('2024-01-01T00:00:00.000Z');
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup database
    await db.disconnect();
    
    // Reset mocked date
    MockDate.reset();
  });

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset database state
    await db.getKnex().raw('TRUNCATE TABLE projects CASCADE');
  });

  describe('Project Creation Tests', () => {
    test('should create new project with valid data', async () => {
      const response = await request
        .post(API_BASE_PATH)
        .set('Authorization', AUTH_TOKEN)
        .send(TEST_PROJECT)
        .expect(HttpStatusCodes.CREATED);

      expect(response.body).toMatchObject({
        name: TEST_PROJECT.name,
        status: TEST_PROJECT.status,
        teamId: TEST_PROJECT.teamId
      });
      expect(response.body.id).toBeDefined();
    });

    test('should handle concurrent project creation requests', async () => {
      const createRequests = Array(5).fill(null).map(() =>
        request
          .post(API_BASE_PATH)
          .set('Authorization', AUTH_TOKEN)
          .send(TEST_PROJECT)
      );

      const responses = await Promise.all(createRequests);
      const uniqueIds = new Set(responses.map(r => r.body.id));

      expect(responses).toHaveLength(5);
      expect(uniqueIds.size).toBe(5);
      responses.forEach(response => {
        expect(response.status).toBe(HttpStatusCodes.CREATED);
      });
    });

    test('should validate required fields', async () => {
      const invalidProject = { ...TEST_PROJECT };
      delete invalidProject.name;

      const response = await request
        .post(API_BASE_PATH)
        .set('Authorization', AUTH_TOKEN)
        .send(invalidProject)
        .expect(HttpStatusCodes.BAD_REQUEST);

      expect(response.body.code).toBe(ErrorCodes.REQUIRED_FIELD_MISSING);
    });

    test('should enforce date validation rules', async () => {
      const invalidProject = {
        ...TEST_PROJECT,
        startDate: '2024-12-31',
        endDate: '2024-01-01'
      };

      const response = await request
        .post(API_BASE_PATH)
        .set('Authorization', AUTH_TOKEN)
        .send(invalidProject)
        .expect(HttpStatusCodes.BAD_REQUEST);

      expect(response.body.message).toContain('End date must be after start date');
    });
  });

  describe('Project Retrieval Tests', () => {
    let testProject: any;

    beforeEach(async () => {
      // Create test project
      const response = await request
        .post(API_BASE_PATH)
        .set('Authorization', AUTH_TOKEN)
        .send(TEST_PROJECT);
      testProject = response.body;
    });

    test('should get project by ID', async () => {
      const response = await request
        .get(`${API_BASE_PATH}/${testProject.id}`)
        .set('Authorization', AUTH_TOKEN)
        .expect(HttpStatusCodes.OK);

      expect(response.body).toMatchObject({
        id: testProject.id,
        name: TEST_PROJECT.name
      });
    });

    test('should handle non-existent project', async () => {
      const response = await request
        .get(`${API_BASE_PATH}/non-existent-id`)
        .set('Authorization', AUTH_TOKEN)
        .expect(HttpStatusCodes.NOT_FOUND);

      expect(response.body.code).toBe(ErrorCodes.RESOURCE_ACCESS_DENIED);
    });

    test('should get paginated team projects', async () => {
      // Create multiple test projects
      await Promise.all(
        Array(5).fill(null).map(() =>
          request
            .post(API_BASE_PATH)
            .set('Authorization', AUTH_TOKEN)
            .send(TEST_PROJECT)
        )
      );

      const response = await request
        .get(`${API_BASE_PATH}/team/${TEST_PROJECT.teamId}`)
        .set('Authorization', AUTH_TOKEN)
        .query({ page: 1, pageSize: 3 })
        .expect(HttpStatusCodes.OK);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.total).toBeGreaterThan(3);
    });
  });

  describe('Project Update Tests', () => {
    let testProject: any;

    beforeEach(async () => {
      const response = await request
        .post(API_BASE_PATH)
        .set('Authorization', AUTH_TOKEN)
        .send(TEST_PROJECT);
      testProject = response.body;
    });

    test('should update project with valid data', async () => {
      const updateData = {
        name: 'Updated Project Name',
        description: 'Updated description'
      };

      const response = await request
        .put(`${API_BASE_PATH}/${testProject.id}`)
        .set('Authorization', AUTH_TOKEN)
        .send(updateData)
        .expect(HttpStatusCodes.OK);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
    });

    test('should validate status transitions', async () => {
      const invalidTransition = {
        status: ProjectStatus.ARCHIVED
      };

      const response = await request
        .put(`${API_BASE_PATH}/${testProject.id}`)
        .set('Authorization', AUTH_TOKEN)
        .send(invalidTransition)
        .expect(HttpStatusCodes.BAD_REQUEST);

      expect(response.body.message).toContain('Invalid status transition');
    });

    test('should handle concurrent updates', async () => {
      const updateRequests = Array(3).fill(null).map((_, index) =>
        request
          .put(`${API_BASE_PATH}/${testProject.id}`)
          .set('Authorization', AUTH_TOKEN)
          .send({ name: `Concurrent Update ${index}` })
      );

      const responses = await Promise.all(updateRequests);
      const uniqueNames = new Set(responses.map(r => r.body.name));

      expect(responses.every(r => r.status === HttpStatusCodes.OK)).toBe(true);
      expect(uniqueNames.size).toBe(1);
    });
  });

  describe('Project Deletion Tests', () => {
    let testProject: any;

    beforeEach(async () => {
      const response = await request
        .post(API_BASE_PATH)
        .set('Authorization', AUTH_TOKEN)
        .send(TEST_PROJECT);
      testProject = response.body;
    });

    test('should delete project successfully', async () => {
      await request
        .delete(`${API_BASE_PATH}/${testProject.id}`)
        .set('Authorization', AUTH_TOKEN)
        .expect(HttpStatusCodes.NO_CONTENT);

      // Verify project is deleted
      await request
        .get(`${API_BASE_PATH}/${testProject.id}`)
        .set('Authorization', AUTH_TOKEN)
        .expect(HttpStatusCodes.NOT_FOUND);
    });

    test('should handle cascading deletes', async () => {
      // Create related data
      // TODO: Add test data creation for related entities

      await request
        .delete(`${API_BASE_PATH}/${testProject.id}`)
        .set('Authorization', AUTH_TOKEN)
        .expect(HttpStatusCodes.NO_CONTENT);

      // Verify related data is cleaned up
      // TODO: Add verification for related data cleanup
    });
  });

  describe('Project Statistics Tests', () => {
    let testProject: any;

    beforeEach(async () => {
      const response = await request
        .post(API_BASE_PATH)
        .set('Authorization', AUTH_TOKEN)
        .send(TEST_PROJECT);
      testProject = response.body;
    });

    test('should get project statistics', async () => {
      const response = await request
        .get(`${API_BASE_PATH}/${testProject.id}/stats`)
        .set('Authorization', AUTH_TOKEN)
        .expect(HttpStatusCodes.OK);

      expect(response.body).toMatchObject({
        totalTasks: expect.any(Number),
        completedTasks: expect.any(Number),
        progress: expect.any(Number),
        activeMembers: expect.any(Number)
      });
    });

    test('should handle statistics caching', async () => {
      // First request
      const response1 = await request
        .get(`${API_BASE_PATH}/${testProject.id}/stats`)
        .set('Authorization', AUTH_TOKEN);

      // Second request should hit cache
      const response2 = await request
        .get(`${API_BASE_PATH}/${testProject.id}/stats`)
        .set('Authorization', AUTH_TOKEN);

      expect(response1.body).toEqual(response2.body);
      expect(response2.headers['x-cache-hit']).toBe('true');
    });
  });

  describe('Security Tests', () => {
    test('should enforce authentication', async () => {
      await request
        .post(API_BASE_PATH)
        .send(TEST_PROJECT)
        .expect(HttpStatusCodes.UNAUTHORIZED);
    });

    test('should validate team access permissions', async () => {
      const unauthorizedProject = {
        ...TEST_PROJECT,
        teamId: 'unauthorized-team-id'
      };

      await request
        .post(API_BASE_PATH)
        .set('Authorization', AUTH_TOKEN)
        .send(unauthorizedProject)
        .expect(HttpStatusCodes.FORBIDDEN);
    });

    test('should handle rate limiting', async () => {
      const requests = Array(100).fill(null).map(() =>
        request
          .post(API_BASE_PATH)
          .set('Authorization', AUTH_TOKEN)
          .send(TEST_PROJECT)
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === HttpStatusCodes.TOO_MANY_REQUESTS);

      expect(rateLimited).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large project creation within timeout', async () => {
      const largeProject = {
        ...TEST_PROJECT,
        description: 'a'.repeat(1000),
        memberIds: Array(50).fill(null).map((_, i) => `member-${i}`)
      };

      const startTime = Date.now();
      
      await request
        .post(API_BASE_PATH)
        .set('Authorization', AUTH_TOKEN)
        .send(largeProject)
        .expect(HttpStatusCodes.CREATED);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should efficiently handle bulk operations', async () => {
      const projects = Array(10).fill(null).map((_, i) => ({
        ...TEST_PROJECT,
        name: `Bulk Project ${i}`
      }));

      const startTime = Date.now();
      
      await Promise.all(
        projects.map(project =>
          request
            .post(API_BASE_PATH)
            .set('Authorization', AUTH_TOKEN)
            .send(project)
        )
      );

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });
});