// @reduxjs/toolkit version ^1.9.0
import { createSelector } from '@reduxjs/toolkit';
import type { UIState, Theme } from './ui.types';

/**
 * Type for the root state containing UI state slice
 */
interface RootState {
  ui: UIState;
}

/**
 * Base selector for accessing the UI state slice
 */
const selectUI = (state: RootState): UIState => state.ui;

/**
 * Memoized selector for theme preference with system detection support
 * Returns the current theme value, resolving system preference when needed
 */
export const selectTheme = createSelector(
  [selectUI],
  (ui): Theme => {
    if (ui.theme === 'system') {
      // Check system preference when theme is set to 'system'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return ui.theme;
  }
);

/**
 * Direct selector for sidebar visibility state
 * Not memoized for optimal performance on frequent updates
 */
export const selectSidebarOpen = (state: RootState): boolean => 
  state.ui.sidebarOpen;

/**
 * Memoized selector for notifications array
 * Returns readonly array to enforce immutability
 */
export const selectNotifications = createSelector(
  [selectUI],
  (ui) => ui.notifications
);

/**
 * Direct selector for global loading state
 * Not memoized to minimize overhead for frequent updates
 */
export const selectLoading = (state: RootState): boolean => 
  state.ui.loading;

/**
 * Direct selector for error state with null safety
 * Returns current error message or null
 */
export const selectError = (state: RootState): string | null => 
  state.ui.error;

/**
 * Memoized selector for theme transition state
 * Used for managing smooth theme transitions
 */
export const selectThemeTransition = createSelector(
  [selectUI],
  (ui) => ui.themeTransition
);

/**
 * Memoized selector for checking if any notifications exist
 * Useful for conditional rendering of notification containers
 */
export const selectHasNotifications = createSelector(
  [selectNotifications],
  (notifications) => notifications.length > 0
);

/**
 * Memoized selector for getting the most recent notification
 * Returns undefined if no notifications exist
 */
export const selectLatestNotification = createSelector(
  [selectNotifications],
  (notifications) => notifications[0]
);

/**
 * Memoized selector for filtering notifications by type
 * Returns readonly array of filtered notifications
 */
export const selectNotificationsByType = createSelector(
  [selectNotifications, (_: RootState, type: string) => type],
  (notifications, type) => 
    notifications.filter(notification => notification.type === type)
);