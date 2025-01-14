/**
 * Authentication Reducer Tests
 * Version: 1.0.0
 * 
 * Comprehensive test suite for authentication reducer covering all state transitions,
 * security validations, and MFA flows.
 */

// Jest v29.5.0
import { describe, it, expect, beforeEach } from 'jest';

import authReducer from '../../src/store/auth/auth.reducer';
import { AuthActionTypes, IAuthState } from '../../src/store/auth/auth.types';

describe('authReducer', () => {
  // Mock data setup
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'USER',
    permissions: ['read:tasks', 'write:tasks'],
    mfaEnabled: true
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600
  };

  let initialState: IAuthState;

  beforeEach(() => {
    initialState = {
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
  });

  // Login Flow Tests
  describe('Login Flow', () => {
    it('should handle LOGIN_REQUEST', () => {
      const nextState = authReducer(initialState, {
        type: AuthActionTypes.LOGIN_REQUEST,
        payload: { email: 'test@example.com', password: 'password' }
      });

      expect(nextState).toEqual({
        ...initialState,
        loading: true,
        error: null
      });
    });

    it('should handle LOGIN_SUCCESS', () => {
      const action = {
        type: AuthActionTypes.LOGIN_SUCCESS,
        payload: { user: mockUser, tokens: mockTokens }
      };

      const nextState = authReducer(initialState, action);
      const expectedExpiration = expect.any(Number);

      expect(nextState).toEqual({
        ...initialState,
        user: mockUser,
        tokens: mockTokens,
        isAuthenticated: true,
        loading: false,
        error: null,
        tokenExpiration: expectedExpiration
      });
    });

    it('should handle LOGIN_FAILURE', () => {
      const errorMessage = 'Invalid credentials';
      const nextState = authReducer(initialState, {
        type: AuthActionTypes.LOGIN_FAILURE,
        payload: errorMessage
      });

      expect(nextState).toEqual({
        ...initialState,
        error: errorMessage
      });
    });
  });

  // MFA Flow Tests
  describe('MFA Flow', () => {
    it('should handle MFA_REQUIRED', () => {
      const mfaPayload = {
        mfaType: 'TOTP' as const,
        mfaToken: 'mfa-session-token'
      };

      const nextState = authReducer(initialState, {
        type: AuthActionTypes.MFA_REQUIRED,
        payload: mfaPayload
      });

      expect(nextState).toEqual({
        ...initialState,
        mfaRequired: true,
        mfaType: mfaPayload.mfaType,
        mfaToken: mfaPayload.mfaToken,
        loading: false,
        error: null
      });
    });

    it('should handle MFA_VERIFY', () => {
      const mfaState = {
        ...initialState,
        mfaRequired: true,
        mfaType: 'TOTP' as const,
        mfaToken: 'mfa-session-token'
      };

      const nextState = authReducer(mfaState, {
        type: AuthActionTypes.MFA_VERIFY,
        payload: { code: '123456', mfaToken: 'mfa-session-token' }
      });

      expect(nextState).toEqual({
        ...mfaState,
        loading: true,
        error: null
      });
    });

    it('should handle MFA_SUCCESS', () => {
      const mfaState = {
        ...initialState,
        mfaRequired: true,
        mfaType: 'TOTP' as const,
        mfaToken: 'mfa-session-token'
      };

      const action = {
        type: AuthActionTypes.MFA_SUCCESS,
        payload: { user: mockUser, tokens: mockTokens }
      };

      const nextState = authReducer(mfaState, action);
      const expectedExpiration = expect.any(Number);

      expect(nextState).toEqual({
        ...initialState,
        user: mockUser,
        tokens: mockTokens,
        isAuthenticated: true,
        mfaRequired: false,
        mfaType: null,
        mfaToken: null,
        loading: false,
        error: null,
        tokenExpiration: expectedExpiration
      });
    });

    it('should handle MFA_FAILURE', () => {
      const mfaState = {
        ...initialState,
        mfaRequired: true,
        mfaType: 'TOTP' as const,
        mfaToken: 'mfa-session-token'
      };

      const errorMessage = 'Invalid MFA code';
      const nextState = authReducer(mfaState, {
        type: AuthActionTypes.MFA_FAILURE,
        payload: errorMessage
      });

      expect(nextState).toEqual({
        ...mfaState,
        error: errorMessage,
        loading: false,
        mfaRequired: true
      });
    });
  });

  // Token Management Tests
  describe('Token Management', () => {
    it('should handle REFRESH_TOKEN with valid token', () => {
      const authenticatedState = {
        ...initialState,
        isAuthenticated: true,
        user: mockUser,
        tokens: mockTokens,
        tokenExpiration: Date.now() + 1000 // Valid token
      };

      const nextState = authReducer(authenticatedState, {
        type: AuthActionTypes.REFRESH_TOKEN,
        payload: mockTokens
      });

      expect(nextState).toEqual({
        ...authenticatedState,
        loading: true,
        error: null
      });
    });

    it('should handle REFRESH_TOKEN with expired token', () => {
      const authenticatedState = {
        ...initialState,
        isAuthenticated: true,
        user: mockUser,
        tokens: mockTokens,
        tokenExpiration: Date.now() - 1000 // Expired token
      };

      const nextState = authReducer(authenticatedState, {
        type: AuthActionTypes.REFRESH_TOKEN,
        payload: mockTokens
      });

      expect(nextState).toEqual(initialState);
    });
  });

  // Logout and Security Tests
  describe('Logout and Security', () => {
    it('should handle LOGOUT with secure state cleanup', () => {
      const authenticatedState = {
        ...initialState,
        isAuthenticated: true,
        user: mockUser,
        tokens: mockTokens,
        tokenExpiration: Date.now() + 1000
      };

      const nextState = authReducer(authenticatedState, {
        type: AuthActionTypes.LOGOUT
      });

      expect(nextState).toEqual(initialState);
      expect(nextState.tokens).toBeNull();
      expect(nextState.user).toBeNull();
    });

    it('should sanitize state when authentication is lost', () => {
      const authenticatedState = {
        ...initialState,
        isAuthenticated: true,
        user: mockUser,
        tokens: mockTokens
      };

      const nextState = authReducer(authenticatedState, {
        type: AuthActionTypes.LOGIN_FAILURE,
        payload: 'Session expired'
      });

      expect(nextState.user).toBeNull();
      expect(nextState.tokens).toBeNull();
      expect(nextState.isAuthenticated).toBeFalsy();
      expect(nextState.error).toBe('Session expired');
    });
  });
});