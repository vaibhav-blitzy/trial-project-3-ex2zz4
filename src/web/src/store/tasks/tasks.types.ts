/**
 * @fileoverview Type definitions for the tasks Redux store slice
 * Provides comprehensive TypeScript types and interfaces for state management,
 * action payloads, and advanced filtering capabilities
 * @version 1.0.0
 */

import { ITask, TaskPriority, TaskStatus } from '../../interfaces/task.interface';

/**
 * Interface defining the immutable shape of the tasks slice in Redux store
 * Implements strict null checks and type safety for all properties
 */
export interface TaskState {
  readonly tasks: ReadonlyArray<ITask>;
  readonly selectedTask: Readonly<ITask> | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly filters: Readonly<TaskFilters>;
  readonly lastUpdated: number | null;
}

/**
 * Comprehensive interface for type-safe task filtering and sorting options
 * Enables advanced task search and organization capabilities
 */
export interface TaskFilters {
  readonly status: ReadonlyArray<TaskStatus>;
  readonly priority: ReadonlyArray<TaskPriority>;
  readonly assigneeIds: ReadonlyArray<string>;
  readonly projectId: string | null;
  readonly searchQuery: string;
  readonly dateRange: {
    readonly start: string | null;
    readonly end: string | null;
  };
  readonly sortBy: {
    readonly field: keyof ITask;
    readonly order: 'asc' | 'desc';
  };
}

/**
 * Type-safe payload interface for fetching tasks with filtering and pagination
 */
export interface FetchTasksPayload {
  readonly filters: Readonly<TaskFilters>;
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
  };
}

/**
 * Type-safe payload interface for creating new tasks
 * Ensures all required fields are provided with correct types
 */
export interface CreateTaskPayload {
  readonly title: string;
  readonly description: string;
  readonly projectId: string;
  readonly priority: TaskPriority;
  readonly assigneeIds: ReadonlyArray<string>;
  readonly dueDate: string;
  readonly attachments: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly url: string;
  }>;
}

/**
 * Type-safe payload interface for updating existing tasks
 * Supports partial updates with optimistic update flag
 */
export interface UpdateTaskPayload {
  readonly id: string;
  readonly updates: Readonly<Partial<ITask>>;
  readonly optimistic: boolean;
}

/**
 * Type-safe payload interface for bulk task operations
 */
export interface BulkTaskActionPayload {
  readonly taskIds: ReadonlyArray<string>;
  readonly action: 'delete' | 'archive' | 'restore';
}

/**
 * Type-safe payload interface for task selection
 */
export interface SelectTaskPayload {
  readonly taskId: string | null;
}

/**
 * Type-safe payload interface for filter updates
 */
export interface UpdateFiltersPayload {
  readonly filters: Partial<TaskFilters>;
}

/**
 * Type-safe error payload interface
 */
export interface TaskErrorPayload {
  readonly error: string;
  readonly context: 'fetch' | 'create' | 'update' | 'delete' | 'bulk';
}

/**
 * Default values for task filters
 * Provides type-safe initial state for filters
 */
export const DEFAULT_TASK_FILTERS: Readonly<TaskFilters> = {
  status: [],
  priority: [],
  assigneeIds: [],
  projectId: null,
  searchQuery: '',
  dateRange: {
    start: null,
    end: null,
  },
  sortBy: {
    field: 'createdAt',
    order: 'desc',
  },
} as const;

/**
 * Initial state for the tasks slice
 * Provides type-safe default values
 */
export const INITIAL_TASK_STATE: Readonly<TaskState> = {
  tasks: [],
  selectedTask: null,
  loading: false,
  error: null,
  filters: DEFAULT_TASK_FILTERS,
  lastUpdated: null,
} as const;