/**
 * @fileoverview Team-related interfaces and types for the frontend application
 * Defines the structure and relationships for team management functionality
 * Supporting teams of 10-10,000 users with comprehensive role management
 * @version 1.0.0
 */

import { BaseEntity } from './common.interface';
import { Status } from '../types/common.types';

/**
 * Enumeration of possible team member roles
 * Implements role-based access control with granular permissions
 */
export enum TeamRole {
    OWNER = 'OWNER',      // Full control over team, cannot be removed
    ADMIN = 'ADMIN',      // Administrative privileges, can manage members
    MEMBER = 'MEMBER'     // Standard team member with basic permissions
}

/**
 * Interface for notification preferences within team settings
 * Controls team-wide notification configurations
 */
export interface INotificationSettings {
    emailNotifications: boolean;
    taskUpdates: boolean;
    membershipChanges: boolean;
    projectUpdates: boolean;
    dailyDigest: boolean;
}

/**
 * Core team interface extending BaseEntity
 * Represents a team entity with member and project associations
 */
export interface ITeam extends BaseEntity {
    name: string;                 // Team display name
    description: string;          // Team description/purpose
    ownerId: string;             // Team owner's user ID
    memberIds: string[];         // Array of member user IDs
    projectIds: string[];        // Array of associated project IDs
    status: Status;              // Team status (ACTIVE/INACTIVE/DELETED)
    createdAt: string;           // Team creation timestamp
    updatedAt: string;           // Last update timestamp
}

/**
 * Interface for team membership details
 * Manages individual member roles and permissions within a team
 */
export interface ITeamMember {
    teamId: string;              // Associated team ID
    userId: string;              // Member's user ID
    role: TeamRole;              // Member's role in the team
    joinedAt: string;            // Membership start timestamp
    permissions: string[];       // Granular permission flags
}

/**
 * Interface for team configuration and settings
 * Controls team-wide behavior and constraints
 */
export interface ITeamSettings {
    teamId: string;                           // Associated team ID
    isPrivate: boolean;                       // Team visibility setting
    allowInvites: boolean;                    // Member invitation permission
    notificationSettings: INotificationSettings; // Team notification preferences
    maxMembers: number;                       // Maximum allowed members (10-10000)
    defaultMemberRole: TeamRole;              // Default role for new members
}

/**
 * Interface for team invitation
 * Manages pending team membership invitations
 */
export interface ITeamInvitation {
    id: string;                  // Invitation unique identifier
    teamId: string;              // Target team ID
    inviterId: string;           // Inviting member's user ID
    inviteeEmail: string;        // Invitee's email address
    role: TeamRole;              // Proposed member role
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED'; // Invitation status
    expiresAt: string;           // Invitation expiration timestamp
    createdAt: string;           // Invitation creation timestamp
}

/**
 * Interface for team audit log entries
 * Tracks important team-related events and changes
 */
export interface ITeamAuditLog {
    id: string;                  // Log entry identifier
    teamId: string;              // Associated team ID
    actorId: string;             // User who performed the action
    action: string;              // Description of the action
    details: Record<string, any>; // Additional event details
    timestamp: string;           // Event timestamp
}