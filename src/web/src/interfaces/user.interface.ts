/**
 * User Interface Definitions
 * Version: 1.0.0
 * 
 * Defines comprehensive TypeScript interfaces for user-related data structures
 * including user profiles, preferences, and team memberships with support for
 * organizational hierarchy and role-based access control.
 */

import { BaseEntity } from './common.interface';
import { UserRole, MFAMethod } from './auth.interface';
import { Theme } from '../types/common.types';

/**
 * Core user interface extending BaseEntity
 * Provides essential user information and role-based access control
 */
export interface IUser extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

/**
 * Extended user profile information
 * Includes organizational context, professional details, and skills
 */
export interface IUserProfile {
  user: IUser;
  avatar: string | null;
  phoneNumber: string | null;
  department: string;
  position: string;
  bio: string;
  timezone: string;
  skills: string[];
}

/**
 * User preferences and settings
 * Manages user customization, theme preferences, and notification settings
 */
export interface IUserPreferences {
  userId: ID;
  theme: Theme;
  language: string;
  notifications: boolean;
  mfaEnabled: boolean;
  mfaMethod: MFAMethod;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

/**
 * User team membership information
 * Tracks team associations, roles, and granular permissions
 */
export interface IUserTeam {
  userId: ID;
  teamId: ID;
  role: UserRole;
  joinedAt: Timestamp;
  isActive: boolean;
  permissions: string[];
}

/**
 * Type alias for user name display
 * Provides consistent user name formatting across the application
 */
export type UserDisplayName = `${string} ${string}`;

/**
 * Type guard to check if a user has administrative privileges
 * @param user The user object to check
 * @returns boolean indicating if user is an administrator
 */
export function isAdmin(user: IUser): boolean {
  return user.role === UserRole.ADMIN;
}

/**
 * Type guard to check if a user has project management privileges
 * @param user The user object to check
 * @returns boolean indicating if user is a project manager
 */
export function isProjectManager(user: IUser): boolean {
  return user.role === UserRole.PROJECT_MANAGER;
}

/**
 * Type guard to check if a user is an active team member
 * @param userTeam The user team membership to check
 * @returns boolean indicating if user is an active team member
 */
export function isActiveTeamMember(userTeam: IUserTeam): boolean {
  return userTeam.isActive && userTeam.role === UserRole.TEAM_MEMBER;
}

/**
 * Utility type for user search parameters
 * Supports flexible user search functionality
 */
export interface IUserSearchParams {
  query?: string;
  role?: UserRole;
  department?: string;
  skills?: string[];
  isActive?: boolean;
}

/**
 * Interface for user notification preferences
 * Provides granular control over notification settings
 */
export interface IUserNotificationPreferences {
  taskAssignments: boolean;
  taskUpdates: boolean;
  projectUpdates: boolean;
  teamAnnouncements: boolean;
  directMessages: boolean;
  emailDigest: 'daily' | 'weekly' | 'never';
}

/**
 * Interface for user session information
 * Tracks user activity and session state
 */
export interface IUserSession {
  userId: ID;
  lastActive: Timestamp;
  deviceInfo: string;
  ipAddress: string;
  isCurrentSession: boolean;
}