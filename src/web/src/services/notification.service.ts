/**
 * Enhanced Notification Service
 * Provides comprehensive notification management with offline support,
 * prioritization, and grouping capabilities
 * @version 1.0.0
 */

import { Subject, BehaviorSubject } from 'rxjs'; // ^7.8.0
import { retry, retryWhen } from 'rxjs/operators'; // ^7.8.0
import { ApiService } from './api.service';
import { useWebSocket } from '../hooks/useWebSocket';
import { HTTP_STATUS, API_ENDPOINTS } from '../constants/api.constants';

/**
 * Notification priority levels
 */
enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

/**
 * Notification group types
 */
enum NotificationGroupType {
  TASK = 'TASK',
  PROJECT = 'PROJECT',
  TEAM = 'TEAM',
  SYSTEM = 'SYSTEM'
}

/**
 * Interface for notification data
 */
interface INotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  groupType: NotificationGroupType;
  referenceId?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for notification group
 */
interface INotificationGroup {
  type: NotificationGroupType;
  count: number;
  unreadCount: number;
  notifications: INotification[];
}

/**
 * Interface for notification service configuration
 */
interface NotificationServiceConfig {
  maxOfflineQueue: number;
  retryAttempts: number;
  retryDelay: number;
  groupingEnabled: boolean;
  offlineSupport: boolean;
}

/**
 * Enhanced Notification Service implementation
 */
export class NotificationService {
  private readonly apiService: ApiService;
  private readonly notificationState: BehaviorSubject<INotification[]>;
  private readonly notificationGroups: Map<NotificationGroupType, INotificationGroup>;
  private readonly offlineQueue: Set<{ action: string; payload: any }>;
  private readonly notificationSubject: Subject<INotification>;
  private readonly config: NotificationServiceConfig;
  private wsConnection: ReturnType<typeof useWebSocket>;

  constructor(
    apiService: ApiService,
    config: Partial<NotificationServiceConfig> = {}
  ) {
    this.apiService = apiService;
    this.notificationState = new BehaviorSubject<INotification[]>([]);
    this.notificationGroups = new Map();
    this.offlineQueue = new Set();
    this.notificationSubject = new Subject();

    // Default configuration with overrides
    this.config = {
      maxOfflineQueue: 100,
      retryAttempts: 3,
      retryDelay: 1000,
      groupingEnabled: true,
      offlineSupport: true,
      ...config
    };

    // Initialize WebSocket connection
    this.initializeWebSocket();
    
    // Initialize notification groups
    this.initializeGroups();
    
    // Setup offline support
    this.setupOfflineSupport();
  }

  /**
   * Retrieves notifications with filtering and pagination
   */
  public async getNotifications(options: {
    page?: number;
    limit?: number;
    priority?: NotificationPriority[];
    groupType?: NotificationGroupType[];
    unreadOnly?: boolean;
  } = {}): Promise<{ notifications: INotification[]; total: number; groups: INotificationGroup[] }> {
    try {
      const response = await this.apiService.get<{
        items: INotification[];
        total: number;
      }>('/notifications', {
        params: {
          page: options.page || 1,
          limit: options.limit || 20,
          priority: options.priority,
          groupType: options.groupType,
          unreadOnly: options.unreadOnly
        }
      });

      if (response.success) {
        const notifications = response.data.items;
        this.notificationState.next(notifications);
        
        if (this.config.groupingEnabled) {
          this.updateGroups(notifications);
        }

        return {
          notifications,
          total: response.data.total,
          groups: Array.from(this.notificationGroups.values())
        };
      }

      throw new Error(response.error || 'Failed to fetch notifications');
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Marks a notification as read with optional read receipt
   */
  public async markAsRead(
    notificationId: string,
    trackReceipt: boolean = false
  ): Promise<void> {
    try {
      if (!navigator.onLine && this.config.offlineSupport) {
        this.queueOfflineAction('markAsRead', { notificationId, trackReceipt });
        return;
      }

      const response = await this.apiService.put(
        `/notifications/${notificationId}/read`,
        { trackReceipt }
      );

      if (response.success) {
        this.updateNotificationState(notificationId, { read: true });
      } else {
        throw new Error(response.error || 'Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Subscribes to real-time notifications
   */
  public subscribeToNotifications(
    callback: (notification: INotification) => void
  ): () => void {
    return this.notificationSubject.subscribe(callback).unsubscribe;
  }

  /**
   * Retrieves notification groups
   */
  public getNotificationGroups(): INotificationGroup[] {
    return Array.from(this.notificationGroups.values());
  }

  /**
   * Initializes WebSocket connection for real-time updates
   */
  private initializeWebSocket(): void {
    this.wsConnection = useWebSocket(API_ENDPOINTS.WS_NOTIFICATIONS);
    
    this.wsConnection.subscribe<INotification>('notification', (notification) => {
      this.handleNewNotification(notification);
    });
  }

  /**
   * Initializes notification groups
   */
  private initializeGroups(): void {
    Object.values(NotificationGroupType).forEach(type => {
      this.notificationGroups.set(type, {
        type,
        count: 0,
        unreadCount: 0,
        notifications: []
      });
    });
  }

  /**
   * Sets up offline support functionality
   */
  private setupOfflineSupport(): void {
    if (!this.config.offlineSupport) return;

    window.addEventListener('online', this.processOfflineQueue.bind(this));
    window.addEventListener('offline', () => {
      console.log('Notification service is offline. Actions will be queued.');
    });
  }

  /**
   * Updates notification groups based on new notifications
   */
  private updateGroups(notifications: INotification[]): void {
    this.notificationGroups.forEach(group => {
      group.notifications = notifications.filter(n => n.groupType === group.type);
      group.count = group.notifications.length;
      group.unreadCount = group.notifications.filter(n => !n.read).length;
    });
  }

  /**
   * Handles new notifications received via WebSocket
   */
  private handleNewNotification(notification: INotification): void {
    const currentNotifications = this.notificationState.value;
    const updatedNotifications = [notification, ...currentNotifications];
    
    this.notificationState.next(updatedNotifications);
    this.notificationSubject.next(notification);
    
    if (this.config.groupingEnabled) {
      this.updateGroups(updatedNotifications);
    }
  }

  /**
   * Updates the state of a specific notification
   */
  private updateNotificationState(
    notificationId: string,
    updates: Partial<INotification>
  ): void {
    const currentNotifications = this.notificationState.value;
    const updatedNotifications = currentNotifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, ...updates }
        : notification
    );

    this.notificationState.next(updatedNotifications);
    
    if (this.config.groupingEnabled) {
      this.updateGroups(updatedNotifications);
    }
  }

  /**
   * Queues actions for offline processing
   */
  private queueOfflineAction(action: string, payload: any): void {
    if (this.offlineQueue.size >= this.config.maxOfflineQueue) {
      console.warn('Offline queue is full. Oldest action will be dropped.');
      const [firstItem] = this.offlineQueue;
      this.offlineQueue.delete(firstItem);
    }

    this.offlineQueue.add({ action, payload });
  }

  /**
   * Processes queued offline actions when connection is restored
   */
  private async processOfflineQueue(): Promise<void> {
    if (!navigator.onLine || this.offlineQueue.size === 0) return;

    for (const item of this.offlineQueue) {
      try {
        switch (item.action) {
          case 'markAsRead':
            await this.markAsRead(item.payload.notificationId, item.payload.trackReceipt);
            break;
          // Add other offline actions as needed
        }
        this.offlineQueue.delete(item);
      } catch (error) {
        console.error('Error processing offline action:', error);
      }
    }
  }
}