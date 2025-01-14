/**
 * Tasks Reducer
 * Implements comprehensive task state management with optimistic updates,
 * caching, real-time sync, and advanced filtering capabilities.
 * @version 1.0.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.0
import { 
  TaskState, 
  DEFAULT_TASK_FILTERS, 
  INITIAL_TASK_STATE,
  UpdateFiltersPayload,
  TaskFilter,
  SelectTaskPayload,
  BulkTaskActionPayload
} from './tasks.types';
import { 
  fetchTasks, 
  fetchTaskById, 
  createTask, 
  updateTask, 
  deleteTask 
} from './tasks.actions';
import { ITask, TaskStatus, TaskPriority } from '../../interfaces/task.interface';

/**
 * Tasks slice with comprehensive state management
 */
const tasksSlice = createSlice({
  name: 'tasks',
  initialState: INITIAL_TASK_STATE,
  reducers: {
    // Synchronous action for task selection
    setSelectedTask: (state, action: PayloadAction<SelectTaskPayload>) => {
      state.selectedTask = state.tasks.find(task => task.id === action.payload.taskId) || null;
    },

    // Clear selected task
    clearSelectedTask: (state) => {
      state.selectedTask = null;
    },

    // Update task filters with validation
    setFilters: (state, action: PayloadAction<UpdateFiltersPayload>) => {
      state.filters = {
        ...state.filters,
        ...action.payload.filters,
      };
      // Reset pagination when filters change
      state.pagination.cursor = null;
      state.pagination.hasMore = true;
    },

    // Reset filters to default
    clearFilters: (state) => {
      state.filters = DEFAULT_TASK_FILTERS;
      state.pagination.cursor = null;
      state.pagination.hasMore = true;
    },

    // Update cache settings
    updateCache: (state, action: PayloadAction<{ ttl: number }>) => {
      state.cache.ttl = action.payload.ttl;
      state.cache.lastUpdated = Date.now();
    },

    // Handle WebSocket task updates
    handleWebSocketUpdate: (state, action: PayloadAction<ITask>) => {
      const index = state.tasks.findIndex(task => task.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
        if (state.selectedTask?.id === action.payload.id) {
          state.selectedTask = action.payload;
        }
      }
    },

    // Bulk task operations
    bulkUpdateTasks: (state, action: PayloadAction<BulkTaskActionPayload>) => {
      const { taskIds, action: bulkAction } = action.payload;
      switch (bulkAction) {
        case 'delete':
          state.tasks = state.tasks.filter(task => !taskIds.includes(task.id));
          break;
        case 'archive':
          state.tasks = state.tasks.map(task => 
            taskIds.includes(task.id) ? { ...task, status: TaskStatus.DONE } : task
          );
          break;
        case 'restore':
          state.tasks = state.tasks.map(task => 
            taskIds.includes(task.id) ? { ...task, status: TaskStatus.TODO } : task
          );
          break;
      }
    }
  },
  extraReducers: (builder) => {
    // Fetch tasks handling
    builder.addCase(fetchTasks.pending, (state) => {
      state.loading.tasks = true;
      state.error = null;
    });
    builder.addCase(fetchTasks.fulfilled, (state, action) => {
      state.loading.tasks = false;
      state.tasks = action.payload;
      state.cache.lastUpdated = Date.now();
      state.error = null;
    });
    builder.addCase(fetchTasks.rejected, (state, action) => {
      state.loading.tasks = false;
      state.error = action.error.message || 'Failed to fetch tasks';
    });

    // Fetch single task handling
    builder.addCase(fetchTaskById.pending, (state) => {
      state.loading.selectedTask = true;
      state.error = null;
    });
    builder.addCase(fetchTaskById.fulfilled, (state, action) => {
      state.loading.selectedTask = false;
      state.selectedTask = action.payload;
      // Update task in list if exists
      const index = state.tasks.findIndex(task => task.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
      state.error = null;
    });
    builder.addCase(fetchTaskById.rejected, (state, action) => {
      state.loading.selectedTask = false;
      state.error = action.error.message || 'Failed to fetch task';
    });

    // Create task handling with optimistic update
    builder.addCase(createTask.pending, (state) => {
      state.loading.create = true;
      state.error = null;
    });
    builder.addCase(createTask.fulfilled, (state, action) => {
      state.loading.create = false;
      // Replace temporary task with actual task
      state.tasks = state.tasks.map(task => 
        task.id === `temp-${action.meta.requestId}` ? action.payload : task
      );
      state.error = null;
    });
    builder.addCase(createTask.rejected, (state, action) => {
      state.loading.create = false;
      // Remove temporary task on failure
      state.tasks = state.tasks.filter(task => 
        task.id !== `temp-${action.meta.requestId}`
      );
      state.error = action.error.message || 'Failed to create task';
    });

    // Update task handling with optimistic update
    builder.addCase(updateTask.pending, (state, action) => {
      state.loading.update = true;
      state.error = null;
      // Store original task for rollback
      state.cache.data[action.meta.requestId] = state.tasks.find(
        task => task.id === action.meta.arg.id
      );
    });
    builder.addCase(updateTask.fulfilled, (state, action) => {
      state.loading.update = false;
      state.tasks = state.tasks.map(task => 
        task.id === action.payload.id ? action.payload : task
      );
      if (state.selectedTask?.id === action.payload.id) {
        state.selectedTask = action.payload;
      }
      // Clear cached original
      delete state.cache.data[action.meta.requestId];
      state.error = null;
    });
    builder.addCase(updateTask.rejected, (state, action) => {
      state.loading.update = false;
      // Rollback to original on failure
      const original = state.cache.data[action.meta.requestId];
      if (original) {
        state.tasks = state.tasks.map(task => 
          task.id === original.id ? original : task
        );
        if (state.selectedTask?.id === original.id) {
          state.selectedTask = original;
        }
        delete state.cache.data[action.meta.requestId];
      }
      state.error = action.error.message || 'Failed to update task';
    });

    // Delete task handling with optimistic update
    builder.addCase(deleteTask.pending, (state, action) => {
      state.loading.delete = true;
      state.error = null;
      // Store deleted task for rollback
      state.cache.data[action.meta.requestId] = state.tasks.find(
        task => task.id === action.meta.arg
      );
      // Optimistically remove task
      state.tasks = state.tasks.filter(task => task.id !== action.meta.arg);
      if (state.selectedTask?.id === action.meta.arg) {
        state.selectedTask = null;
      }
    });
    builder.addCase(deleteTask.fulfilled, (state, action) => {
      state.loading.delete = false;
      // Clear cached deleted task
      delete state.cache.data[action.meta.requestId];
      state.error = null;
    });
    builder.addCase(deleteTask.rejected, (state, action) => {
      state.loading.delete = false;
      // Restore deleted task on failure
      const deletedTask = state.cache.data[action.meta.requestId];
      if (deletedTask) {
        state.tasks.push(deletedTask);
        delete state.cache.data[action.meta.requestId];
      }
      state.error = action.error.message || 'Failed to delete task';
    });
  }
});

// Export actions
export const { 
  setSelectedTask, 
  clearSelectedTask, 
  setFilters, 
  clearFilters, 
  updateCache,
  handleWebSocketUpdate,
  bulkUpdateTasks
} = tasksSlice.actions;

// Export reducer
export default tasksSlice.reducer;