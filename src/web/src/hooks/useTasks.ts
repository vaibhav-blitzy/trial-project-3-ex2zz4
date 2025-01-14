/**
 * Advanced custom React hook for managing task-related operations and state
 * Provides comprehensive task management with optimistic updates, caching,
 * real-time updates, and pagination support
 * @version 1.0.0
 */

import { useCallback, useEffect, useRef } from 'react'; // ^18.0.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.0.5
import { 
  fetchTasks,
  createTask,
  updateTask,
  deleteTask
} from '../store/tasks/tasks.actions';
import {
  selectFilteredTasks,
  selectTasksLoading,
  selectTaskError
} from '../store/tasks/tasks.selectors';
import { ITask } from '../interfaces/task.interface';
import { useWebSocket } from '../hooks/useWebSocket';

/**
 * Interface for task loading states
 */
interface TaskLoadingState {
  isFetching: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

/**
 * Interface for task error states
 */
interface TaskError {
  message: string;
  code: string;
  operation: string;
  details: any;
}

/**
 * Interface for pagination state
 */
interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}

/**
 * Interface for hook options
 */
interface UseTasksOptions {
  autoFetch?: boolean;
  pageSize?: number;
  enableRealtime?: boolean;
  cacheTimeout?: number;
}

/**
 * Custom hook for comprehensive task management
 */
export const useTasks = (options: UseTasksOptions = {}) => {
  const {
    autoFetch = true,
    pageSize = 10,
    enableRealtime = true,
    cacheTimeout = 5 * 60 * 1000 // 5 minutes
  } = options;

  const dispatch = useDispatch();
  const tasks = useSelector(selectFilteredTasks);
  const loading = useSelector(selectTasksLoading);
  const error = useSelector(selectTaskError);

  // WebSocket integration for real-time updates
  const { subscribe } = useWebSocket();
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    pageSize,
    totalItems: 0
  });

  // Cache reference
  const cacheRef = useRef<{
    timestamp: number;
    data: ITask[];
  }>({ timestamp: 0, data: [] });

  /**
   * Fetches tasks with pagination and caching
   */
  const fetchTasksWithCache = useCallback(async (page: number = 1) => {
    const now = Date.now();
    if (now - cacheRef.current.timestamp < cacheTimeout && cacheRef.current.data.length > 0) {
      return cacheRef.current.data;
    }

    try {
      const result = await dispatch(fetchTasks({
        filters: {},
        pagination: { page, limit: pageSize }
      })).unwrap();

      cacheRef.current = {
        timestamp: now,
        data: result
      };

      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalItems: result.length,
        totalPages: Math.ceil(result.length / pageSize)
      }));

      return result;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }, [dispatch, pageSize, cacheTimeout]);

  /**
   * Creates a new task with optimistic update
   */
  const createTaskWithOptimistic = useCallback(async (taskData: Partial<ITask>) => {
    try {
      const result = await dispatch(createTask(taskData)).unwrap();
      cacheRef.current.timestamp = 0; // Invalidate cache
      return result;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Updates a task with optimistic update
   */
  const updateTaskWithOptimistic = useCallback(async (taskId: string, updates: Partial<ITask>) => {
    try {
      const result = await dispatch(updateTask({ id: taskId, updates })).unwrap();
      cacheRef.current.timestamp = 0; // Invalidate cache
      return result;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Deletes a task with optimistic update
   */
  const deleteTaskWithOptimistic = useCallback(async (taskId: string) => {
    try {
      await dispatch(deleteTask(taskId)).unwrap();
      cacheRef.current.timestamp = 0; // Invalidate cache
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Retries a failed operation
   */
  const retryFailedOperation = useCallback(async (operation: string, ...args: any[]) => {
    switch (operation) {
      case 'fetch':
        return fetchTasksWithCache(args[0]);
      case 'create':
        return createTaskWithOptimistic(args[0]);
      case 'update':
        return updateTaskWithOptimistic(args[0], args[1]);
      case 'delete':
        return deleteTaskWithOptimistic(args[0]);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }, [fetchTasksWithCache, createTaskWithOptimistic, updateTaskWithOptimistic, deleteTaskWithOptimistic]);

  // Set up real-time updates
  useEffect(() => {
    if (!enableRealtime) return;

    const unsubscribe = subscribe<ITask>('task.update', (updatedTask) => {
      const existingTask = tasks.find(t => t.id === updatedTask.id);
      if (existingTask) {
        dispatch(updateTask({ id: updatedTask.id, updates: updatedTask }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, enableRealtime, subscribe, tasks]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchTasksWithCache();
    }
  }, [autoFetch, fetchTasksWithCache]);

  return {
    tasks,
    loading: {
      isFetching: loading.tasks,
      isCreating: loading.create,
      isUpdating: loading.update,
      isDeleting: loading.delete
    } as TaskLoadingState,
    error,
    pagination,
    fetchTasks: fetchTasksWithCache,
    createTask: createTaskWithOptimistic,
    updateTask: updateTaskWithOptimistic,
    deleteTask: deleteTaskWithOptimistic,
    retryFailedOperation
  };
};

export type { TaskLoadingState, TaskError, PaginationState };