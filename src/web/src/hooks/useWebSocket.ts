import { useEffect, useCallback, useRef } from 'react'; // react@18.0.0
import { Subject } from 'rxjs'; // rxjs@7.8.0
import { WS_BASE_URL } from '../constants/api.constants';

/**
 * Configuration options for WebSocket connection
 */
interface WebSocketOptions {
  autoReconnect?: boolean;
  maxRetries?: number;
  retryInterval?: number;
  connectionTimeout?: number;
  heartbeatInterval?: number;
  headers?: Record<string, string>;
}

/**
 * Return type for useWebSocket hook
 */
interface WebSocketHookReturn {
  isConnected: boolean;
  retryCount: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: <T>(event: string, callback: (data: T) => void) => () => void;
  resetConnection: () => void;
}

/**
 * WebSocket event types supported by the system
 */
type WebSocketEventType = 'task.update' | 'comment.create' | 'user.presence' | 'notification';

/**
 * Custom hook for managing WebSocket connections with automatic recovery
 * @param url - WebSocket endpoint URL
 * @param options - WebSocket configuration options
 */
export const useWebSocket = (
  url: string = WS_BASE_URL,
  options: WebSocketOptions = {}
): WebSocketHookReturn => {
  // Default configuration values
  const defaultOptions: Required<WebSocketOptions> = {
    autoReconnect: true,
    maxRetries: 5,
    retryInterval: 1000,
    connectionTimeout: 5000,
    heartbeatInterval: 30000,
    headers: {}
  };

  const config = { ...defaultOptions, ...options };

  // Mutable refs for WebSocket instance and state
  const wsRef = useRef<WebSocket | null>(null);
  const isConnectedRef = useRef(false);
  const retryCountRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const connectionTimeoutRef = useRef<NodeJS.Timeout>();
  const messageSubject = useRef(new Subject<{ event: string; data: any }>());

  // Event subscription registry
  const subscriptionsRef = useRef(new Map<string, Set<(data: any) => void>>());

  /**
   * Establishes WebSocket connection with retry mechanism
   */
  const connect = useCallback(async (): Promise<void> => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        wsRef.current = new WebSocket(url);

        // Connection timeout handler
        connectionTimeoutRef.current = setTimeout(() => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) {
            wsRef.current?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, config.connectionTimeout);

        wsRef.current.onopen = () => {
          isConnectedRef.current = true;
          retryCountRef.current = 0;
          clearTimeout(connectionTimeoutRef.current);
          setupHeartbeat();
          resolve();
        };

        wsRef.current.onclose = () => {
          isConnectedRef.current = false;
          clearInterval(heartbeatIntervalRef.current);
          
          if (config.autoReconnect && retryCountRef.current < config.maxRetries) {
            const backoffDelay = Math.min(
              1000 * Math.pow(2, retryCountRef.current),
              30000
            );
            retryCountRef.current++;
            setTimeout(() => connect(), backoffDelay);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          wsRef.current?.close();
        };

        wsRef.current.onmessage = (event) => {
          try {
            const { type, payload } = JSON.parse(event.data);
            messageSubject.current.next({ event: type, data: payload });
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }, [url, config.autoReconnect, config.maxRetries, config.connectionTimeout]);

  /**
   * Sets up heartbeat mechanism to keep connection alive
   */
  const setupHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, config.heartbeatInterval);
  }, [config.heartbeatInterval]);

  /**
   * Gracefully closes WebSocket connection and performs cleanup
   */
  const disconnect = useCallback(() => {
    clearInterval(heartbeatIntervalRef.current);
    clearTimeout(connectionTimeoutRef.current);
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    isConnectedRef.current = false;
    subscriptionsRef.current.clear();
    messageSubject.current.complete();
    messageSubject.current = new Subject();
  }, []);

  /**
   * Type-safe subscription to specific WebSocket events
   */
  const subscribe = useCallback(<T>(
    event: WebSocketEventType,
    callback: (data: T) => void
  ): (() => void) => {
    if (!subscriptionsRef.current.has(event)) {
      subscriptionsRef.current.set(event, new Set());
    }

    const subscribers = subscriptionsRef.current.get(event)!;
    subscribers.add(callback);

    const subscription = messageSubject.current.subscribe({
      next: ({ event: msgEvent, data }) => {
        if (msgEvent === event) {
          callback(data);
        }
      },
      error: (error) => console.error(`WebSocket subscription error:`, error)
    });

    return () => {
      subscribers.delete(callback);
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Resets connection and clears all subscriptions
   */
  const resetConnection = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  // Setup connection on mount and cleanup on unmount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: isConnectedRef.current,
    retryCount: retryCountRef.current,
    connect,
    disconnect,
    subscribe,
    resetConnection
  };
};

export type { WebSocketOptions, WebSocketHookReturn, WebSocketEventType };