/**
 * @fileoverview Enterprise-grade validation utilities with WCAG 2.1 Level AA compliance
 * Provides robust security checks and internationalization support for form validation
 * @version 1.0.0
 */

import { isEmail, isStrongPassword } from 'validator'; // v13.9.0
import { memoize } from 'lodash'; // v4.17.21
import i18next from 'i18next'; // v23.0.0
import { ErrorType } from '../types/common.types';

/**
 * Type-safe interface for single validation results with accessibility support
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  fieldId?: string;
  ariaDescription?: string;
}

/**
 * Interface for multiple validation results with field-specific errors
 */
export interface ValidationResults {
  isValid: boolean;
  errors: string[];
  fieldErrors: Record<string, string>;
  ariaDescriptions: Record<string, string>;
}

/**
 * Configuration options for validation functions
 */
export interface ValidationOptions {
  allowEmpty?: boolean;
  locale?: string;
  customMessages?: Record<string, string>;
}

/**
 * Validates if a value is present and not empty with accessibility support
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param options - Validation options
 * @returns Validation result with accessibility attributes
 */
export const validateRequired = memoize((
  value: unknown,
  fieldName: string,
  options: ValidationOptions = {}
): ValidationResult => {
  const locale = options.locale || i18next.language;
  
  if (value === null || value === undefined) {
    return {
      isValid: false,
      error: i18next.t('validation.required', { field: fieldName, lng: locale }),
      fieldId: `${fieldName}-error`,
      ariaDescription: i18next.t('aria.required', { field: fieldName, lng: locale })
    };
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return {
      isValid: false,
      error: i18next.t('validation.required', { field: fieldName, lng: locale }),
      fieldId: `${fieldName}-error`,
      ariaDescription: i18next.t('aria.required', { field: fieldName, lng: locale })
    };
  }

  if (Array.isArray(value) && value.length === 0) {
    return {
      isValid: false,
      error: i18next.t('validation.required', { field: fieldName, lng: locale }),
      fieldId: `${fieldName}-error`,
      ariaDescription: i18next.t('aria.required', { field: fieldName, lng: locale })
    };
  }

  return {
    isValid: true,
    fieldId: `${fieldName}-valid`,
    ariaDescription: i18next.t('aria.valid', { field: fieldName, lng: locale })
  };
});

/**
 * Validates email format using RFC 5322 standards
 * @param email - Email address to validate
 * @param options - Validation options
 * @returns Validation result with accessibility attributes
 */
export const validateEmail = memoize((
  email: string,
  options: ValidationOptions = {}
): ValidationResult => {
  const locale = options.locale || i18next.language;

  if (!options.allowEmpty && !email) {
    return {
      isValid: false,
      error: i18next.t('validation.email.required', { lng: locale }),
      fieldId: 'email-error',
      ariaDescription: i18next.t('aria.email.required', { lng: locale })
    };
  }

  if (email && !isEmail(email, { allow_utf8_local_part: true })) {
    return {
      isValid: false,
      error: i18next.t('validation.email.invalid', { lng: locale }),
      fieldId: 'email-error',
      ariaDescription: i18next.t('aria.email.invalid', { lng: locale })
    };
  }

  return {
    isValid: true,
    fieldId: 'email-valid',
    ariaDescription: i18next.t('aria.email.valid', { lng: locale })
  };
});

/**
 * Validates password strength with configurable requirements
 * @param password - Password to validate
 * @param options - Validation options
 * @returns Multiple validation results with accessibility attributes
 */
export const validatePassword = memoize((
  password: string,
  options: ValidationOptions = {}
): ValidationResults => {
  const locale = options.locale || i18next.language;
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};
  const ariaDescriptions: Record<string, string> = {};

  // Check minimum length
  if (password.length < 8) {
    errors.push(i18next.t('validation.password.length', { lng: locale }));
    fieldErrors.length = i18next.t('validation.password.length', { lng: locale });
    ariaDescriptions.length = i18next.t('aria.password.length', { lng: locale });
  }

  // Validate password strength
  const strengthResult = isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  });

  if (!strengthResult) {
    errors.push(i18next.t('validation.password.requirements', { lng: locale }));
    fieldErrors.strength = i18next.t('validation.password.requirements', { lng: locale });
    ariaDescriptions.strength = i18next.t('aria.password.requirements', { lng: locale });
  }

  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors,
    ariaDescriptions
  };
});

/**
 * Validates string length with internationalization support
 * @param value - String to validate
 * @param minLength - Minimum length required
 * @param maxLength - Maximum length allowed
 * @param fieldName - Name of the field for error messages
 * @param options - Validation options
 * @returns Validation result with accessibility attributes
 */
export const validateLength = memoize((
  value: string,
  minLength: number,
  maxLength: number,
  fieldName: string,
  options: ValidationOptions = {}
): ValidationResult => {
  const locale = options.locale || i18next.language;
  
  if (!options.allowEmpty && !value) {
    return {
      isValid: false,
      error: i18next.t('validation.required', { field: fieldName, lng: locale }),
      fieldId: `${fieldName}-error`,
      ariaDescription: i18next.t('aria.required', { field: fieldName, lng: locale })
    };
  }

  // Handle multi-byte characters correctly
  const length = [...value].length;

  if (length < minLength) {
    return {
      isValid: false,
      error: i18next.t('validation.length.min', { field: fieldName, min: minLength, lng: locale }),
      fieldId: `${fieldName}-error`,
      ariaDescription: i18next.t('aria.length.min', { field: fieldName, min: minLength, lng: locale })
    };
  }

  if (length > maxLength) {
    return {
      isValid: false,
      error: i18next.t('validation.length.max', { field: fieldName, max: maxLength, lng: locale }),
      fieldId: `${fieldName}-error`,
      ariaDescription: i18next.t('aria.length.max', { field: fieldName, max: maxLength, lng: locale })
    };
  }

  return {
    isValid: true,
    fieldId: `${fieldName}-valid`,
    ariaDescription: i18next.t('aria.length.valid', { field: fieldName, lng: locale })
  };
});