/**
 * Root Redux Store Configuration
 * Implements centralized state management using Redux Toolkit with comprehensive
 * type safety, middleware configuration, and performance optimizations.
 * @version 1.0.0
 */

import { configureStore, Middleware } from '@reduxjs/toolkit'; // ^1.9.5
import thunk from 'redux-thunk'; // ^2.4.2

// Import reducers
import authReducer from './auth/auth.reducer';
import projectsReducer from './projects/projects.reducer';
import tasksReducer from './tasks/tasks.reducer';

/**
 * Custom middleware for performance monitoring
 */
const performanceMiddleware: Middleware = () => (next) => (action) => {
  const start = performance.now();
  const result = next(action);
  const end = performance.now();
  const duration = end - start;

  // Log performance metrics for actions taking longer than 16ms (1 frame)
  if (duration > 16) {
    console.warn(`Slow action: ${action.type} took ${duration.toFixed(2)}ms`);
  }

  return result;
};

/**
 * Custom middleware for error tracking
 */
const errorMiddleware: Middleware = () => (next) => (action) => {
  try {
    return next(action);
  } catch (error) {
    console.error('Redux Error:', {
      action,
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

/**
 * Redux DevTools configuration with performance tracing
 */
const devToolsOptions = {
  trace: true,
  traceLimit: 25,
  actionsDenylist: ['@redux/INIT'], // Exclude noisy actions
};

/**
 * Configure Redux store with combined reducers and middleware
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectsReducer,
    tasks: tasksReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: {
      // Ignore specific paths for non-serializable values
      ignoredActions: ['auth/loginSuccess', 'projects/setDateRange'],
      ignoredPaths: ['auth.tokens', 'projects.filters.dateRange']
    },
    thunk: {
      extraArgument: {
        // Add any extra arguments for thunk middleware
      }
    }
  }).concat([
    thunk,
    performanceMiddleware,
    errorMiddleware
  ]),
  devTools: process.env.NODE_ENV !== 'production' ? devToolsOptions : false,
  preloadedState: undefined, // Initial state is handled by individual reducers
  enhancers: (defaultEnhancers) => defaultEnhancers // Use default enhancers
});

/**
 * Type-safe store configuration exports
 */

/**
 * Type definition for the complete application state
 * Provides type safety for state access throughout the application
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * Type definition for the store's dispatch function
 * Ensures type safety when dispatching actions
 */
export type AppDispatch = typeof store.dispatch;

/**
 * Enable hot module replacement for reducers in development
 */
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept(['./auth/auth.reducer', './projects/projects.reducer', './tasks/tasks.reducer'], () => {
    const newRootReducer = {
      auth: require('./auth/auth.reducer').default,
      projects: require('./projects/projects.reducer').default,
      tasks: require('./tasks/tasks.reducer').default
    };
    store.replaceReducer(newRootReducer);
  });
}

export default store;