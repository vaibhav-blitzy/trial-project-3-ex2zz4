/**
 * JWT Configuration Module
 * Version: 1.0.0
 * Implements secure token management with RS256 signing, separate access and refresh token handling,
 * and configurable token parameters for enterprise-grade security.
 */

import { IAuthTokens } from '../../shared/interfaces/auth.interface';
import * as jwt from 'jsonwebtoken'; // v9.0.0

// Validate and load required environment variables for JWT secrets
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || (() => {
  throw new Error('JWT_ACCESS_SECRET must be defined');
})();

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (() => {
  throw new Error('JWT_REFRESH_SECRET must be defined');
})();

// Load configurable JWT parameters with secure defaults
const JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || '15m';
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '7d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'task-management-system';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'task-management-users';

/**
 * Comprehensive interface defining JWT configuration structure
 * Includes all required parameters for both access and refresh tokens
 */
export interface IJWTConfig {
  accessToken: {
    secret: string;
    expiresIn: string;
    algorithm: string;
  };
  refreshToken: {
    secret: string;
    expiresIn: string;
    algorithm: string;
  };
  issuer: string;
  audience: string;
  clockTolerance: number; // Tolerance for clock skew in seconds
  maxAge: string; // Maximum allowed age for tokens
}

/**
 * JWT configuration object implementing enterprise security standards
 * Uses RS256 asymmetric encryption for enhanced security
 * Implements separate configurations for access and refresh tokens
 */
export const jwtConfig: IJWTConfig = {
  accessToken: {
    secret: JWT_ACCESS_SECRET,
    expiresIn: JWT_ACCESS_EXPIRATION,
    algorithm: 'RS256' // Using asymmetric encryption for enhanced security
  },
  refreshToken: {
    secret: JWT_REFRESH_SECRET,
    expiresIn: JWT_REFRESH_EXPIRATION,
    algorithm: 'RS256' // Using asymmetric encryption for enhanced security
  },
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
  clockTolerance: 30, // 30 seconds tolerance for clock skew
  maxAge: '7d' // Maximum token age for security
};

/**
 * JWT signing options for token generation
 * Implements security best practices for token claims
 */
export const jwtSignOptions: jwt.SignOptions = {
  algorithm: 'RS256',
  issuer: jwtConfig.issuer,
  audience: jwtConfig.audience,
  expiresIn: jwtConfig.accessToken.expiresIn
};

/**
 * JWT verification options for token validation
 * Implements strict security checks for token acceptance
 */
export const jwtVerifyOptions: jwt.VerifyOptions = {
  algorithms: ['RS256'],
  issuer: jwtConfig.issuer,
  audience: jwtConfig.audience,
  clockTolerance: jwtConfig.clockTolerance,
  maxAge: jwtConfig.maxAge
};

/**
 * Validates JWT configuration for required security parameters
 * Throws error if critical security configurations are missing
 */
const validateJWTConfig = (): void => {
  if (!jwtConfig.accessToken.secret || !jwtConfig.refreshToken.secret) {
    throw new Error('JWT secrets must be defined');
  }

  if (!jwtConfig.accessToken.expiresIn || !jwtConfig.refreshToken.expiresIn) {
    throw new Error('JWT expiration times must be defined');
  }

  if (!jwtConfig.issuer || !jwtConfig.audience) {
    throw new Error('JWT issuer and audience must be defined');
  }
};

// Validate JWT configuration on module load
validateJWTConfig();

export default jwtConfig;