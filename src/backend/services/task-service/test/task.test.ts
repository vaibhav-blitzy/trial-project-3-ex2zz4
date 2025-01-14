/**
 * @fileoverview Comprehensive test suite for Task Service microservice
 * implementing unit tests, integration tests, performance benchmarks,
 * and security validations for task management operations.
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'jest';
import supertest from 'supertest';
import { faker } from '@faker-js/faker';
import MockRedis from 'ioredis-mock';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import app from '../src/app';
import { TaskService } from '../src/services/task.service';
import { TaskStatus, TaskPriority } from '../../../shared/interfaces/task.interface';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { HttpStatusCodes } from '../../../shared/constants/status-codes';

// Test context interface
interface TestContext {
  taskService: TaskService;
  redisClient: MockRedis;
  dbContainer: StartedTestContainer;
  testServer: any;
}

// Test constants
const TEST_TIMEOUT = 30000;
const PERFORMANCE_TEST_ITERATIONS = 1000;
const CONCURRENT_USERS = 50;
const RESPONSE_TIME_THRESHOLD = 2000; // 2 seconds

// Test data generators
const generateTaskData = () => ({
  title: faker.lorem.sentence(),
  description: faker.lorem.paragraph(),
  projectId: faker.string.uuid(),
  priority: TaskPriority.HIGH,
  status: TaskStatus.TODO,
  assigneeIds: [faker.string.uuid()],
  dueDate: faker.date.future(),
  tags: [faker.lorem.word(), faker.lorem.word()]
});

/**
 * Sets up test environment with containerized dependencies
 */
async function setupTestEnvironment(): Promise<TestContext> {
  // Start PostgreSQL container
  const dbContainer = await new GenericContainer('postgres:14')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'taskdb_test'
    })
    .withExposedPorts(5432)
    .start();

  // Initialize Redis mock
  const redisClient = new MockRedis();

  // Initialize task service with test configuration
  const taskService = new TaskService(
    redisClient,
    {
      host: dbContainer.getHost(),
      port: dbContainer.getMappedPort(5432),
      database: 'taskdb_test',
      username: 'test',
      password: 'test'
    }
  );

  // Initialize test server
  const testServer = supertest(app);

  return {
    taskService,
    redisClient,
    dbContainer,
    testServer
  };
}

/**
 * Cleans up test environment and resources
 */
async function cleanupTestEnvironment(context: TestContext): Promise<void> {
  await context.redisClient.quit();
  await context.dbContainer.stop();
}

describe('Task Service Integration Tests', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await setupTestEnvironment();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await cleanupTestEnvironment(context);
  });

  beforeEach(async () => {
    await context.redisClient.flushall();
  });

  describe('Task Creation', () => {
    it('should create task with valid data within 2s', async () => {
      const taskData = generateTaskData();
      const startTime = Date.now();

      const response = await context.testServer
        .post('/api/v1/tasks')
        .send(taskData)
        .expect(HttpStatusCodes.CREATED);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(taskData.title);
    });

    it('should enforce data validation rules', async () => {
      const invalidTask = {
        ...generateTaskData(),
        title: ''
      };

      const response = await context.testServer
        .post('/api/v1/tasks')
        .send(invalidTask)
        .expect(HttpStatusCodes.BAD_REQUEST);

      expect(response.body.code).toBe(ErrorCodes.INVALID_INPUT_FORMAT);
    });
  });

  describe('Task Updates', () => {
    it('should handle concurrent task updates', async () => {
      const task = await context.taskService.createTask(generateTaskData(), faker.string.uuid());
      const updates = Array(5).fill(null).map(() => ({
        status: TaskStatus.IN_PROGRESS,
        title: faker.lorem.sentence()
      }));

      const results = await Promise.all(
        updates.map(update => 
          context.testServer
            .put(`/api/v1/tasks/${task.id}`)
            .send(update)
        )
      );

      expect(results.filter(r => r.status === 200)).toHaveLength(1);
      expect(results.filter(r => r.status === 409)).toHaveLength(4);
    });

    it('should maintain data consistency', async () => {
      const task = await context.taskService.createTask(generateTaskData(), faker.string.uuid());
      const update = {
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.URGENT
      };

      await context.testServer
        .put(`/api/v1/tasks/${task.id}`)
        .send(update)
        .expect(HttpStatusCodes.OK);

      const updatedTask = await context.taskService.getTaskById(task.id);
      expect(updatedTask?.status).toBe(update.status);
      expect(updatedTask?.priority).toBe(update.priority);
    });
  });

  describe('Real-time Updates', () => {
    it('should process real-time updates via Redis', async () => {
      const task = await context.taskService.createTask(generateTaskData(), faker.string.uuid());
      const update = { status: TaskStatus.IN_PROGRESS };

      await context.testServer
        .put(`/api/v1/tasks/${task.id}`)
        .send(update);

      const cachedTask = await context.redisClient.get(`task:${task.id}`);
      expect(JSON.parse(cachedTask!).status).toBe(update.status);
    });
  });
});

describe('Task Service Security Tests', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment(context);
  });

  it('should prevent unauthorized operations', async () => {
    const response = await context.testServer
      .post('/api/v1/tasks')
      .send(generateTaskData())
      .set('Authorization', 'invalid-token')
      .expect(HttpStatusCodes.UNAUTHORIZED);

    expect(response.body.code).toBe(ErrorCodes.INVALID_CREDENTIALS);
  });

  it('should handle sensitive data properly', async () => {
    const taskData = {
      ...generateTaskData(),
      sensitiveInfo: 'secret-data'
    };

    const response = await context.testServer
      .post('/api/v1/tasks')
      .send(taskData)
      .expect(HttpStatusCodes.CREATED);

    expect(response.body).not.toHaveProperty('sensitiveInfo');
  });
});

describe('Task Service Performance Tests', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment(context);
  });

  it('should handle high concurrent load', async () => {
    const requests = Array(CONCURRENT_USERS)
      .fill(null)
      .map(() => context.testServer
        .post('/api/v1/tasks')
        .send(generateTaskData())
      );

    const responses = await Promise.all(requests);
    const successfulResponses = responses.filter(r => r.status === HttpStatusCodes.CREATED);
    expect(successfulResponses.length).toBe(CONCURRENT_USERS);
  });

  it('should maintain response times under load', async () => {
    const startTime = Date.now();

    for (let i = 0; i < PERFORMANCE_TEST_ITERATIONS; i++) {
      await context.testServer
        .get('/api/v1/tasks/project/123')
        .query({ page: 1, limit: 10 });
    }

    const averageResponseTime = (Date.now() - startTime) / PERFORMANCE_TEST_ITERATIONS;
    expect(averageResponseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD);
  });
});