/**
 * Authentication and Authorization Interfaces
 * Version: 1.0.0
 * Implements comprehensive security controls for user authentication, authorization,
 * and multi-factor authentication following enterprise security best practices.
 */

/**
 * Represents user login credentials with device tracking for security
 */
export interface IAuthCredentials {
  email: string;
  password: string;
  clientId: string;
  deviceInfo: IDeviceInfo;
}

/**
 * Device identification and security tracking information
 */
export interface IDeviceInfo {
  userAgent: string;
  ipAddress: string;
  deviceId: string;
}

/**
 * Authenticated user data with security metadata
 */
export interface IAuthUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
  mfaEnabled: boolean;
  lastLogin: Date;
  securityLevel: number;
}

/**
 * JWT token data with enhanced security metadata
 */
export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string[];
}

/**
 * Multi-factor authentication verification data
 */
export interface IMFACredentials {
  userId: string;
  code: string;
  method: MFAMethod;
  timestamp: number;
}

/**
 * Complete authentication response including user data, tokens and MFA status
 */
export interface IAuthResponse {
  user: IAuthUser;
  tokens: IAuthTokens;
  mfaRequired: boolean;
  sessionId: string;
}

/**
 * User roles with hierarchical access levels
 * Follows principle of least privilege
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  TEAM_MEMBER = 'TEAM_MEMBER',
  GUEST = 'GUEST'
}

/**
 * Supported multi-factor authentication methods
 */
export enum MFAMethod {
  TOTP = 'TOTP',
  SMS = 'SMS',
  EMAIL = 'EMAIL'
}