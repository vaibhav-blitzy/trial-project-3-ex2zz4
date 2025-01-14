import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { FixedSizeList as VirtualList } from 'react-window'; // v1.8.9
import debounce from 'lodash/debounce'; // v4.0.8
import clsx from 'clsx'; // v2.0.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0

import Card from '../common/Card';
import { ITeam } from '../../interfaces/team.interface';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';

/**
 * Props for TeamActivity component with enhanced configuration
 */
interface TeamActivityProps {
  teamId: string;
  maxItems?: number;
  className?: string;
  refreshInterval?: number;
  retryAttempts?: number;
}

/**
 * Structure for individual activity items with optimistic updates
 */
interface ActivityItem {
  id: string;
  type: 'task' | 'project' | 'member' | 'comment';
  userId: string;
  action: string;
  timestamp: string;
  metadata: Record<string, any>;
  status: 'pending' | 'success' | 'error';
}

/**
 * Error fallback component for graceful error handling
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <Card 
    variant="outlined" 
    colorScheme="error"
    role="alert"
    ariaLabel="Error loading team activity"
  >
    <div className="p-4">
      <h4 className="text-lg font-medium mb-2">Error Loading Activity</h4>
      <p className="text-sm">{error.message}</p>
    </div>
  </Card>
);

/**
 * TeamActivity component that displays real-time team activity feed
 * Implements WebSocket-based live updates with automatic reconnection
 */
const TeamActivity: React.FC<TeamActivityProps> = React.memo(({
  teamId,
  maxItems = 50,
  className,
  refreshInterval = 30000,
  retryAttempts = 3
}) => {
  // State management
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hooks
  const { user, token } = useAuth();
  const { 
    connect, 
    subscribe, 
    isConnected 
  } = useWebSocket(`/ws/teams/${teamId}/activity`, {
    autoReconnect: true,
    maxRetries: retryAttempts,
    headers: { Authorization: `Bearer ${token}` }
  });

  // Memoized virtual list configuration
  const listConfig = useMemo(() => ({
    height: 400,
    width: '100%',
    itemSize: 72,
    itemCount: activities.length
  }), [activities.length]);

  /**
   * Debounced handler for activity updates to prevent UI thrashing
   */
  const handleActivityUpdate = useCallback(
    debounce((newActivity: ActivityItem) => {
      setActivities(prev => {
        const updated = [newActivity, ...prev].slice(0, maxItems);
        return updated.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });
    }, 100),
    [maxItems]
  );

  /**
   * Formats activity timestamp with user's locale
   */
  const formatTimestamp = useCallback((timestamp: string): string => {
    return new Intl.DateTimeFormat(navigator.language, {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    }).format(new Date(timestamp));
  }, []);

  /**
   * Renders individual activity item with proper ARIA attributes
   */
  const ActivityItem = useCallback(({ index, style }: any) => {
    const activity = activities[index];
    return (
      <div 
        style={style}
        className={clsx(
          'p-4 border-b border-gray-200 dark:border-gray-700',
          'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
          activity.status === 'pending' && 'opacity-70',
          activity.status === 'error' && 'bg-red-50 dark:bg-red-900'
        )}
        role="listitem"
        aria-label={`${activity.action} by user ${activity.userId}`}
      >
        <div className="flex justify-between items-center">
          <span className="font-medium">{activity.action}</span>
          <time 
            className="text-sm text-gray-500 dark:text-gray-400"
            dateTime={activity.timestamp}
          >
            {formatTimestamp(activity.timestamp)}
          </time>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {activity.metadata.description}
        </p>
      </div>
    );
  }, [activities, formatTimestamp]);

  /**
   * Effect for WebSocket connection and subscription
   */
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeWebSocket = async () => {
      try {
        await connect();
        unsubscribe = subscribe<ActivityItem>('team.activity', handleActivityUpdate);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to connect'));
        setIsLoading(false);
      }
    };

    initializeWebSocket();

    return () => {
      unsubscribe?.();
    };
  }, [connect, subscribe, handleActivityUpdate]);

  /**
   * Render component with proper accessibility and error handling
   */
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Card
        variant="elevated"
        elevation={2}
        className={clsx('team-activity', className)}
        role="region"
        ariaLabel="Team Activity Feed"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium">Team Activity</h3>
          {isConnected && (
            <span className="text-sm text-green-600 dark:text-green-400">
              Live Updates Active
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-4 text-center" role="status" aria-label="Loading activities">
            Loading activities...
          </div>
        ) : error ? (
          <ErrorFallback error={error} />
        ) : (
          <VirtualList
            {...listConfig}
            className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
            role="list"
            aria-label="Activity items"
          >
            {ActivityItem}
          </VirtualList>
        )}
      </Card>
    </ErrorBoundary>
  );
});

TeamActivity.displayName = 'TeamActivity';

export default TeamActivity;