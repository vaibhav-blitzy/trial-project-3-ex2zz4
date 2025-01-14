/**
 * @fileoverview Task-related interfaces and types for the frontend application
 * Provides comprehensive type definitions for tasks, comments, and activities
 * @version 1.0.0
 */

import { BaseEntity } from './common.interface';
import { ID, Timestamp } from '../types/common.types';

/**
 * Task priority levels with strict value typing
 * Used for consistent task prioritization across the application
 */
export enum TaskPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}

/**
 * Task workflow states with strict value typing
 * Represents the different stages in a task's lifecycle
 */
export enum TaskStatus {
    TODO = 'TODO',
    IN_PROGRESS = 'IN_PROGRESS',
    REVIEW = 'REVIEW',
    DONE = 'DONE'
}

/**
 * Activity types for task history tracking
 * Defines all possible task-related activities
 */
export enum TaskActivityType {
    CREATED = 'CREATED',
    UPDATED = 'UPDATED',
    STATUS_CHANGED = 'STATUS_CHANGED',
    PRIORITY_CHANGED = 'PRIORITY_CHANGED',
    ASSIGNEE_ADDED = 'ASSIGNEE_ADDED',
    ASSIGNEE_REMOVED = 'ASSIGNEE_REMOVED',
    COMMENT_ADDED = 'COMMENT_ADDED',
    ATTACHMENT_ADDED = 'ATTACHMENT_ADDED',
    ATTACHMENT_REMOVED = 'ATTACHMENT_REMOVED',
    DUE_DATE_CHANGED = 'DUE_DATE_CHANGED',
    TAG_ADDED = 'TAG_ADDED',
    TAG_REMOVED = 'TAG_REMOVED'
}

/**
 * Type for tracking changes in task properties
 * Enables detailed activity logging
 */
export type TaskChanges = {
    field: string;
    oldValue: any;
    newValue: any;
};

/**
 * Core interface for task data with comprehensive property definitions
 * Extends BaseEntity for common fields (id, createdAt, updatedAt)
 */
export interface ITask extends BaseEntity {
    title: string;                // Task title with max length validation
    description: string;          // Detailed task description
    projectId: ID;               // Reference to parent project
    status: TaskStatus;          // Current workflow state
    priority: TaskPriority;      // Task priority level
    assigneeIds: ID[];          // List of assigned user IDs
    creatorId: ID;              // Reference to task creator
    dueDate: Timestamp;         // Task deadline
    attachmentIds: ID[];        // List of attached file IDs
    tags: string[];             // List of task labels/tags
}

/**
 * Interface for task comments with content validation
 * Extends BaseEntity for common fields
 */
export interface ITaskComment extends BaseEntity {
    taskId: ID;                 // Reference to parent task
    userId: ID;                 // Reference to comment author
    content: string;            // Comment content with validation
}

/**
 * Interface for tracking task activities with strict change tracking
 * Extends BaseEntity for common fields
 */
export interface ITaskActivity extends BaseEntity {
    taskId: ID;                 // Reference to related task
    userId: ID;                 // Reference to user who performed the activity
    type: TaskActivityType;     // Type of activity performed
    changes: TaskChanges;       // Detailed change information
    timestamp: Timestamp;       // When the activity occurred
}

/**
 * Interface for task creation payload
 * Omits system-generated fields from ITask
 */
export type CreateTaskPayload = Omit<ITask, keyof BaseEntity>;

/**
 * Interface for task update payload
 * Makes all fields optional except id
 */
export type UpdateTaskPayload = Partial<Omit<ITask, keyof BaseEntity>> & { id: ID };

/**
 * Interface for task filter criteria
 * Enables flexible task searching and filtering
 */
export interface TaskFilter {
    projectId?: ID;
    status?: TaskStatus[];
    priority?: TaskPriority[];
    assigneeIds?: ID[];
    creatorId?: ID;
    dueDateFrom?: Timestamp;
    dueDateTo?: Timestamp;
    tags?: string[];
    searchTerm?: string;
}