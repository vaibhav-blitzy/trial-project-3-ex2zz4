/**
 * Authentication Action Creators
 * Version: 1.0.0
 * 
 * Implements secure Redux action creators for authentication operations including
 * login, OAuth, MFA, and session management with enhanced security monitoring.
 */

import { createAsyncThunk } from '@reduxjs/toolkit'; // v1.9.5
import { RateLimiter } from 'limiter'; // v5.1.0
import { SecurityLogger } from '@security/logger'; // v2.0.0

import { AuthActionTypes } from './auth.types';
import { AuthService } from '../../services/auth.service';
import {
  ILoginCredentials,
  IAuthResponse,
  IAuthTokens,
  MFAMethod
} from '../../interfaces/auth.interface';

// Security configuration
const LOGIN_RATE_LIMIT = {
  attempts: 5,
  interval: 15 * 60 * 1000 // 15 minutes
};

// Initialize rate limiter for login attempts
const loginRateLimiter = new RateLimiter({
  tokensPerInterval: LOGIN_RATE_LIMIT.attempts,
  interval: LOGIN_RATE_LIMIT.interval
});

// Initialize security logger
const securityLogger = new SecurityLogger({
  service: 'auth-actions',
  environment: process.env.NODE_ENV
});

/**
 * Enhanced login action creator with rate limiting and security monitoring
 */
export const login = createAsyncThunk(
  AuthActionTypes.LOGIN_REQUEST,
  async (credentials: ILoginCredentials, { rejectWithValue }) => {
    try {
      // Check rate limiting
      if (!await loginRateLimiter.tryRemoveTokens(1)) {
        securityLogger.warn('Rate limit exceeded for login attempts', {
          email: credentials.email,
          ipAddress: window.clientInformation?.platform
        });
        return rejectWithValue('Too many login attempts. Please try again later.');
      }

      // Log authentication attempt
      securityLogger.info('Login attempt', {
        email: credentials.email,
        timestamp: new Date().toISOString()
      });

      const authService = new AuthService(null); // Inject API service in actual implementation
      const response: IAuthResponse = await authService.login(credentials);

      // Validate response and tokens
      if (!response.tokens || !response.user) {
        throw new Error('Invalid authentication response');
      }

      // Handle MFA requirement
      if (response.mfaRequired) {
        return {
          type: AuthActionTypes.MFA_REQUIRED,
          payload: {
            mfaToken: response.tokens.accessToken,
            mfaType: 'TOTP'
          }
        };
      }

      // Log successful authentication
      securityLogger.info('Login successful', {
        userId: response.user.id,
        email: response.user.email,
        role: response.user.role
      });

      return response;
    } catch (error) {
      // Log authentication failure
      securityLogger.error('Login failed', {
        email: credentials.email,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return rejectWithValue(error.message || 'Authentication failed');
    }
  }
);

/**
 * OAuth login action creator with enhanced security validation
 */
export const oauthLogin = createAsyncThunk(
  AuthActionTypes.OAUTH_LOGIN_REQUEST,
  async (oauthCredentials: { code: string; state: string }, { rejectWithValue }) => {
    try {
      // Validate OAuth state parameter
      const storedState = sessionStorage.getItem('oauth_state');
      if (oauthCredentials.state !== storedState) {
        throw new Error('Invalid OAuth state parameter');
      }

      const authService = new AuthService(null);
      const response = await authService.verifyMFA(
        oauthCredentials.code,
        MFAMethod.TOTP
      );

      // Log OAuth authentication
      securityLogger.info('OAuth login successful', {
        userId: response.user.id,
        provider: 'oauth2'
      });

      return response;
    } catch (error) {
      securityLogger.error('OAuth login failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Session validation action creator with token refresh
 */
export const validateSession = createAsyncThunk(
  'auth/validateSession',
  async (_, { rejectWithValue }) => {
    try {
      const authService = new AuthService(null);
      
      if (!authService.isAuthenticated()) {
        throw new Error('Session expired');
      }

      // Attempt token refresh
      const tokens: IAuthTokens = await authService.refreshToken();

      securityLogger.info('Session validated and token refreshed', {
        userId: authService.getCurrentUser()?.id,
        timestamp: new Date().toISOString()
      });

      return { tokens };
    } catch (error) {
      securityLogger.warn('Session validation failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return rejectWithValue('Session expired');
    }
  }
);

/**
 * MFA verification action creator
 */
export const verifyMFA = createAsyncThunk(
  AuthActionTypes.MFA_VERIFY,
  async (
    { code, mfaToken }: { code: string; mfaToken: string },
    { rejectWithValue }
  ) => {
    try {
      const authService = new AuthService(null);
      const response = await authService.verifyMFA(code, MFAMethod.TOTP);

      securityLogger.info('MFA verification successful', {
        userId: response.user.id,
        method: MFAMethod.TOTP
      });

      return response;
    } catch (error) {
      securityLogger.error('MFA verification failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Logout action creator with session cleanup
 */
export const logout = createAsyncThunk(
  AuthActionTypes.LOGOUT,
  async (_, { rejectWithValue }) => {
    try {
      const authService = new AuthService(null);
      await authService.logout();

      // Broadcast logout to other tabs
      localStorage.setItem('logout', Date.now().toString());

      securityLogger.info('User logged out successfully', {
        timestamp: new Date().toISOString()
      });

      return;
    } catch (error) {
      securityLogger.error('Logout failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return rejectWithValue(error.message);
    }
  }
);