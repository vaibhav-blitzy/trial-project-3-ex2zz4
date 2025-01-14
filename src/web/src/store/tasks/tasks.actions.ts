/**
 * Task Management Redux Actions
 * Implements comprehensive task management operations with optimistic updates,
 * caching, error handling, and real-time support.
 * @version 1.0.0
 */

import { createAsyncThunk } from '@reduxjs/toolkit'; // ^1.9.0
import { debounce } from 'lodash'; // ^4.17.21

import { TaskService } from '../../services/task.service';
import {
  TaskState,
  FetchTasksPayload,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskFilter
} from './tasks.types';
import { ITask } from '../../interfaces/task.interface';

// Initialize TaskService singleton
const taskService = new TaskService();

// Cache duration in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Maximum number of retry attempts
const MAX_RETRIES = 3;

/**
 * Fetches tasks with caching, filtering, and real-time updates
 */
export const fetchTasks = createAsyncThunk<ITask[], FetchTasksPayload>(
  'tasks/fetchTasks',
  async (payload, { rejectWithValue, getState }) => {
    try {
      const { filters, pagination } = payload;
      const state = getState() as { tasks: TaskState };
      const lastUpdated = state.tasks.lastUpdated;

      // Check if cache is still valid
      if (lastUpdated && Date.now() - lastUpdated < CACHE_TTL) {
        return state.tasks.tasks;
      }

      const tasks = await taskService.getTasks({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });

      // Subscribe to real-time updates for fetched tasks
      tasks.forEach(task => {
        taskService.subscribeToTaskUpdates(task.id);
      });

      return tasks;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Fetches a single task by ID with cache support
 */
export const fetchTaskById = createAsyncThunk<ITask, string>(
  'tasks/fetchTaskById',
  async (taskId, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { tasks: TaskState };
      const cachedTask = state.tasks.tasks.find(task => task.id === taskId);

      if (cachedTask) {
        return cachedTask;
      }

      const task = await taskService.getTaskById(taskId);
      taskService.subscribeToTaskUpdates(taskId);
      return task;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Creates a new task with optimistic updates and real-time notification
 */
export const createTask = createAsyncThunk<ITask, CreateTaskPayload>(
  'tasks/createTask',
  async (payload, { rejectWithValue, dispatch }) => {
    try {
      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticTask: ITask = {
        id: tempId,
        ...payload,
        status: 'TODO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Apply optimistic update
      dispatch({ type: 'tasks/addTask', payload: optimisticTask });

      const createdTask = await taskService.createTask(payload);
      taskService.subscribeToTaskUpdates(createdTask.id);

      // Replace temporary task with actual task
      dispatch({ type: 'tasks/replaceTask', payload: { 
        oldId: tempId, 
        newTask: createdTask 
      }});

      return createdTask;
    } catch (error) {
      // Revert optimistic update on error
      dispatch({ type: 'tasks/removeTask', payload: `temp-${Date.now()}` });
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Updates a task with optimistic updates and conflict resolution
 */
export const updateTask = createAsyncThunk<ITask, UpdateTaskPayload>(
  'tasks/updateTask',
  async (payload, { rejectWithValue, dispatch, getState }) => {
    const { id, updates } = payload;
    const state = getState() as { tasks: TaskState };
    const currentTask = state.tasks.tasks.find(task => task.id === id);

    if (!currentTask) {
      return rejectWithValue('Task not found');
    }

    try {
      // Apply optimistic update
      const optimisticTask = { ...currentTask, ...updates };
      dispatch({ type: 'tasks/updateTaskOptimistic', payload: optimisticTask });

      const updatedTask = await taskService.updateTask(id, updates);

      // Handle concurrent update conflicts
      if (updatedTask.updatedAt !== optimisticTask.updatedAt) {
        dispatch({ type: 'tasks/updateTaskConflict', payload: updatedTask });
      }

      return updatedTask;
    } catch (error) {
      // Revert optimistic update on error
      dispatch({ type: 'tasks/updateTaskOptimistic', payload: currentTask });
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Deletes a task with optimistic removal
 */
export const deleteTask = createAsyncThunk<void, string>(
  'tasks/deleteTask',
  async (taskId, { rejectWithValue, dispatch, getState }) => {
    const state = getState() as { tasks: TaskState };
    const taskToDelete = state.tasks.tasks.find(task => task.id === taskId);

    if (!taskToDelete) {
      return rejectWithValue('Task not found');
    }

    try {
      // Apply optimistic removal
      dispatch({ type: 'tasks/removeTask', payload: taskId });

      await taskService.deleteTask(taskId);

      // Clean up subscriptions and cache
      taskService.unsubscribeFromTaskUpdates(taskId);
    } catch (error) {
      // Revert optimistic removal on error
      dispatch({ type: 'tasks/addTask', payload: taskToDelete });
      return rejectWithValue((error as Error).message);
    }
  }
);

// Debounced task search to prevent excessive API calls
export const debouncedSearchTasks = debounce(
  (dispatch: any, filters: TaskFilter) => {
    dispatch(fetchTasks({ filters, pagination: { page: 1, limit: 10 } }));
  },
  500,
  { leading: true, trailing: true }
);