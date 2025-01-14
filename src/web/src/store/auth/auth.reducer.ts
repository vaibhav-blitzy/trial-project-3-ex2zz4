/**
 * Authentication Reducer
 * Version: 1.0.0
 * 
 * Manages authentication state with comprehensive security measures including
 * MFA support, token management, and secure state cleanup.
 */

import { createReducer } from '@reduxjs/toolkit'; // v1.9.5
import { 
  AuthActionTypes,
  IAuthState,
  AuthAction
} from './auth.types';

/**
 * Initial authentication state with secure defaults
 */
const initialState: IAuthState = {
  user: null,
  tokens: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  mfaRequired: false,
  mfaType: null,
  mfaToken: null,
  tokenExpiration: null
};

/**
 * Helper function to validate token expiration
 */
const isTokenValid = (expiration: number | null): boolean => {
  if (!expiration) return false;
  return expiration > Date.now();
};

/**
 * Helper function to sanitize state before updates
 * Prevents sensitive data leaks and ensures state integrity
 */
const sanitizeState = (state: IAuthState): IAuthState => {
  if (!state.isAuthenticated) {
    return {
      ...initialState,
      error: state.error // Preserve error messages
    };
  }
  return state;
};

/**
 * Authentication reducer with comprehensive security measures
 */
const authReducer = createReducer(initialState, (builder) => {
  builder
    // Handle login request
    .addCase(AuthActionTypes.LOGIN_REQUEST, (state) => {
      return sanitizeState({
        ...state,
        loading: true,
        error: null,
        isAuthenticated: false,
        mfaRequired: false
      });
    })

    // Handle successful login
    .addCase(AuthActionTypes.LOGIN_SUCCESS, (state, action) => {
      const { user, tokens } = action.payload;
      const tokenExpiration = Date.now() + (tokens.expiresIn * 1000);

      return sanitizeState({
        ...state,
        user,
        tokens,
        tokenExpiration,
        isAuthenticated: true,
        loading: false,
        error: null
      });
    })

    // Handle login failure
    .addCase(AuthActionTypes.LOGIN_FAILURE, (state, action) => {
      return sanitizeState({
        ...initialState,
        error: action.payload
      });
    })

    // Handle logout - secure cleanup
    .addCase(AuthActionTypes.LOGOUT, () => {
      // Perform secure state cleanup
      return { ...initialState };
    })

    // Handle token refresh request
    .addCase(AuthActionTypes.REFRESH_TOKEN, (state) => {
      if (!isTokenValid(state.tokenExpiration)) {
        // Token expired, force logout
        return { ...initialState };
      }
      return {
        ...state,
        loading: true,
        error: null
      };
    })

    // Handle MFA requirement
    .addCase(AuthActionTypes.MFA_REQUIRED, (state, action) => {
      const { mfaType, mfaToken } = action.payload;
      return sanitizeState({
        ...state,
        mfaRequired: true,
        mfaType,
        mfaToken,
        loading: false,
        error: null
      });
    })

    // Handle MFA verification attempt
    .addCase(AuthActionTypes.MFA_VERIFY, (state) => {
      return sanitizeState({
        ...state,
        loading: true,
        error: null
      });
    })

    // Handle successful MFA verification
    .addCase(AuthActionTypes.MFA_SUCCESS, (state, action) => {
      const { user, tokens } = action.payload;
      const tokenExpiration = Date.now() + (tokens.expiresIn * 1000);

      return sanitizeState({
        ...state,
        user,
        tokens,
        tokenExpiration,
        isAuthenticated: true,
        mfaRequired: false,
        mfaType: null,
        mfaToken: null,
        loading: false,
        error: null
      });
    })

    // Handle MFA verification failure
    .addCase(AuthActionTypes.MFA_FAILURE, (state, action) => {
      return sanitizeState({
        ...state,
        error: action.payload,
        loading: false,
        // Preserve MFA state for retry
        mfaRequired: true
      });
    });
});

export default authReducer;