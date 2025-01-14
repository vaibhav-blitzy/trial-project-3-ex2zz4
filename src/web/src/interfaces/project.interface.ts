/**
 * @fileoverview Project-related interfaces for the Task Management System
 * Provides comprehensive type definitions for project management features
 * @version 1.0.0
 */

import { BaseEntity } from './common.interface';
import { Priority } from '../types/common.types';

/**
 * Security level enum for project access control
 * Defines granular security levels for project data protection
 */
export enum SecurityLevel {
    PUBLIC = 'PUBLIC',
    INTERNAL = 'INTERNAL',
    CONFIDENTIAL = 'CONFIDENTIAL',
    RESTRICTED = 'RESTRICTED'
}

/**
 * Project role enum for member access control
 * Defines specific roles within a project context
 */
export enum ProjectRole {
    OWNER = 'OWNER',
    MANAGER = 'MANAGER',
    MEMBER = 'MEMBER',
    GUEST = 'GUEST'
}

/**
 * Access level enum for granular permissions
 * Controls specific actions members can perform
 */
export enum AccessLevel {
    READ = 'READ',
    WRITE = 'WRITE',
    ADMIN = 'ADMIN'
}

/**
 * Core project interface extending BaseEntity
 * Implements comprehensive project data structure with type safety
 */
export interface IProject extends BaseEntity {
    name: string;
    description: string;
    teamId: string;
    priority: Priority;
    startDate: Timestamp;
    endDate: Timestamp;
    progress: number;
}

/**
 * Project settings interface for configuration management
 * Handles security, notifications, and audit settings
 */
export interface IProjectSettings {
    projectId: string;
    isPrivate: boolean;
    allowGuestAccess: boolean;
    notificationsEnabled: boolean;
    auditLoggingEnabled: boolean;
    maxTeamSize: number;
    securityLevel: SecurityLevel;
}

/**
 * Project member interface for team management
 * Manages member roles, access levels, and activity tracking
 */
export interface IProjectMember {
    projectId: string;
    userId: string;
    role: ProjectRole;
    accessLevel: AccessLevel;
    joinedAt: Timestamp;
    lastAccessAt: Timestamp;
}

/**
 * Project statistics interface for analytics
 * Tracks key project metrics and performance indicators
 */
export interface IProjectStats {
    projectId: string;
    totalTasks: number;
    completedTasks: number;
    activeMembers: number;
    timeSpent: number;
    lastActivityAt: Timestamp;
}

/**
 * Project audit log interface for compliance
 * Records project-related activities for auditing
 */
export interface IProjectAuditLog {
    projectId: string;
    userId: string;
    action: string;
    timestamp: Timestamp;
    details: Record<string, unknown>;
}

/**
 * Project creation request interface
 * Defines required fields for creating a new project
 */
export interface ICreateProjectRequest {
    name: string;
    description: string;
    teamId: string;
    priority: Priority;
    startDate: Timestamp;
    endDate: Timestamp;
    settings: Partial<IProjectSettings>;
}

/**
 * Project update request interface
 * Defines fields that can be updated for a project
 */
export interface IUpdateProjectRequest {
    name?: string;
    description?: string;
    priority?: Priority;
    startDate?: Timestamp;
    endDate?: Timestamp;
    progress?: number;
    settings?: Partial<IProjectSettings>;
}

/**
 * Type for project validation errors
 * Provides structured error feedback for project operations
 */
export type ProjectValidationError = {
    field: keyof IProject | keyof IProjectSettings;
    message: string;
    code: string;
};