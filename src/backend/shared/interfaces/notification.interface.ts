/**
 * Notification System Interfaces
 * Version: 1.0.0
 * Implements comprehensive notification system interfaces for real-time collaboration
 * and team communication with advanced delivery tracking and preference management.
 */

import { IAuthUser } from './auth.interface';

/**
 * Enumeration of all supported notification types in the system
 */
export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  MENTION = 'MENTION',
  SYSTEM = 'SYSTEM'
}

/**
 * Priority levels for notifications to control delivery urgency
 */
export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

/**
 * Tracks the delivery status of notifications across channels
 */
export enum NotificationDeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED'
}

/**
 * Core notification interface with comprehensive tracking and delivery features
 */
export interface INotification {
  /** Unique identifier for the notification */
  id: string;

  /** Type of notification for categorization and handling */
  type: NotificationType;

  /** Notification title for display */
  title: string;

  /** Detailed notification message */
  message: string;

  /** Optional link associated with the notification */
  link: string | null;

  /** ID of the user receiving the notification */
  recipientId: string;

  /** ID of the user or system sending the notification */
  senderId: string;

  /** Priority level affecting delivery urgency */
  priority: NotificationPriority;

  /** Indicates if notification has been read */
  read: boolean;

  /** Additional contextual data for the notification */
  metadata: Record<string, any>;

  /** Timestamp when notification was created */
  createdAt: Date;

  /** Timestamp when notification was read */
  readAt: Date | null;

  /** Optional expiration timestamp */
  expiresAt: Date | null;

  /** Current delivery status */
  deliveryStatus: NotificationDeliveryStatus;
}

/**
 * User notification preferences with advanced delivery controls
 */
export interface INotificationPreferences {
  /** User ID associated with these preferences */
  userId: string;

  /** Enable/disable email notifications */
  emailEnabled: boolean;

  /** Enable/disable push notifications */
  pushEnabled: boolean;

  /** Enable/disable in-app notifications */
  inAppEnabled: boolean;

  /** List of notification types to be muted */
  mutedTypes: NotificationType[];

  /** Minimum priority threshold for receiving notifications */
  priorityThreshold: NotificationPriority;

  /** Quiet hours configuration */
  quietHours: {
    start: string;      // 24-hour format "HH:mm"
    end: string;        // 24-hour format "HH:mm"
    timezone: string;   // IANA timezone identifier
  };

  /** Delivery channel preferences per notification type */
  deliveryChannels: {
    [key in NotificationType]: string[];  // Array of enabled delivery channels
  };
}