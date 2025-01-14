/**
 * Task Service
 * Provides comprehensive task management functionality with real-time updates,
 * caching, and enhanced error handling capabilities.
 * @version 1.0.0
 */

import { injectable } from 'inversify';
import { Subject } from 'rxjs';
import CircuitBreaker from 'opossum'; // ^7.0.0
import axiosRetry from 'axios-retry'; // ^3.5.0
import { CacheService } from '@nestjs/cache-manager'; // ^2.0.0
import WebSocket from 'ws'; // ^8.0.0

import { ApiService } from './api.service';
import { 
  ITask, 
  TaskStatus, 
  TaskPriority, 
  ITaskComment, 
  ITaskActivity,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskFilter
} from '../interfaces/task.interface';
import { API_ENDPOINTS } from '../constants/api.constants';

// Constants for configuration
const TASKS_ENDPOINT = API_ENDPOINTS.TASKS.BASE;
const CACHE_TTL = 300000; // 5 minutes
const RETRY_ATTEMPTS = 3;
const CIRCUIT_BREAKER_OPTIONS = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

@injectable()
export class TaskService {
  private readonly taskUpdates$ = new Subject<ITask>();
  private readonly wsClient: WebSocket;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly apiService: ApiService,
    private readonly cacheService: CacheService
  ) {
    // Initialize WebSocket connection for real-time updates
    this.wsClient = new WebSocket(`${process.env.REACT_APP_WS_URL}/tasks`);
    this.setupWebSocket();

    // Configure circuit breaker for API calls
    this.circuitBreaker = new CircuitBreaker(this.makeRequest.bind(this), CIRCUIT_BREAKER_OPTIONS);
    
    // Configure retry strategy
    axiosRetry(this.apiService, {
      retries: RETRY_ATTEMPTS,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => axiosRetry.isNetworkOrIdempotentRequestError(error)
    });
  }

  /**
   * Retrieves tasks with filtering, caching, and real-time updates
   * @param filters Task filter criteria
   * @returns Promise resolving to filtered task list
   */
  public async getTasks(filters: TaskFilter = {}): Promise<ITask[]> {
    const cacheKey = `tasks:${JSON.stringify(filters)}`;
    
    try {
      // Check cache first
      const cachedTasks = await this.cacheService.get<ITask[]>(cacheKey);
      if (cachedTasks) {
        return cachedTasks;
      }

      // Fetch tasks through circuit breaker
      const response = await this.circuitBreaker.fire(() => 
        this.apiService.get<ITask[]>(TASKS_ENDPOINT, filters)
      );

      if (response.success) {
        await this.cacheService.set(cacheKey, response.data, CACHE_TTL);
        return response.data;
      }

      throw new Error(response.error || 'Failed to fetch tasks');
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  /**
   * Creates a new task with real-time notification
   * @param taskData Task creation payload
   * @returns Promise resolving to created task
   */
  public async createTask(taskData: CreateTaskPayload): Promise<ITask> {
    try {
      const response = await this.circuitBreaker.fire(() =>
        this.apiService.post<ITask>(TASKS_ENDPOINT, taskData)
      );

      if (response.success) {
        this.invalidateTasksCache();
        this.taskUpdates$.next(response.data);
        return response.data;
      }

      throw new Error(response.error || 'Failed to create task');
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Updates an existing task with real-time notification
   * @param taskId Task identifier
   * @param updateData Task update payload
   * @returns Promise resolving to updated task
   */
  public async updateTask(taskId: string, updateData: UpdateTaskPayload): Promise<ITask> {
    try {
      const response = await this.circuitBreaker.fire(() =>
        this.apiService.put<ITask>(`${TASKS_ENDPOINT}/${taskId}`, updateData)
      );

      if (response.success) {
        this.invalidateTasksCache();
        this.taskUpdates$.next(response.data);
        return response.data;
      }

      throw new Error(response.error || 'Failed to update task');
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Deletes a task with cache invalidation
   * @param taskId Task identifier
   * @returns Promise resolving to deletion status
   */
  public async deleteTask(taskId: string): Promise<boolean> {
    try {
      const response = await this.circuitBreaker.fire(() =>
        this.apiService.delete(`${TASKS_ENDPOINT}/${taskId}`)
      );

      if (response.success) {
        this.invalidateTasksCache();
        return true;
      }

      throw new Error(response.error || 'Failed to delete task');
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Retrieves task comments with caching
   * @param taskId Task identifier
   * @returns Promise resolving to task comments
   */
  public async getTaskComments(taskId: string): Promise<ITaskComment[]> {
    const cacheKey = `task:${taskId}:comments`;

    try {
      const cachedComments = await this.cacheService.get<ITaskComment[]>(cacheKey);
      if (cachedComments) {
        return cachedComments;
      }

      const response = await this.circuitBreaker.fire(() =>
        this.apiService.get<ITaskComment[]>(`${TASKS_ENDPOINT}/${taskId}/comments`)
      );

      if (response.success) {
        await this.cacheService.set(cacheKey, response.data, CACHE_TTL);
        return response.data;
      }

      throw new Error(response.error || 'Failed to fetch task comments');
    } catch (error) {
      console.error('Error fetching task comments:', error);
      throw error;
    }
  }

  /**
   * Retrieves task activity history
   * @param taskId Task identifier
   * @returns Promise resolving to task activities
   */
  public async getTaskActivity(taskId: string): Promise<ITaskActivity[]> {
    try {
      const response = await this.circuitBreaker.fire(() =>
        this.apiService.get<ITaskActivity[]>(`${TASKS_ENDPOINT}/${taskId}/activity`)
      );

      if (response.success) {
        return response.data;
      }

      throw new Error(response.error || 'Failed to fetch task activity');
    } catch (error) {
      console.error('Error fetching task activity:', error);
      throw error;
    }
  }

  /**
   * Returns observable for real-time task updates
   * @returns Subject emitting task updates
   */
  public getTaskUpdates(): Subject<ITask> {
    return this.taskUpdates$;
  }

  /**
   * Sets up WebSocket connection for real-time updates
   */
  private setupWebSocket(): void {
    this.wsClient.onmessage = (event) => {
      try {
        const task = JSON.parse(event.data) as ITask;
        this.taskUpdates$.next(task);
        this.invalidateTasksCache();
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    this.wsClient.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.wsClient.onclose = () => {
      setTimeout(() => this.setupWebSocket(), 5000); // Reconnect after 5 seconds
    };
  }

  /**
   * Invalidates all task-related cache entries
   */
  private async invalidateTasksCache(): Promise<void> {
    try {
      const keys = await this.cacheService.store.keys('tasks:*');
      await Promise.all(keys.map(key => this.cacheService.del(key)));
    } catch (error) {
      console.error('Error invalidating tasks cache:', error);
    }
  }

  /**
   * Makes an API request with error handling
   * @param request API request function
   * @returns Promise resolving to API response
   */
  private async makeRequest<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}

export const taskService = new TaskService(new ApiService(), new CacheService());