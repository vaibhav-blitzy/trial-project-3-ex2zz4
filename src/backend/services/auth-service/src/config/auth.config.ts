/**
 * Authentication Service Configuration
 * Version: 1.0.0
 * 
 * Comprehensive configuration for authentication service defining security policies,
 * authentication methods, session management, and rate limiting controls.
 * Implements enterprise-grade security standards and best practices.
 */

// External imports
import { config } from 'dotenv'; // v16.0.3
import { UserRole } from '../../../shared/interfaces/auth.interface';

// Initialize environment variables
config();

/**
 * Main authentication configuration object defining all security policies
 * and authentication-related settings for the Task Management System
 */
export const authConfig = {
  /**
   * Password policy configuration implementing enterprise security standards
   * with Argon2id hashing and comprehensive complexity requirements
   */
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAttempts: 5,
    lockoutDuration: 900, // 15 minutes in seconds
    hashingAlgorithm: 'argon2id',
    saltRounds: 12,
    passwordHistory: 5, // Number of previous passwords to remember
    expiryDays: 90, // Password expiration period
    preventCommonPasswords: true
  },

  /**
   * Multi-Factor Authentication (MFA) settings
   * Implements TOTP-based authentication with backup codes
   */
  mfaSettings: {
    enabled: true,
    defaultMethod: 'TOTP',
    issuer: 'TaskManagementSystem',
    validityWindow: 30, // Seconds
    codeLength: 6,
    backupCodesCount: 10,
    backupCodesLength: 12,
    allowRememberDevice: true,
    rememberDeviceDuration: 30 // Days
  },

  /**
   * Session management configuration with JWT-based authentication
   * and comprehensive device tracking
   */
  sessionConfig: {
    maxActiveSessions: 5,
    sessionDuration: 3600, // 1 hour in seconds
    refreshTokenDuration: 604800, // 7 days in seconds
    sessionInactivityTimeout: 900, // 15 minutes in seconds
    enforceUniqueDevices: true,
    jwtAlgorithm: 'RS256',
    jwtIssuer: 'task-management-system',
    deviceTracking: {
      enabled: true,
      trackLocation: true,
      trackUserAgent: true
    }
  },

  /**
   * OAuth 2.0 configuration for SSO integration
   * Supports multiple identity providers with domain restrictions
   */
  oauth2Config: {
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL,
        scopes: ['email', 'profile']
      },
      microsoft: {
        clientId: process.env.MS_CLIENT_ID,
        clientSecret: process.env.MS_CLIENT_SECRET,
        callbackUrl: process.env.MS_CALLBACK_URL,
        scopes: ['user.read', 'email']
      }
    },
    defaultProvider: 'google',
    allowedDomains: process.env.ALLOWED_DOMAINS?.split(',') || [],
    enforceEmailVerification: true
  },

  /**
   * Rate limiting configuration to prevent brute force attacks
   * and ensure system stability
   */
  rateLimiting: {
    login: {
      windowMs: 900000, // 15 minutes
      maxAttempts: 5,
      blockDuration: 3600000 // 1 hour
    },
    passwordReset: {
      windowMs: 3600000, // 1 hour
      maxAttempts: 3,
      blockDuration: 86400000 // 24 hours
    },
    mfaVerification: {
      windowMs: 300000, // 5 minutes
      maxAttempts: 3,
      blockDuration: 1800000 // 30 minutes
    },
    apiRequests: {
      windowMs: 60000, // 1 minute
      maxRequests: 100
    }
  },

  /**
   * Role-based access control configuration
   * Defines access levels and permissions for different user roles
   */
  roleHierarchy: {
    [UserRole.ADMIN]: {
      level: 100,
      inherits: [UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.GUEST]
    },
    [UserRole.PROJECT_MANAGER]: {
      level: 75,
      inherits: [UserRole.TEAM_MEMBER, UserRole.GUEST]
    },
    [UserRole.TEAM_MEMBER]: {
      level: 50,
      inherits: [UserRole.GUEST]
    },
    [UserRole.GUEST]: {
      level: 25,
      inherits: []
    }
  }
};

/**
 * Validates a password against the configured password policy
 * @param password - Password to validate
 * @param passwordHistory - Array of previous password hashes
 * @returns Validation result with success status and error messages
 */
export const validatePasswordPolicy = (
  password: string,
  passwordHistory: string[]
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const { passwordPolicy } = authConfig;

  // Check minimum length
  if (password.length < passwordPolicy.minLength) {
    errors.push(`Password must be at least ${passwordPolicy.minLength} characters long`);
  }

  // Check complexity requirements
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};