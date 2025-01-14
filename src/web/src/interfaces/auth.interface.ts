/**
 * Authentication and Authorization Interfaces
 * Version: 1.0.0
 * 
 * Defines comprehensive TypeScript interfaces and enums for authentication,
 * authorization, and security-related data structures used throughout the
 * frontend application.
 */

/**
 * Enum defining user roles for role-based access control (RBAC)
 * Aligned with the system's authorization matrix
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  TEAM_MEMBER = 'TEAM_MEMBER',
  GUEST = 'GUEST'
}

/**
 * Enum defining supported multi-factor authentication methods
 * Based on security requirements specification
 */
export enum MFAMethod {
  TOTP = 'TOTP', // Time-based One-Time Password
  SMS = 'SMS'    // SMS-based verification
}

/**
 * Interface for user login credentials
 * Used in login forms and authentication requests
 */
export interface ILoginCredentials {
  email: string;
  password: string;
}

/**
 * Interface for authenticated user data
 * Includes role-based access control and MFA status
 */
export interface IAuthUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
  mfaEnabled: boolean;
}

/**
 * Interface for JWT authentication tokens
 * Supports secure session management with refresh token rotation
 */
export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Interface for authentication API responses
 * Combines user data, tokens, and MFA status
 */
export interface IAuthResponse {
  user: IAuthUser;
  tokens: IAuthTokens;
  mfaRequired: boolean;
}

/**
 * Interface for multi-factor authentication verification
 * Supports multiple MFA methods as defined in security architecture
 */
export interface IMFACredentials {
  userId: string;
  code: string;
  method: MFAMethod;
}