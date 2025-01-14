/**
 * Frontend Authentication Configuration
 * Version: 1.0.0
 * 
 * Defines comprehensive authentication and authorization settings for the frontend application
 * including token management, session handling, OAuth2 providers, and role-based access control.
 */

import { IAuthTokens, UserRole } from '../interfaces/auth.interface';
import jwtDecode from 'jwt-decode'; // v3.1.2

/**
 * Validates JWT token expiration with additional security checks
 * @param token - JWT token to validate
 * @returns boolean indicating if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    // Validate token format
    const tokenRegex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$/;
    if (!tokenRegex.test(token)) {
      return true;
    }

    const decoded = jwtDecode<{ exp: number; alg: string }>(token);

    // Validate token algorithm
    if (decoded.alg !== 'RS256') {
      return true;
    }

    // Add 30-second safety margin for clock skew
    const safetyMargin = 30;
    const currentTime = Math.floor(Date.now() / 1000);
    
    return decoded.exp <= currentTime + safetyMargin;
  } catch {
    return true;
  }
};

/**
 * Determines if token should be refreshed based on configuration thresholds
 * @param tokens - Current authentication tokens
 * @returns boolean indicating if refresh is needed
 */
export const shouldRefreshToken = (tokens: IAuthTokens): boolean => {
  const currentTime = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = tokens.expiresIn - currentTime;
  
  return timeUntilExpiry <= authConfig.tokenConfig.refreshThreshold;
};

/**
 * Main authentication configuration object
 * Contains comprehensive settings for authentication and authorization
 */
export const authConfig = {
  /**
   * Token management configuration
   */
  tokenConfig: {
    storageKey: 'auth_tokens',
    tokenType: 'Bearer',
    refreshThreshold: 300, // Refresh token 5 minutes before expiry
    maxRefreshAttempts: 3
  },

  /**
   * Session management configuration
   */
  sessionConfig: {
    inactivityTimeout: 900, // 15 minutes
    maxConcurrentSessions: 5,
    persistSession: true,
    sessionStorageKey: 'user_session',
    sessionSyncInterval: 60, // Sync every minute
    forceLogoutEnabled: true,
    conflictResolutionStrategy: 'last-active-wins',
    mfaSessionDuration: 3600 // 1 hour
  },

  /**
   * OAuth2 provider configuration
   */
  oauth2Config: {
    providers: {
      google: {
        clientId: process.env.VITE_GOOGLE_CLIENT_ID,
        redirectUri: process.env.VITE_GOOGLE_REDIRECT_URI,
        scopes: ['email', 'profile']
      },
      microsoft: {
        clientId: process.env.VITE_MS_CLIENT_ID,
        redirectUri: process.env.VITE_MS_REDIRECT_URI,
        scopes: ['user.read', 'email']
      }
    },
    defaultProvider: 'google',
    stateValidityDuration: 600, // 10 minutes
    pkceEnabled: true,
    errorHandling: {
      retryAttempts: 3,
      retryDelay: 1000 // 1 second
    }
  },

  /**
   * Role-based access control configuration
   */
  roleConfig: {
    defaultRole: UserRole.GUEST,
    roleHierarchy: {
      [UserRole.ADMIN]: 3,
      [UserRole.PROJECT_MANAGER]: 2,
      [UserRole.TEAM_MEMBER]: 1,
      [UserRole.GUEST]: 0
    },
    inheritanceMap: {
      [UserRole.ADMIN]: [UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.GUEST],
      [UserRole.PROJECT_MANAGER]: [UserRole.TEAM_MEMBER, UserRole.GUEST],
      [UserRole.TEAM_MEMBER]: [UserRole.GUEST],
      [UserRole.GUEST]: []
    },
    roleValidation: {
      enabled: true,
      validateOnAccess: true,
      cacheResults: true,
      cacheDuration: 300 // 5 minutes
    }
  }
} as const;

// Type assertion to ensure configuration immutability
Object.freeze(authConfig);
export default authConfig;