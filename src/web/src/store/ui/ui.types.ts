// @reduxjs/toolkit version ^1.9.0
import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Available theme options including system preference detection
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Semantic notification types for different alert levels
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Interface defining the structure of notification objects
 * Includes support for auto-hide functionality and custom durations
 */
export interface Notification {
  /** Unique identifier for the notification */
  readonly id: string;
  /** Type of notification determining its visual style */
  readonly type: NotificationType;
  /** Content message of the notification */
  readonly message: string;
  /** Creation timestamp in milliseconds */
  readonly timestamp: number;
  /** Whether the notification should automatically hide */
  readonly autoHide: boolean;
  /** Duration in milliseconds before auto-hide (if enabled) */
  readonly duration: number;
}

/**
 * Core interface defining the complete UI state structure
 * Implements readonly arrays for immutability
 */
export interface UIState {
  /** Current theme selection */
  theme: Theme;
  /** Sidebar visibility state */
  sidebarOpen: boolean;
  /** Array of active notifications */
  notifications: readonly Notification[];
  /** Global loading state indicator */
  loading: boolean;
  /** Global error message or null if no error */
  error: string | null;
  /** Theme transition state for smooth theme changes */
  themeTransition: boolean;
}

/**
 * Enum of all possible UI action types
 * Uses const assertions for better type inference
 */
export const UIActionTypes = {
  SET_THEME: 'ui/setTheme',
  TOGGLE_SIDEBAR: 'ui/toggleSidebar',
  ADD_NOTIFICATION: 'ui/addNotification',
  REMOVE_NOTIFICATION: 'ui/removeNotification',
  SET_LOADING: 'ui/setLoading',
  SET_ERROR: 'ui/setError',
  START_THEME_TRANSITION: 'ui/startThemeTransition',
  END_THEME_TRANSITION: 'ui/endThemeTransition',
} as const;

/**
 * Type-safe action payloads for UI state updates
 */
export type UIActions = {
  setTheme: PayloadAction<Theme>;
  toggleSidebar: PayloadAction<void>;
  addNotification: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>;
  removeNotification: PayloadAction<string>;
  setLoading: PayloadAction<boolean>;
  setError: PayloadAction<string | null>;
  startThemeTransition: PayloadAction<void>;
  endThemeTransition: PayloadAction<void>;
};

/**
 * Default values for notification duration
 */
export const DEFAULT_NOTIFICATION_DURATION = 5000; // 5 seconds

/**
 * Theme transition duration in milliseconds
 */
export const THEME_TRANSITION_DURATION = 150; // 150ms as per specifications