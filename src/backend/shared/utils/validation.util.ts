/**
 * Core Validation Utility Functions
 * Version: 1.0.0
 * Provides enterprise-grade validation and sanitization functions with enhanced security features
 */

import validator from 'validator'; // v13.11.0
import { validate as uuidValidate, version as uuidVersion } from 'uuid'; // v9.0.0
import zxcvbn from 'zxcvbn'; // v4.4.2
import xss from 'xss'; // v1.0.14
import { IAuthCredentials } from '../interfaces/auth.interface';

// Validation Constants
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BLOCKED_EMAIL_DOMAINS = ['tempmail.com', 'disposable.com'];
const MIN_PASSWORD_STRENGTH = 3;
const DATE_MIN_YEAR = 1900;
const DATE_MAX_YEAR = 2100;

// Interfaces
interface ValidationResult {
  isValid: boolean;
  message?: string;
  details?: any;
}

interface SanitizeOptions {
  allowedTags?: string[];
  stripHTML?: boolean;
  normalizeWhitespace?: boolean;
  removeEmoji?: boolean;
}

/**
 * Enhanced email validation with disposable email detection
 * @param email - Email address to validate
 * @returns ValidationResult with detailed status
 */
export const validateEmail = async (email: string): Promise<ValidationResult> => {
  try {
    if (!email || typeof email !== 'string') {
      return { isValid: false, message: 'Email is required' };
    }

    // Basic format validation
    if (!EMAIL_REGEX.test(email)) {
      return { isValid: false, message: 'Invalid email format' };
    }

    // RFC compliance check
    if (!validator.isEmail(email, { allow_utf8_local_part: false })) {
      return { isValid: false, message: 'Email does not comply with RFC standards' };
    }

    // Check for disposable email domains
    const domain = email.split('@')[1].toLowerCase();
    if (BLOCKED_EMAIL_DOMAINS.includes(domain)) {
      return { isValid: false, message: 'Disposable email addresses are not allowed' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, message: 'Email validation failed', details: error };
  }
};

/**
 * Advanced password validation with strength estimation
 * @param password - Password to validate
 * @returns ValidationResult with strength score and suggestions
 */
export const validatePassword = (password: string): ValidationResult => {
  try {
    if (!password || typeof password !== 'string') {
      return { isValid: false, message: 'Password is required' };
    }

    // Length validation
    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      return {
        isValid: false,
        message: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`
      };
    }

    // Complexity validation
    if (!PASSWORD_REGEX.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain uppercase, lowercase, number and special character'
      };
    }

    // Strength analysis
    const strength = zxcvbn(password);
    if (strength.score < MIN_PASSWORD_STRENGTH) {
      return {
        isValid: false,
        message: 'Password is too weak',
        details: {
          score: strength.score,
          feedback: strength.feedback,
          suggestions: strength.feedback.suggestions
        }
      };
    }

    return {
      isValid: true,
      details: {
        score: strength.score,
        estimatedCrackTime: strength.crack_times_display.offline_slow_hashing_1e4_per_second
      }
    };
  } catch (error) {
    return { isValid: false, message: 'Password validation failed', details: error };
  }
};

/**
 * Enhanced UUID validation with version 4 specific checks
 * @param id - UUID to validate
 * @returns ValidationResult with validation status
 */
export const validateUUID = (id: string): ValidationResult => {
  try {
    if (!id || typeof id !== 'string') {
      return { isValid: false, message: 'UUID is required' };
    }

    // Format validation
    if (!UUID_REGEX.test(id)) {
      return { isValid: false, message: 'Invalid UUID format' };
    }

    // Version 4 specific validation
    if (!uuidValidate(id) || uuidVersion(id) !== 4) {
      return { isValid: false, message: 'Invalid UUID version 4' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, message: 'UUID validation failed', details: error };
  }
};

/**
 * Comprehensive date validation with timezone support
 * @param date - Date string to validate
 * @param timezone - Optional timezone string
 * @returns ValidationResult with parsed date
 */
export const validateDate = (date: string, timezone?: string): ValidationResult => {
  try {
    if (!date) {
      return { isValid: false, message: 'Date is required' };
    }

    // Parse date with timezone consideration
    const parsedDate = timezone 
      ? new Date(date + ' ' + timezone)
      : new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return { isValid: false, message: 'Invalid date format' };
    }

    // Range validation
    const year = parsedDate.getFullYear();
    if (year < DATE_MIN_YEAR || year > DATE_MAX_YEAR) {
      return {
        isValid: false,
        message: `Date must be between years ${DATE_MIN_YEAR} and ${DATE_MAX_YEAR}`
      };
    }

    return {
      isValid: true,
      details: {
        parsedDate,
        timestamp: parsedDate.getTime()
      }
    };
  } catch (error) {
    return { isValid: false, message: 'Date validation failed', details: error };
  }
};

/**
 * Advanced input sanitization with multiple security layers
 * @param input - String to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string, options: SanitizeOptions = {}): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Unicode normalization
  sanitized = validator.normalizeEmail(sanitized) || sanitized;

  // HTML sanitization
  if (options.stripHTML !== false) {
    sanitized = xss(sanitized, {
      whiteList: options.allowedTags || {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style']
    });
  }

  // SQL injection prevention
  sanitized = validator.escape(sanitized);

  // Whitespace normalization
  if (options.normalizeWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
  }

  // Emoji removal if specified
  if (options.removeEmoji) {
    sanitized = sanitized.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
  }

  return sanitized;
};

/**
 * Validates authentication credentials
 * @param credentials - Authentication credentials to validate
 * @returns ValidationResult with detailed status
 */
export const validateAuthCredentials = async (credentials: IAuthCredentials): Promise<ValidationResult> => {
  try {
    if (!credentials) {
      return { isValid: false, message: 'Credentials are required' };
    }

    // Validate email
    const emailValidation = await validateEmail(credentials.email);
    if (!emailValidation.isValid) {
      return emailValidation;
    }

    // Validate password
    const passwordValidation = validatePassword(credentials.password);
    if (!passwordValidation.isValid) {
      return passwordValidation;
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, message: 'Credentials validation failed', details: error };
  }
};