/**
 * @fileoverview Test suite for validation utilities with WCAG 2.1 Level AA compliance testing
 * @version 1.0.0
 */

import { describe, test, expect } from '@jest/globals'; // v29.5.0
import {
  validateRequired,
  validateEmail,
  validatePassword,
  validateLength,
  ValidationOptions,
  ValidationResult,
  ValidationResults
} from '../../src/utils/validation.utils';

describe('validateRequired', () => {
  test('should return invalid for null values with proper ARIA attributes', () => {
    const result = validateRequired(null, 'testField');
    expect(result.isValid).toBe(false);
    expect(result.fieldId).toBe('testField-error');
    expect(result.ariaDescription).toBeDefined();
  });

  test('should return invalid for undefined values with localized messages', () => {
    const options: ValidationOptions = { locale: 'es' };
    const result = validateRequired(undefined, 'testField', options);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should return invalid for empty strings with screen reader support', () => {
    const result = validateRequired('   ', 'testField');
    expect(result.isValid).toBe(false);
    expect(result.ariaDescription).toBeDefined();
  });

  test('should return invalid for empty arrays with custom messages', () => {
    const options: ValidationOptions = {
      customMessages: { required: 'Custom error message' }
    };
    const result = validateRequired([], 'testField', options);
    expect(result.isValid).toBe(false);
  });

  test('should return valid for non-empty values with proper feedback', () => {
    const result = validateRequired('test value', 'testField');
    expect(result.isValid).toBe(true);
    expect(result.fieldId).toBe('testField-valid');
  });

  test('should support international character validation', () => {
    const result = validateRequired('测试', 'testField');
    expect(result.isValid).toBe(true);
  });

  test('should provide accessible error messages', () => {
    const result = validateRequired(null, 'testField');
    expect(result.ariaDescription).toMatch(/testField/i);
  });
});

describe('validateEmail', () => {
  test('should validate RFC 5322 compliant email addresses', () => {
    const result = validateEmail('test@example.com');
    expect(result.isValid).toBe(true);
  });

  test('should support international email formats', () => {
    const result = validateEmail('用户@例子.中国');
    expect(result.isValid).toBe(true);
  });

  test('should validate domain requirements', () => {
    const result = validateEmail('test@localhost');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should handle special characters correctly', () => {
    const result = validateEmail('test+label@example.com');
    expect(result.isValid).toBe(true);
  });

  test('should provide accessible error feedback', () => {
    const result = validateEmail('invalid-email');
    expect(result.isValid).toBe(false);
    expect(result.ariaDescription).toBeDefined();
  });

  test('should support custom validation rules', () => {
    const options: ValidationOptions = { allowEmpty: true };
    const result = validateEmail('', options);
    expect(result.isValid).toBe(true);
  });

  test('should handle localized error messages', () => {
    const options: ValidationOptions = { locale: 'fr' };
    const result = validateEmail('invalid', options);
    expect(result.error).toBeDefined();
  });
});

describe('validatePassword', () => {
  test('should enforce minimum length with proper feedback', () => {
    const result = validatePassword('short');
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.length).toBeDefined();
  });

  test('should require mixed case characters with ARIA support', () => {
    const result = validatePassword('lowercase');
    expect(result.isValid).toBe(false);
    expect(result.ariaDescriptions.strength).toBeDefined();
  });

  test('should require numbers and special characters', () => {
    const result = validatePassword('OnlyLetters');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should support custom strength requirements', () => {
    const options: ValidationOptions = {
      customMessages: { requirements: 'Custom strength message' }
    };
    const result = validatePassword('Weak1!', options);
    expect(result.isValid).toBe(false);
  });

  test('should provide multiple validation results', () => {
    const result = validatePassword('test');
    expect(result.errors).toBeInstanceOf(Array);
    expect(result.fieldErrors).toBeInstanceOf(Object);
  });

  test('should generate accessible strength indicators', () => {
    const result = validatePassword('TestPass1!');
    expect(result.ariaDescriptions).toHaveProperty('strength');
  });

  test('should enforce security requirements', () => {
    const result = validatePassword('SecurePass1!');
    expect(result.isValid).toBe(true);
  });
});

describe('validateLength', () => {
  test('should correctly handle multi-byte characters', () => {
    const result = validateLength('测试', 2, 4, 'testField');
    expect(result.isValid).toBe(true);
  });

  test('should enforce minimum length requirements', () => {
    const result = validateLength('ab', 3, 10, 'testField');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/minimum/i);
  });

  test('should enforce maximum length requirements', () => {
    const result = validateLength('toolongstring', 3, 5, 'testField');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/maximum/i);
  });

  test('should support custom length configurations', () => {
    const options: ValidationOptions = { allowEmpty: true };
    const result = validateLength('', 0, 5, 'testField', options);
    expect(result.isValid).toBe(true);
  });

  test('should provide localized error messages', () => {
    const options: ValidationOptions = { locale: 'de' };
    const result = validateLength('a', 2, 5, 'testField', options);
    expect(result.error).toBeDefined();
  });

  test('should handle different character sets', () => {
    const result = validateLength('αβγ', 2, 4, 'testField');
    expect(result.isValid).toBe(true);
  });

  test('should manage whitespace appropriately', () => {
    const result = validateLength('  abc  ', 3, 5, 'testField');
    expect(result.isValid).toBe(true);
  });
});