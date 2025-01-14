/**
 * Task Management Redux Selectors
 * Implements comprehensive memoized selectors for accessing and computing derived task state
 * with advanced filtering, sorting, and type safety.
 * @version 1.0.0
 */

import { createSelector } from '@reduxjs/toolkit'; // ^1.9.0
import { RootState } from '../index';
import { ITask, TaskStatus, TaskPriority, TaskFilter } from '../../interfaces/task.interface';

/**
 * Base selector to access the tasks slice of the Redux store
 */
export const selectTasksState = (state: RootState) => state.tasks;

/**
 * Memoized selector to get all tasks
 */
export const selectAllTasks = createSelector(
  [selectTasksState],
  (tasksState) => tasksState.tasks
);

/**
 * Memoized selector to get the currently selected task
 */
export const selectSelectedTask = createSelector(
  [selectTasksState],
  (tasksState) => tasksState.selectedTask
);

/**
 * Memoized selector to get loading states
 */
export const selectTaskLoadingStates = createSelector(
  [selectTasksState],
  (tasksState) => tasksState.loading
);

/**
 * Memoized selector to get current task filters
 */
export const selectTaskFilters = createSelector(
  [selectTasksState],
  (tasksState) => tasksState.filters
);

/**
 * Memoized selector to get tasks filtered by current filter criteria
 */
export const selectFilteredTasks = createSelector(
  [selectAllTasks, selectTaskFilters],
  (tasks, filters) => {
    return tasks.filter(task => {
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(task.status)) {
        return false;
      }

      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) {
        return false;
      }

      // Assignee filter
      if (filters.assigneeIds.length > 0 && !task.assigneeIds.some(id => filters.assigneeIds.includes(id))) {
        return false;
      }

      // Project filter
      if (filters.projectId && task.projectId !== filters.projectId) {
        return false;
      }

      // Search query
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        const matchesSearch = task.title.toLowerCase().includes(searchLower) ||
          task.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange.start && new Date(task.dueDate) < new Date(filters.dateRange.start)) {
        return false;
      }
      if (filters.dateRange.end && new Date(task.dueDate) > new Date(filters.dateRange.end)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Apply sorting based on filter criteria
      const field = filters.sortBy.field;
      const order = filters.sortBy.order === 'asc' ? 1 : -1;
      
      if (a[field] < b[field]) return -1 * order;
      if (a[field] > b[field]) return 1 * order;
      return 0;
    });
  }
);

/**
 * Memoized selector to get tasks grouped by status with counts
 */
export const selectTasksByStatus = createSelector(
  [selectFilteredTasks],
  (tasks) => {
    const statusGroups: Record<TaskStatus, { tasks: ITask[]; count: number }> = {
      [TaskStatus.TODO]: { tasks: [], count: 0 },
      [TaskStatus.IN_PROGRESS]: { tasks: [], count: 0 },
      [TaskStatus.REVIEW]: { tasks: [], count: 0 },
      [TaskStatus.DONE]: { tasks: [], count: 0 }
    };

    tasks.forEach(task => {
      statusGroups[task.status].tasks.push(task);
      statusGroups[task.status].count++;
    });

    return statusGroups;
  }
);

/**
 * Memoized selector to get tasks grouped by priority with counts
 */
export const selectTasksByPriority = createSelector(
  [selectFilteredTasks],
  (tasks) => {
    const priorityGroups: Record<TaskPriority, { tasks: ITask[]; count: number }> = {
      [TaskPriority.LOW]: { tasks: [], count: 0 },
      [TaskPriority.MEDIUM]: { tasks: [], count: 0 },
      [TaskPriority.HIGH]: { tasks: [], count: 0 },
      [TaskPriority.URGENT]: { tasks: [], count: 0 }
    };

    tasks.forEach(task => {
      priorityGroups[task.priority].tasks.push(task);
      priorityGroups[task.priority].count++;
    });

    return priorityGroups;
  }
);

/**
 * Memoized selector to get tasks statistics
 */
export const selectTasksStats = createSelector(
  [selectFilteredTasks],
  (tasks) => {
    return {
      total: tasks.length,
      completed: tasks.filter(task => task.status === TaskStatus.DONE).length,
      inProgress: tasks.filter(task => task.status === TaskStatus.IN_PROGRESS).length,
      overdue: tasks.filter(task => new Date(task.dueDate) < new Date()).length,
      highPriority: tasks.filter(task => task.priority === TaskPriority.HIGH || task.priority === TaskPriority.URGENT).length
    };
  }
);

/**
 * Memoized selector to get tasks for a specific assignee
 */
export const selectTasksByAssignee = createSelector(
  [selectFilteredTasks, (_state: RootState, assigneeId: string) => assigneeId],
  (tasks, assigneeId) => tasks.filter(task => task.assigneeIds.includes(assigneeId))
);

/**
 * Memoized selector to get tasks for a specific project
 */
export const selectTasksByProject = createSelector(
  [selectFilteredTasks, (_state: RootState, projectId: string) => projectId],
  (tasks, projectId) => tasks.filter(task => task.projectId === projectId)
);

/**
 * Memoized selector to get error state
 */
export const selectTaskError = createSelector(
  [selectTasksState],
  (tasksState) => tasksState.error
);