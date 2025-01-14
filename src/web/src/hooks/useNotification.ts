/**
 * Custom React hook for managing real-time notifications with offline support,
 * WebSocket connection management, and notification grouping capabilities
 * @version 1.0.0
 */

import { useEffect, useCallback } from 'react'; // ^18.0.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.0.0
import { useNetworkStatus } from '@react-hooks/network'; // ^1.0.0

import { NotificationService } from '../services/notification.service';
import { addNotification } from '../store/ui/ui.actions';
import { selectNotifications } from '../store/ui/ui.selectors';
import type { Notification } from '../store/ui/ui.types';

/**
 * WebSocket connection status enum
 */
enum WebSocketStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  ERROR = 'ERROR'
}

/**
 * Interface for grouped notifications
 */
interface GroupedNotifications {
  [key: string]: Notification[];
}

/**
 * Hook return type
 */
interface UseNotificationReturn {
  notifications: Notification[];
  markAsRead: (notificationId: string) => Promise<void>;
  hasUnread: boolean;
  connectionStatus: WebSocketStatus;
  groupedNotifications: GroupedNotifications;
}

/**
 * Custom hook for managing notifications with offline support and grouping
 */
export function useNotification(): UseNotificationReturn {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const { online } = useNetworkStatus();

  // Initialize notification service
  const notificationService = new NotificationService();

  /**
   * Enhanced callback for handling new notifications with offline support
   */
  const handleNewNotification = useCallback((notification: Notification) => {
    if (!online) {
      // Store notification in IndexedDB for offline support
      localStorage.setItem(
        `offline_notification_${notification.id}`,
        JSON.stringify({ ...notification, timestamp: Date.now() })
      );
    }

    dispatch(addNotification({
      type: notification.type,
      message: notification.message,
      autoHide: false,
      duration: 0
    }));
  }, [dispatch, online]);

  /**
   * Enhanced handler for marking notifications as read with offline support
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      if (!online) {
        // Queue operation for when back online
        const queuedOperations = JSON.parse(
          localStorage.getItem('queued_notification_operations') || '[]'
        );
        queuedOperations.push({ type: 'markAsRead', id: notificationId });
        localStorage.setItem(
          'queued_notification_operations',
          JSON.stringify(queuedOperations)
        );
        return;
      }

      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }, [online, notificationService]);

  /**
   * Process queued offline operations when connection is restored
   */
  const processOfflineQueue = useCallback(async () => {
    if (!online) return;

    const queuedOperations = JSON.parse(
      localStorage.getItem('queued_notification_operations') || '[]'
    );

    if (queuedOperations.length > 0) {
      for (const operation of queuedOperations) {
        try {
          if (operation.type === 'markAsRead') {
            await notificationService.markAsRead(operation.id);
          }
        } catch (error) {
          console.error('Error processing offline operation:', error);
        }
      }

      // Clear processed queue
      localStorage.removeItem('queued_notification_operations');
    }
  }, [online, notificationService]);

  /**
   * Group notifications by type
   */
  const groupNotifications = useCallback((notifications: Notification[]): GroupedNotifications => {
    return notifications.reduce((groups, notification) => {
      const key = notification.type;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(notification);
      return groups;
    }, {} as GroupedNotifications);
  }, []);

  /**
   * Setup WebSocket connection and offline support
   */
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupNotifications = async () => {
      try {
        // Subscribe to real-time notifications
        unsubscribe = notificationService.subscribeToNotifications(handleNewNotification);

        // Process any offline queue when connection is restored
        if (online) {
          await processOfflineQueue();
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };

    setupNotifications();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [online, handleNewNotification, processOfflineQueue, notificationService]);

  // Calculate unread notifications
  const hasUnread = notifications.some(notification => !notification.autoHide);

  // Group notifications
  const groupedNotifications = groupNotifications(notifications);

  // Determine WebSocket connection status
  const connectionStatus = online ? WebSocketStatus.CONNECTED : WebSocketStatus.DISCONNECTED;

  return {
    notifications,
    markAsRead,
    hasUnread,
    connectionStatus,
    groupedNotifications
  };
}

export type { UseNotificationReturn, GroupedNotifications };
export { WebSocketStatus };