/**
 * Project Management Interfaces
 * Version: 1.0.0
 * Defines comprehensive TypeScript interfaces for project management including
 * project structure, activity tracking, and statistics with strong type safety.
 */

import { IAuthUser } from '../interfaces/auth.interface';

/**
 * Project lifecycle states with strict type safety
 */
export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Project priority levels
 */
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Notification configuration for project events
 */
interface NotificationSettings {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  notifyOnTaskUpdates: boolean;
  notifyOnComments: boolean;
  notifyOnMemberChanges: boolean;
  digestFrequency: 'NONE' | 'DAILY' | 'WEEKLY';
}

/**
 * Project-level permission configuration
 */
interface PermissionSettings {
  allowGuestAccess: boolean;
  memberInviteRole: string;
  taskCreationRole: string;
  commentingRole: string;
  fileUploadRole: string;
  customRoles: Record<string, string[]>;
}

/**
 * Custom field definitions for project-specific data
 */
interface CustomFieldDefinitions {
  fields: Array<{
    id: string;
    name: string;
    type: 'TEXT' | 'NUMBER' | 'DATE' | 'ENUM' | 'BOOLEAN';
    required: boolean;
    options?: string[];
    defaultValue?: any;
  }>;
}

/**
 * Project configuration settings
 */
export interface ProjectSettings {
  isPublic: boolean;
  allowExternalSharing: boolean;
  notifications: NotificationSettings;
  permissions: PermissionSettings;
  customFields: CustomFieldDefinitions;
}

/**
 * Additional project metadata
 */
export interface ProjectMetadata {
  category: string;
  tags: string[];
  priority: Priority;
  customData: Record<string, any>;
}

/**
 * Task distribution statistics
 */
interface TaskDistribution {
  byStatus: Record<string, number>;
  byPriority: Record<Priority, number>;
  byAssignee: Record<string, number>;
}

/**
 * Member activity statistics
 */
interface MemberActivityStats {
  taskCompletions: Record<string, number>;
  lastActive: Record<string, Date>;
  contributionScore: Record<string, number>;
}

/**
 * Project activity types for audit trail
 */
export enum ProjectActivityType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  MEMBER_ADDED = 'MEMBER_ADDED',
  MEMBER_REMOVED = 'MEMBER_REMOVED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED'
}

/**
 * Details for project activity events
 */
interface ProjectActivityDetails {
  description: string;
  affectedUsers?: string[];
  metadata?: Record<string, any>;
}

/**
 * Track changes in project updates
 */
interface ProjectChanges {
  field: string;
  oldValue: any;
  newValue: any;
  reason?: string;
}

/**
 * Comprehensive project interface with complete type safety
 */
export interface IProject {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  teamId: string;
  ownerId: string;
  memberIds: string[];
  startDate: Date;
  endDate: Date;
  settings: ProjectSettings;
  metadata: ProjectMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project activity tracking with type-safe change records
 */
export interface IProjectActivity {
  id: string;
  projectId: string;
  userId: string;
  type: ProjectActivityType;
  details: ProjectActivityDetails;
  changes: ProjectChanges;
  timestamp: Date;
}

/**
 * Enhanced interface for project statistics and metrics
 */
export interface IProjectStats {
  totalTasks: number;
  completedTasks: number;
  progress: number;
  activeMembers: number;
  taskDistribution: TaskDistribution;
  memberActivity: MemberActivityStats;
  lastActivity: Date;
}