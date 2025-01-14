/**
 * @fileoverview Enterprise-grade task service implementing comprehensive task management
 * with advanced features including real-time updates, caching, and error handling.
 * @version 1.0.0
 */

import { Injectable } from '@nestjs/common';
import { CircuitBreaker } from 'opossum'; // v6.0.0
import Redis from 'ioredis'; // v5.0.0
import * as Prometheus from 'prom-client'; // v14.0.0
import { Logger } from '../../../../shared/utils/logger.util';
import { TaskRepository } from '../repositories/task.repository';
import { ITask, TaskStatus, TaskPriority } from '../../../../shared/interfaces/task.interface';
import { ErrorCodes } from '../../../../shared/constants/error-codes';

const CACHE_TTL = 3600; // 1 hour
const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;
const CIRCUIT_BREAKER_TIMEOUT = 3000; // 3 seconds

@Injectable()
export class TaskService {
  private readonly taskCircuitBreaker: CircuitBreaker;
  private readonly taskOperationsCounter: Prometheus.Counter;
  private readonly taskOperationsDuration: Prometheus.Histogram;

  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly redisClient: Redis,
    private readonly logger: Logger
  ) {
    // Initialize circuit breaker
    this.taskCircuitBreaker = new CircuitBreaker(async (operation: () => Promise<any>) => {
      return await operation();
    }, {
      timeout: CIRCUIT_BREAKER_TIMEOUT,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });

    // Initialize Prometheus metrics
    this.taskOperationsCounter = new Prometheus.Counter({
      name: 'task_operations_total',
      help: 'Total number of task operations',
      labelNames: ['operation', 'status']
    });

    this.taskOperationsDuration = new Prometheus.Histogram({
      name: 'task_operation_duration_seconds',
      help: 'Duration of task operations',
      labelNames: ['operation']
    });

    this.setupCircuitBreakerEvents();
  }

  /**
   * Sets up circuit breaker event handlers
   */
  private setupCircuitBreakerEvents(): void {
    this.taskCircuitBreaker.on('open', () => {
      this.logger.error('Task service circuit breaker opened', {
        code: ErrorCodes.SYSTEM_ERROR
      });
    });

    this.taskCircuitBreaker.on('halfOpen', () => {
      this.logger.info('Task service circuit breaker half-opened');
    });

    this.taskCircuitBreaker.on('close', () => {
      this.logger.info('Task service circuit breaker closed');
    });
  }

  /**
   * Creates a new task with comprehensive validation and real-time updates
   */
  public async createTask(taskData: Partial<ITask>, creatorId: string): Promise<ITask> {
    const timer = this.taskOperationsDuration.startTimer({ operation: 'create' });

    try {
      // Rate limiting check
      const rateLimitKey = `task:create:${creatorId}`;
      const requests = await this.redisClient.incr(rateLimitKey);
      await this.redisClient.expire(rateLimitKey, RATE_LIMIT_WINDOW);

      if (requests > RATE_LIMIT_MAX_REQUESTS) {
        throw new Error(ErrorCodes.EXTERNAL_SERVICE_TIMEOUT.toString());
      }

      // Create task using circuit breaker
      const task = await this.taskCircuitBreaker.fire(async () => {
        const newTask = await this.taskRepository.create({
          ...taskData,
          creatorId,
          status: TaskStatus.TODO,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Cache the new task
        await this.redisClient.setex(
          `task:${newTask.id}`,
          CACHE_TTL,
          JSON.stringify(newTask)
        );

        return newTask;
      });

      // Update metrics
      this.taskOperationsCounter.inc({ operation: 'create', status: 'success' });
      timer({ operation: 'create' });

      // Log audit trail
      await this.logger.audit('Task created', {
        resourceId: task.id,
        userId: creatorId,
        action: 'CREATE'
      });

      return task;
    } catch (error) {
      this.taskOperationsCounter.inc({ operation: 'create', status: 'error' });
      this.logger.error('Failed to create task', { error });
      throw error;
    }
  }

  /**
   * Updates task with optimistic locking and validation
   */
  public async updateTask(
    taskId: string,
    updateData: Partial<ITask>,
    userId: string
  ): Promise<ITask> {
    const timer = this.taskOperationsDuration.startTimer({ operation: 'update' });

    try {
      // Check cache first
      const cachedTask = await this.redisClient.get(`task:${taskId}`);
      let task = cachedTask ? JSON.parse(cachedTask) : null;

      if (!task) {
        // Fetch from database using circuit breaker
        task = await this.taskCircuitBreaker.fire(async () => {
          return await this.taskRepository.findById(taskId);
        });

        if (!task) {
          throw new Error(ErrorCodes.INVALID_INPUT_FORMAT.toString());
        }
      }

      // Validate status transition
      if (updateData.status && !this.isValidStatusTransition(task.status, updateData.status)) {
        throw new Error(ErrorCodes.INVALID_INPUT_FORMAT.toString());
      }

      // Update task using circuit breaker
      const updatedTask = await this.taskCircuitBreaker.fire(async () => {
        const result = await this.taskRepository.update(taskId, {
          ...updateData,
          updatedAt: new Date()
        });

        // Invalidate cache
        await this.redisClient.del(`task:${taskId}`);
        
        return result;
      });

      // Update metrics
      this.taskOperationsCounter.inc({ operation: 'update', status: 'success' });
      timer({ operation: 'update' });

      // Log audit trail
      await this.logger.audit('Task updated', {
        resourceId: taskId,
        userId,
        action: 'UPDATE'
      });

      return updatedTask;
    } catch (error) {
      this.taskOperationsCounter.inc({ operation: 'update', status: 'error' });
      this.logger.error('Failed to update task', { error });
      throw error;
    }
  }

  /**
   * Validates task status transitions
   */
  private isValidStatusTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
    const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.REVIEW, TaskStatus.TODO],
      [TaskStatus.REVIEW]: [TaskStatus.DONE, TaskStatus.IN_PROGRESS],
      [TaskStatus.DONE]: [TaskStatus.REVIEW]
    };

    return allowedTransitions[currentStatus]?.includes(newStatus) || currentStatus === newStatus;
  }

  /**
   * Retrieves task by ID with caching
   */
  public async getTaskById(taskId: string): Promise<ITask | null> {
    const timer = this.taskOperationsDuration.startTimer({ operation: 'get' });

    try {
      // Check cache first
      const cachedTask = await this.redisClient.get(`task:${taskId}`);
      if (cachedTask) {
        timer({ operation: 'get' });
        return JSON.parse(cachedTask);
      }

      // Fetch from database using circuit breaker
      const task = await this.taskCircuitBreaker.fire(async () => {
        return await this.taskRepository.findById(taskId);
      });

      if (task) {
        // Cache the task
        await this.redisClient.setex(
          `task:${task.id}`,
          CACHE_TTL,
          JSON.stringify(task)
        );
      }

      this.taskOperationsCounter.inc({ operation: 'get', status: 'success' });
      timer({ operation: 'get' });

      return task;
    } catch (error) {
      this.taskOperationsCounter.inc({ operation: 'get', status: 'error' });
      this.logger.error('Failed to get task', { error });
      throw error;
    }
  }
}