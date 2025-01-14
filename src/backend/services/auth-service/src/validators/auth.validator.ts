/**
 * Authentication Service Validators
 * Version: 1.0.0
 * Implements comprehensive validation schemas and functions for authentication-related data
 * with enhanced security features including device fingerprinting and rate limiting
 */

import Joi from 'joi'; // v17.9.0
import zxcvbn from 'zxcvbn'; // v4.4.2
import disposableEmailDomains from 'disposable-email-domains'; // v1.0.62
import winston from 'winston'; // v3.8.2
import { IAuthCredentials, IMFACredentials } from '../../../shared/interfaces/auth.interface';
import { validateAuthCredentials as commonValidateAuth } from '../../../shared/validators/common.validator';

// Validation Constants
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 100;
const MFA_CODE_LENGTH = 6;
const ALLOWED_MFA_METHODS = ['totp', 'sms'];
const MAX_VALIDATION_ATTEMPTS = 5;
const VALIDATION_COOLDOWN_MS = 30000;
const CACHE_TTL_MS = 300000;
const MIN_PASSWORD_STRENGTH = 3;

// Initialize security logger
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'auth-validator' },
  transports: [
    new winston.transports.File({ filename: 'security-audit.log' })
  ]
});

/**
 * Enhanced login credentials validation schema
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .max(255)
    .custom((value, helpers) => {
      const domain = value.split('@')[1];
      if (disposableEmailDomains.includes(domain)) {
        return helpers.error('Disposable email domains not allowed');
      }
      return value;
    }),
  password: Joi.string()
    .required()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH),
  deviceInfo: Joi.object({
    userAgent: Joi.string().required().max(500),
    ipAddress: Joi.string().ip().required(),
    deviceId: Joi.string().required().max(100),
    fingerprint: Joi.string().required().max(1000)
  }).required()
}).options({ stripUnknown: true });

/**
 * Enhanced registration validation schema
 */
export const registrationSchema = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .max(255)
    .custom((value, helpers) => {
      const domain = value.split('@')[1];
      if (disposableEmailDomains.includes(domain)) {
        return helpers.error('Disposable email domains not allowed');
      }
      return value;
    }),
  password: Joi.string()
    .required()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH),
  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('password')),
  deviceInfo: Joi.object({
    userAgent: Joi.string().required().max(500),
    ipAddress: Joi.string().ip().required(),
    deviceId: Joi.string().required().max(100),
    fingerprint: Joi.string().required().max(1000)
  }).required()
}).options({ stripUnknown: true });

/**
 * Enhanced password reset validation schema
 */
export const passwordResetSchema = Joi.object({
  token: Joi.string().required().max(500),
  newPassword: Joi.string()
    .required()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH),
  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('newPassword')),
  deviceInfo: Joi.object({
    userAgent: Joi.string().required().max(500),
    ipAddress: Joi.string().ip().required(),
    deviceId: Joi.string().required().max(100)
  }).required()
}).options({ stripUnknown: true });

/**
 * Enhanced MFA verification validation schema
 */
export const mfaVerificationSchema = Joi.object({
  userId: Joi.string().required().uuid(),
  code: Joi.string()
    .required()
    .length(MFA_CODE_LENGTH)
    .pattern(/^[0-9]+$/),
  method: Joi.string()
    .required()
    .valid(...ALLOWED_MFA_METHODS),
  timestamp: Joi.number()
    .required()
    .max(Date.now())
}).options({ stripUnknown: true });

/**
 * Validates login credentials with enhanced security checks
 */
export const validateLoginCredentials = async (credentials: IAuthCredentials): Promise<ValidationResult> => {
  try {
    // Rate limiting check
    await checkRateLimiting(credentials.deviceInfo.ipAddress, 'login');

    // Validate using common validator first
    await commonValidateAuth(credentials);

    // Enhanced validation with Joi schema
    const { error } = loginSchema.validate(credentials);
    if (error) {
      throw new Error(error.details[0].message);
    }

    // Password strength check
    const strength = zxcvbn(credentials.password);
    if (strength.score < MIN_PASSWORD_STRENGTH) {
      throw new Error('Password does not meet minimum strength requirements');
    }

    // Log successful validation
    securityLogger.info('Login validation successful', {
      ip: credentials.deviceInfo.ipAddress,
      deviceId: credentials.deviceInfo.deviceId
    });

    return { isValid: true };
  } catch (error) {
    securityLogger.warn('Login validation failed', {
      error: error.message,
      ip: credentials.deviceInfo.ipAddress
    });
    return { isValid: false, message: error.message };
  }
};

/**
 * Validates registration data with comprehensive security checks
 */
export const validateRegistrationData = async (registrationData: any): Promise<ValidationResult> => {
  try {
    // Rate limiting check
    await checkRateLimiting(registrationData.deviceInfo.ipAddress, 'registration');

    // Enhanced validation with Joi schema
    const { error } = registrationSchema.validate(registrationData);
    if (error) {
      throw new Error(error.details[0].message);
    }

    // Password strength check
    const strength = zxcvbn(registrationData.password);
    if (strength.score < MIN_PASSWORD_STRENGTH) {
      throw new Error('Password does not meet minimum strength requirements');
    }

    // Log successful validation
    securityLogger.info('Registration validation successful', {
      ip: registrationData.deviceInfo.ipAddress
    });

    return { isValid: true };
  } catch (error) {
    securityLogger.warn('Registration validation failed', {
      error: error.message,
      ip: registrationData.deviceInfo.ipAddress
    });
    return { isValid: false, message: error.message };
  }
};

/**
 * Validates password reset request with security checks
 */
export const validatePasswordReset = async (resetData: any): Promise<ValidationResult> => {
  try {
    // Rate limiting check
    await checkRateLimiting(resetData.deviceInfo.ipAddress, 'password-reset');

    // Enhanced validation with Joi schema
    const { error } = passwordResetSchema.validate(resetData);
    if (error) {
      throw new Error(error.details[0].message);
    }

    // Password strength check
    const strength = zxcvbn(resetData.newPassword);
    if (strength.score < MIN_PASSWORD_STRENGTH) {
      throw new Error('New password does not meet minimum strength requirements');
    }

    // Log successful validation
    securityLogger.info('Password reset validation successful', {
      ip: resetData.deviceInfo.ipAddress
    });

    return { isValid: true };
  } catch (error) {
    securityLogger.warn('Password reset validation failed', {
      error: error.message,
      ip: resetData.deviceInfo.ipAddress
    });
    return { isValid: false, message: error.message };
  }
};

/**
 * Validates MFA verification with enhanced security
 */
export const validateMFAVerification = async (mfaData: IMFACredentials): Promise<ValidationResult> => {
  try {
    // Rate limiting check
    await checkRateLimiting(mfaData.userId, 'mfa');

    // Enhanced validation with Joi schema
    const { error } = mfaVerificationSchema.validate(mfaData);
    if (error) {
      throw new Error(error.details[0].message);
    }

    // Validate timestamp is within acceptable window
    const timeDiff = Date.now() - mfaData.timestamp;
    if (timeDiff > VALIDATION_COOLDOWN_MS) {
      throw new Error('MFA code has expired');
    }

    // Log successful validation
    securityLogger.info('MFA validation successful', {
      userId: mfaData.userId,
      method: mfaData.method
    });

    return { isValid: true };
  } catch (error) {
    securityLogger.warn('MFA validation failed', {
      error: error.message,
      userId: mfaData.userId
    });
    return { isValid: false, message: error.message };
  }
};

/**
 * Helper function to check rate limiting
 */
const checkRateLimiting = async (identifier: string, action: string): Promise<void> => {
  // Implementation would typically use Redis or similar for rate limiting
  // This is a placeholder for the actual implementation
  return Promise.resolve();
};

interface ValidationResult {
  isValid: boolean;
  message?: string;
  details?: any;
}