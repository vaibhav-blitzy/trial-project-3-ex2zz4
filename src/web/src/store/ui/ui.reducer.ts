// @reduxjs/toolkit version ^1.9.0
import { createReducer, PayloadAction } from '@reduxjs/toolkit';
import { UIState, UIActionTypes, Theme, Notification } from './ui.types';

/**
 * Initial UI state with system theme preference and default values
 */
const initialState: UIState = {
  theme: 'system',
  sidebarOpen: false,
  notifications: [],
  loading: false,
  error: null,
  themeTransition: false
};

/**
 * UI reducer handling all UI state mutations with immutable updates
 * Implements comprehensive theme management and notification handling
 */
const uiReducer = createReducer(initialState, (builder) => {
  builder
    // Theme management with transition support
    .addCase(UIActionTypes.SET_THEME, (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      state.themeTransition = true;
    })
    .addCase(UIActionTypes.START_THEME_TRANSITION, (state) => {
      state.themeTransition = true;
    })
    .addCase(UIActionTypes.END_THEME_TRANSITION, (state) => {
      state.themeTransition = false;
    })

    // Sidebar visibility toggle
    .addCase(UIActionTypes.TOGGLE_SIDEBAR, (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    })

    // Notification management
    .addCase(UIActionTypes.ADD_NOTIFICATION, (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const newNotification: Notification = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...action.payload
      };
      state.notifications = [...state.notifications, newNotification];
    })
    .addCase(UIActionTypes.REMOVE_NOTIFICATION, (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    })

    // Loading state management
    .addCase(UIActionTypes.SET_LOADING, (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    })

    // Error state management
    .addCase(UIActionTypes.SET_ERROR, (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      // Automatically create error notification if error is set
      if (action.payload) {
        const errorNotification: Notification = {
          id: crypto.randomUUID(),
          type: 'error',
          message: action.payload,
          timestamp: Date.now(),
          autoHide: true,
          duration: 5000
        };
        state.notifications = [...state.notifications, errorNotification];
      }
    });
});

export default uiReducer;