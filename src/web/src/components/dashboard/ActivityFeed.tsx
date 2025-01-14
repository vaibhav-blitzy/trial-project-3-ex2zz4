import React, { useEffect, useCallback, useState, useMemo } from 'react';
import clsx from 'clsx'; // v2.0.0
import { BaseComponentProps } from '../../types/components.types';
import Card from '../common/Card';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTheme } from '../../hooks/useTheme';
import { TRANSITIONS } from '../../constants/theme.constants';

/**
 * Props interface for ActivityFeed component
 */
interface ActivityFeedProps extends BaseComponentProps {
  maxItems?: number;
  refreshInterval?: number;
  retryAttempts?: number;
  cacheTimeout?: number;
}

/**
 * Interface for individual activity items
 */
interface ActivityItem {
  id: string;
  type: 'task' | 'project' | 'team' | 'system';
  action: string;
  timestamp: Date;
  userId: string;
  details: {
    title?: string;
    description?: string;
    entityId?: string;
    entityType?: string;
    changes?: Record<string, any>;
  };
  status: 'pending' | 'success' | 'error';
}

/**
 * Real-time activity feed component that displays recent updates and notifications
 * Implements WebSocket-based updates with optimistic rendering and error recovery
 */
const ActivityFeed: React.FC<ActivityFeedProps> = React.memo(({
  className,
  style,
  maxItems = 50,
  refreshInterval = 30000,
  retryAttempts = 3,
  cacheTimeout = 300000, // 5 minutes
  testId = 'activity-feed'
}) => {
  const { theme } = useTheme();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize WebSocket connection
  const {
    isConnected,
    subscribe,
    resetConnection
  } = useWebSocket('/ws/activities', {
    autoReconnect: true,
    maxRetries: retryAttempts,
    heartbeatInterval: refreshInterval
  });

  /**
   * Processes and merges new activities with existing ones
   */
  const processActivities = useCallback((newActivities: ActivityItem[]) => {
    setActivities(current => {
      const merged = [...newActivities, ...current]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, maxItems);

      // Remove duplicates based on ID
      return Array.from(
        new Map(merged.map(item => [item.id, item])).values()
      );
    });
  }, [maxItems]);

  /**
   * Handles optimistic updates for new activities
   */
  const handleNewActivity = useCallback((activity: ActivityItem) => {
    const optimisticActivity = {
      ...activity,
      status: 'pending' as const,
      timestamp: new Date()
    };

    setActivities(current => [optimisticActivity, ...current].slice(0, maxItems));

    // Simulate network delay and update status
    setTimeout(() => {
      setActivities(current =>
        current.map(item =>
          item.id === activity.id
            ? { ...item, status: 'success' as const }
            : item
        )
      );
    }, 1000);
  }, [maxItems]);

  /**
   * Subscribes to WebSocket events for real-time updates
   */
  useEffect(() => {
    const unsubscribeTask = subscribe<ActivityItem>('task.update', handleNewActivity);
    const unsubscribeProject = subscribe<ActivityItem>('project.update', handleNewActivity);
    const unsubscribeTeam = subscribe<ActivityItem>('team.update', handleNewActivity);
    const unsubscribeSystem = subscribe<ActivityItem>('notification', handleNewActivity);

    return () => {
      unsubscribeTask();
      unsubscribeProject();
      unsubscribeTeam();
      unsubscribeSystem();
    };
  }, [subscribe, handleNewActivity]);

  /**
   * Fetches initial activity data
   */
  const fetchActivities = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v1/activities');
      if (!response.ok) throw new Error('Failed to fetch activities');
      
      const data = await response.json();
      processActivities(data.activities);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Failed to fetch activities:', err);
    } finally {
      setIsLoading(false);
    }
  }, [processActivities]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  /**
   * Memoized activity item renderer
   */
  const renderActivityItem = useCallback((activity: ActivityItem) => {
    const getActivityIcon = () => {
      switch (activity.type) {
        case 'task': return '📋';
        case 'project': return '📁';
        case 'team': return '👥';
        case 'system': return '🔔';
        default: return '📌';
      }
    };

    return (
      <Card
        key={activity.id}
        className={clsx(
          'activity-item',
          `activity-item--${activity.type}`,
          `activity-item--${activity.status}`
        )}
        variant="outlined"
        elevation={1}
        style={{
          marginBottom: theme.spacing(2),
          opacity: activity.status === 'pending' ? 0.7 : 1,
          transition: `all ${TRANSITIONS.duration.standard}ms ${TRANSITIONS.easing.easeInOut}`
        }}
        role="listitem"
        ariaLabel={`${activity.type} activity: ${activity.details.title}`}
      >
        <div className="activity-item__content">
          <span className="activity-item__icon" role="img" aria-label={activity.type}>
            {getActivityIcon()}
          </span>
          <div className="activity-item__details">
            <h4 className="activity-item__title">{activity.details.title}</h4>
            <p className="activity-item__description">{activity.details.description}</p>
            <time className="activity-item__timestamp" dateTime={activity.timestamp.toISOString()}>
              {new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
              }).format(activity.timestamp)}
            </time>
          </div>
        </div>
      </Card>
    );
  }, [theme]);

  // Memoized empty state
  const emptyState = useMemo(() => (
    <Card
      className="activity-feed__empty"
      variant="outlined"
      style={{ textAlign: 'center', padding: theme.spacing(4) }}
    >
      <p>No recent activities</p>
    </Card>
  ), [theme]);

  // Memoized error state
  const errorState = useMemo(() => (
    <Card
      className="activity-feed__error"
      variant="outlined"
      style={{ 
        textAlign: 'center',
        padding: theme.spacing(4),
        backgroundColor: theme.palette.error.light
      }}
    >
      <p>Error loading activities</p>
      <button onClick={resetConnection}>Retry</button>
    </Card>
  ), [theme, resetConnection]);

  return (
    <div
      className={clsx('activity-feed', className)}
      style={{
        ...style,
        position: 'relative',
        minHeight: 200
      }}
      role="log"
      aria-live="polite"
      aria-busy={isLoading}
      data-testid={testId}
    >
      <div className="activity-feed__header">
        <h3>Activity Feed</h3>
        {!isConnected && (
          <span className="activity-feed__connection-status" role="status">
            Reconnecting...
          </span>
        )}
      </div>

      {isLoading && <div className="activity-feed__loading">Loading activities...</div>}
      {error && errorState}
      {!isLoading && !error && activities.length === 0 && emptyState}
      
      <div className="activity-feed__list" role="list">
        {activities.map(renderActivityItem)}
      </div>
    </div>
  );
});

ActivityFeed.displayName = 'ActivityFeed';

export default ActivityFeed;