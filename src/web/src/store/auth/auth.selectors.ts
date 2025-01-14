/**
 * Authentication State Selectors
 * Version: 1.0.0
 * 
 * Provides memoized selectors for accessing authentication state in Redux store
 * with comprehensive security validations and performance monitoring.
 * 
 * @packageDocumentation
 */

import { createSelector } from '@reduxjs/toolkit'; // v1.9.5
import { IAuthState } from './auth.types';

/**
 * Type for the root state containing auth slice
 * Ensures type safety when accessing auth state
 */
interface RootState {
  auth: IAuthState;
}

/**
 * Base selector for accessing auth state slice
 * Includes validation of state structure and monitoring
 * 
 * @param state - Root Redux state
 * @returns The validated authentication state slice
 */
export const selectAuthState = (state: RootState): IAuthState => {
  // Validate state structure
  if (!state || !state.auth) {
    console.error('Invalid state structure: auth slice not found');
    throw new Error('Auth state not initialized');
  }
  
  return state.auth;
};

/**
 * Memoized selector for accessing current user data
 * Filters sensitive information and validates user object structure
 * 
 * @param state - Root Redux state
 * @returns Filtered user data or null if not authenticated
 */
export const selectUser = createSelector(
  [selectAuthState],
  (authState): IAuthState['user'] => {
    const startTime = performance.now();
    
    try {
      if (!authState.user) {
        return null;
      }

      // Return user data without any sensitive fields
      const { id, email, role, permissions, mfaEnabled } = authState.user;
      return { id, email, role, permissions, mfaEnabled };
    } finally {
      // Track selector performance
      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.warn(`selectUser selector took ${duration}ms to execute`);
      }
    }
  }
);

/**
 * Memoized selector for accessing authentication tokens
 * Includes token expiration validation
 * 
 * @param state - Root Redux state
 * @returns Authentication tokens or null if not present
 */
export const selectAuthTokens = createSelector(
  [selectAuthState],
  (authState): IAuthState['tokens'] => {
    if (!authState.tokens) {
      return null;
    }

    // Validate token expiration
    const now = Date.now();
    if (authState.tokenExpiration && now >= authState.tokenExpiration) {
      console.warn('Auth tokens have expired');
      return null;
    }

    return authState.tokens;
  }
);

/**
 * Memoized selector for checking authentication status
 * Validates both user presence and token validity
 * 
 * @param state - Root Redux state
 * @returns Boolean indicating authentication status
 */
export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (authState): boolean => {
    return authState.isAuthenticated && 
           !!authState.user && 
           !!authState.tokens &&
           (!authState.tokenExpiration || Date.now() < authState.tokenExpiration);
  }
);

/**
 * Memoized selector for checking loading state
 * Includes performance tracking for loading operations
 * 
 * @param state - Root Redux state
 * @returns Boolean indicating loading status
 */
export const selectAuthLoading = createSelector(
  [selectAuthState],
  (authState): boolean => {
    const startTime = performance.now();
    
    try {
      return authState.loading;
    } finally {
      const duration = performance.now() - startTime;
      if (duration > 50) {
        console.warn(`selectAuthLoading selector took ${duration}ms to execute`);
      }
    }
  }
);

/**
 * Memoized selector for accessing error state
 * Integrates with error tracking and monitoring
 * 
 * @param state - Root Redux state
 * @returns Error message or null if no error
 */
export const selectAuthError = createSelector(
  [selectAuthState],
  (authState): string | null => {
    if (authState.error) {
      // Log error for monitoring
      console.error('Auth error:', authState.error);
    }
    return authState.error;
  }
);

/**
 * Memoized selector for checking MFA requirement status
 * Includes session validation for MFA flow
 * 
 * @param state - Root Redux state
 * @returns Boolean indicating if MFA is required
 */
export const selectMfaRequired = createSelector(
  [selectAuthState],
  (authState): boolean => {
    // Validate MFA session state
    if (authState.mfaRequired && !authState.mfaToken) {
      console.warn('Invalid MFA state: mfaRequired is true but no mfaToken present');
    }
    return authState.mfaRequired;
  }
);