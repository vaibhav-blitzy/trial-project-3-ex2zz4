/**
 * Task Management Interfaces
 * Version: 1.0.0
 * Defines comprehensive TypeScript interfaces for task management including
 * task structure, activity tracking, and audit trail capabilities.
 */

import { IAuthUser } from '../interfaces/auth.interface';
import { IProject } from '../interfaces/project.interface';

/**
 * Task priority levels with strict type safety
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

/**
 * Task lifecycle states with strict type safety
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE'
}

/**
 * Comprehensive task activity types for detailed audit trail
 */
export enum TaskActivityType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  ASSIGNEE_ADDED = 'ASSIGNEE_ADDED',
  ASSIGNEE_REMOVED = 'ASSIGNEE_REMOVED',
  ATTACHMENT_ADDED = 'ATTACHMENT_ADDED',
  ATTACHMENT_REMOVED = 'ATTACHMENT_REMOVED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  DUE_DATE_CHANGED = 'DUE_DATE_CHANGED'
}

/**
 * Core interface defining task structure and properties
 * Implements comprehensive task management requirements
 */
export interface ITask {
  id: string;
  title: string;
  description: string;
  projectId: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  creatorId: string;
  dueDate: Date;
  attachmentIds: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for task comments with audit capabilities
 */
export interface ITaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Enhanced interface for detailed task activity tracking
 * Provides comprehensive audit trail with change history
 */
export interface ITaskActivity {
  id: string;
  taskId: string;
  userId: string;
  type: TaskActivityType;
  changes: Record<string, {
    oldValue: any;
    newValue: any;
  }>;
  metadata: Record<string, any>;
  timestamp: Date;
}