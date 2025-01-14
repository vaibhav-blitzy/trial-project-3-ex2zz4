/**
 * @fileoverview Enhanced Task Controller implementing comprehensive task management
 * with validation, authorization, rate limiting, caching, and real-time updates.
 * @version 1.0.0
 */

import { Controller, UseGuards, UseInterceptors, UseFilters } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express'; // v4.18.0
import { RateLimit } from 'express-rate-limit'; // v6.7.0
import { CircuitBreaker } from 'opossum'; // v7.1.0
import { Cache } from 'cache-manager'; // v5.2.0
import { WebSocketGateway } from '@nestjs/websockets'; // v9.0.0

import { TaskService } from '../services/task.service';
import { validateCreateTask, validateUpdateTask } from '../validators/task.validator';
import { ITask, TaskStatus, TaskPriority } from '../../../../shared/interfaces/task.interface';
import { AuthGuard } from '../../../../shared/guards/auth.guard';
import { RoleGuard } from '../../../../shared/guards/role.guard';
import { CacheInterceptor } from '../../../../shared/interceptors/cache.interceptor';
import { HttpExceptionFilter } from '../../../../shared/filters/http-exception.filter';
import { Logger } from '../../../../shared/utils/logger.util';
import { ErrorCodes } from '../../../../shared/constants/error-codes';

// Constants
const CACHE_TTL = 300; // 5 minutes
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100;
const CIRCUIT_BREAKER_TIMEOUT = 3000; // 3 seconds

@Controller('tasks')
@UseGuards(AuthGuard)
@UseInterceptors(CacheInterceptor)
@UseFilters(HttpExceptionFilter)
export class TaskController {
  private readonly logger: Logger;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly taskService: TaskService,
    private readonly wsGateway: WebSocketGateway,
    private readonly cache: Cache
  ) {
    this.logger = Logger.getInstance('TaskController', {
      enableConsole: true,
      enableFile: true
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(async (operation: () => Promise<any>) => {
      return await operation();
    }, {
      timeout: CIRCUIT_BREAKER_TIMEOUT,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });

    this.setupCircuitBreakerEvents();
  }

  /**
   * Sets up circuit breaker event handlers
   */
  private setupCircuitBreakerEvents(): void {
    this.circuitBreaker.on('open', () => {
      this.logger.error('Task service circuit breaker opened', {
        code: ErrorCodes.SYSTEM_ERROR
      });
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.info('Task service circuit breaker half-opened');
    });

    this.circuitBreaker.on('close', () => {
      this.logger.info('Task service circuit breaker closed');
    });
  }

  /**
   * Creates a new task with validation and real-time updates
   */
  @Post()
  @UseGuards(RoleGuard)
  @RateLimit({ windowMs: RATE_LIMIT_WINDOW, max: RATE_LIMIT_MAX })
  public async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskData = req.body;
      const userId = req.user.id;

      // Validate task data
      const validationResult = await validateCreateTask(taskData, this.cache);
      if (validationResult.error) {
        throw new Error(ErrorCodes.INVALID_INPUT_FORMAT.toString());
      }

      // Create task using circuit breaker
      const task = await this.circuitBreaker.fire(async () => {
        return await this.taskService.createTask(taskData, userId);
      });

      // Cache the new task
      await this.cache.set(`task:${task.id}`, task, CACHE_TTL);

      // Emit real-time update
      this.wsGateway.server.emit('taskCreated', {
        taskId: task.id,
        projectId: task.projectId
      });

      // Log audit trail
      await this.logger.audit('Task created', {
        resourceId: task.id,
        userId,
        action: 'CREATE'
      });

      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates existing task with validation and conflict detection
   */
  @Put('/:id')
  @UseGuards(RoleGuard)
  @RateLimit({ windowMs: RATE_LIMIT_WINDOW, max: RATE_LIMIT_MAX })
  public async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = req.params.id;
      const taskData = req.body;
      const userId = req.user.id;

      // Validate update data
      const validationResult = await validateUpdateTask(taskData, this.cache);
      if (validationResult.error) {
        throw new Error(ErrorCodes.INVALID_INPUT_FORMAT.toString());
      }

      // Update task using circuit breaker
      const updatedTask = await this.circuitBreaker.fire(async () => {
        return await this.taskService.updateTask(taskId, taskData, userId);
      });

      // Invalidate cache
      await this.cache.del(`task:${taskId}`);

      // Emit real-time update
      this.wsGateway.server.emit('taskUpdated', {
        taskId,
        projectId: updatedTask.projectId,
        changes: taskData
      });

      // Log audit trail
      await this.logger.audit('Task updated', {
        resourceId: taskId,
        userId,
        action: 'UPDATE'
      });

      res.json(updatedTask);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves task by ID with caching
   */
  @Get('/:id')
  @UseGuards(RoleGuard)
  @RateLimit({ windowMs: RATE_LIMIT_WINDOW, max: RATE_LIMIT_MAX })
  public async getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = req.params.id;

      // Check cache first
      const cachedTask = await this.cache.get(`task:${taskId}`);
      if (cachedTask) {
        res.json(cachedTask);
        return;
      }

      // Fetch task using circuit breaker
      const task = await this.circuitBreaker.fire(async () => {
        return await this.taskService.getTaskById(taskId);
      });

      if (!task) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      // Cache the task
      await this.cache.set(`task:${taskId}`, task, CACHE_TTL);

      res.json(task);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes task with authorization check
   */
  @Delete('/:id')
  @UseGuards(RoleGuard)
  @RateLimit({ windowMs: RATE_LIMIT_WINDOW, max: RATE_LIMIT_MAX })
  public async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = req.params.id;
      const userId = req.user.id;

      // Delete task using circuit breaker
      await this.circuitBreaker.fire(async () => {
        return await this.taskService.deleteTask(taskId, userId);
      });

      // Invalidate cache
      await this.cache.del(`task:${taskId}`);

      // Emit real-time update
      this.wsGateway.server.emit('taskDeleted', {
        taskId
      });

      // Log audit trail
      await this.logger.audit('Task deleted', {
        resourceId: taskId,
        userId,
        action: 'DELETE'
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves tasks by project with filtering and pagination
   */
  @Get('/project/:projectId')
  @UseGuards(RoleGuard)
  @RateLimit({ windowMs: RATE_LIMIT_WINDOW, max: RATE_LIMIT_MAX })
  public async getProjectTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const { status, priority, page, limit } = req.query;

      // Check cache first
      const cacheKey = `project:${projectId}:tasks:${JSON.stringify(req.query)}`;
      const cachedTasks = await this.cache.get(cacheKey);
      if (cachedTasks) {
        res.json(cachedTasks);
        return;
      }

      // Fetch tasks using circuit breaker
      const tasks = await this.circuitBreaker.fire(async () => {
        return await this.taskService.getProjectTasks(projectId, {
          status: status as TaskStatus,
          priority: priority as TaskPriority,
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        });
      });

      // Cache the results
      await this.cache.set(cacheKey, tasks, CACHE_TTL);

      res.json(tasks);
    } catch (error) {
      next(error);
    }
  }
}

export default TaskController;