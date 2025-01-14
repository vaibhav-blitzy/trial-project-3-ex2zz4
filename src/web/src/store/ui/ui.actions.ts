// @reduxjs/toolkit version ^1.9.0
import { createAction } from '@reduxjs/toolkit';
import {
  UIActionTypes,
  Theme,
  Notification,
  DEFAULT_NOTIFICATION_DURATION,
  THEME_TRANSITION_DURATION,
} from './ui.types';

/**
 * Action creator for setting the application theme with transition support
 * Handles theme persistence and smooth transitions
 */
export const setTheme = createAction<Theme>(UIActionTypes.SET_THEME, (theme) => {
  // Store theme preference in localStorage for persistence
  localStorage.setItem('theme-preference', theme);
  return { payload: theme };
});

/**
 * Action creator for initiating theme transition animation
 * Used to trigger CSS transitions for smooth theme changes
 */
export const startThemeTransition = createAction(UIActionTypes.START_THEME_TRANSITION);

/**
 * Action creator for completing theme transition animation
 * Called after transition duration to cleanup transition state
 */
export const endThemeTransition = createAction(UIActionTypes.END_THEME_TRANSITION);

/**
 * Action creator for toggling sidebar visibility
 * Supports responsive behavior based on viewport size
 */
export const toggleSidebar = createAction(UIActionTypes.TOGGLE_SIDEBAR);

/**
 * Action creator for adding notifications with auto-hide support
 * Generates unique IDs and handles notification queue management
 */
export const addNotification = createAction<Omit<Notification, 'id' | 'timestamp'>>(
  UIActionTypes.ADD_NOTIFICATION,
  (notification) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    
    return {
      payload: {
        ...notification,
        id,
        timestamp,
        autoHide: notification.autoHide ?? true,
        duration: notification.duration ?? DEFAULT_NOTIFICATION_DURATION,
      },
    };
  }
);

/**
 * Action creator for removing notifications
 * Handles cleanup of notification timers and resources
 */
export const removeNotification = createAction<string>(UIActionTypes.REMOVE_NOTIFICATION);

/**
 * Action creator for managing global loading state
 * Supports concurrent loading operations
 */
export const setLoading = createAction<boolean>(UIActionTypes.SET_LOADING);

/**
 * Action creator for handling global error state
 * Supports error message translation and error tracking
 */
export const setError = createAction<string | null>(
  UIActionTypes.SET_ERROR,
  (error) => ({
    payload: error ? error : null, // Normalize null errors
  })
);

/**
 * Thunk action creator for theme changes with transition handling
 * Manages the complete theme transition lifecycle
 */
export const changeThemeWithTransition = (theme: Theme) => async (dispatch: any) => {
  dispatch(startThemeTransition());
  dispatch(setTheme(theme));
  
  // Wait for transition to complete before ending transition state
  setTimeout(() => {
    dispatch(endThemeTransition());
  }, THEME_TRANSITION_DURATION);
};

/**
 * Thunk action creator for notifications with auto-hide
 * Handles automatic removal of notifications after duration
 */
export const addNotificationWithAutoHide = (
  notification: Omit<Notification, 'id' | 'timestamp'>
) => async (dispatch: any) => {
  const actionResult = dispatch(addNotification(notification));
  const { id, autoHide, duration } = actionResult.payload;

  if (autoHide) {
    setTimeout(() => {
      dispatch(removeNotification(id));
    }, duration);
  }
  
  return actionResult;
};