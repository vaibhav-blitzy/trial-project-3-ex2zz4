/**
 * Common Validation Schemas and Rules
 * Version: 1.0.0
 * Implements comprehensive validation schemas and rules for data validation
 * across the application with enhanced security features.
 */

import Joi from 'joi'; // v17.9.0
import {
  validateEmail,
  validatePassword,
  validateUUID,
  validateDate
} from '../utils/validation.util';
import { IAuthCredentials } from '../interfaces/auth.interface';

// Validation Constants
const MIN_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE = 1;
const ALLOWED_SORT_DIRECTIONS = ['asc', 'desc'];
const MAX_DATE_RANGE_DAYS = 365;
const CACHE_TTL_SECONDS = 300;

// Custom Joi Extensions
const joiExtensions = {
  type: 'string',
  base: Joi.string(),
  messages: {
    'string.email': 'Invalid email format or domain',
    'string.password': 'Password does not meet security requirements',
    'string.uuid': 'Invalid UUID format',
    'date.range': 'Invalid date range'
  },
  rules: {
    email: {
      validate: async (value: string, helpers: any) => {
        const result = await validateEmail(value);
        if (!result.isValid) {
          return helpers.error('string.email');
        }
        return value;
      }
    },
    password: {
      validate: (value: string, helpers: any) => {
        const result = validatePassword(value);
        if (!result.isValid) {
          return helpers.error('string.password');
        }
        return value;
      }
    },
    uuid: {
      validate: (value: string, helpers: any) => {
        const result = validateUUID(value);
        if (!result.isValid) {
          return helpers.error('string.uuid');
        }
        return value;
      }
    }
  }
};

// Enhanced Joi with custom extensions
const ExtendedJoi = Joi.extend(joiExtensions);

/**
 * Enhanced authentication credentials validation schema
 */
export const authCredentialsSchema = ExtendedJoi.object({
  email: ExtendedJoi.string()
    .required()
    .trim()
    .email()
    .max(255)
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Invalid email format'
    }),
  password: ExtendedJoi.string()
    .required()
    .password()
    .messages({
      'string.empty': 'Password is required',
      'string.password': 'Password does not meet security requirements'
    }),
  clientId: ExtendedJoi.string()
    .required()
    .uuid()
    .messages({
      'string.empty': 'Client ID is required',
      'string.uuid': 'Invalid client ID format'
    }),
  deviceInfo: Joi.object({
    userAgent: Joi.string().required().max(500),
    ipAddress: Joi.string().ip().required(),
    deviceId: Joi.string().required().max(100)
  }).required()
});

/**
 * Optimized pagination parameters validation schema
 */
export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(DEFAULT_PAGE)
    .messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be greater than 0'
    }),
  pageSize: Joi.number()
    .integer()
    .min(MIN_PAGE_SIZE)
    .max(MAX_PAGE_SIZE)
    .default(MIN_PAGE_SIZE)
    .messages({
      'number.base': 'Page size must be a number',
      'number.min': `Page size must be at least ${MIN_PAGE_SIZE}`,
      'number.max': `Page size cannot exceed ${MAX_PAGE_SIZE}`
    }),
  sortBy: Joi.string()
    .max(50)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .messages({
      'string.pattern.base': 'Sort field contains invalid characters'
    }),
  sortDirection: Joi.string()
    .valid(...ALLOWED_SORT_DIRECTIONS)
    .default('asc')
    .messages({
      'any.only': 'Sort direction must be either asc or desc'
    }),
  filter: Joi.string()
    .max(500)
    .pattern(/^[a-zA-Z0-9_\s:=><]+$/)
    .messages({
      'string.pattern.base': 'Filter contains invalid characters'
    })
});

/**
 * Comprehensive date range validation schema
 */
export const dateRangeSchema = Joi.object({
  startDate: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in ISO format'
    }),
  endDate: Joi.date()
    .iso()
    .required()
    .min(Joi.ref('startDate'))
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date'
    }),
  timezone: Joi.string()
    .pattern(/^[A-Za-z_/]+\/[A-Za-z_/]+$/)
    .messages({
      'string.pattern.base': 'Invalid timezone format'
    })
}).custom((value, helpers) => {
  const start = new Date(value.startDate);
  const end = new Date(value.endDate);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  
  if (diffDays > MAX_DATE_RANGE_DAYS) {
    return helpers.error('date.range');
  }
  return value;
});

/**
 * Validates authentication credentials with enhanced security checks
 */
export const validateAuthCredentials = async (credentials: IAuthCredentials): Promise<Joi.ValidationResult> => {
  try {
    return await authCredentialsSchema.validateAsync(credentials, {
      abortEarly: false,
      stripUnknown: true
    });
  } catch (error) {
    throw new Error(`Authentication validation failed: ${error.message}`);
  }
};

/**
 * Validates pagination parameters with performance optimization
 */
export const validatePaginationParams = (params: any): Joi.ValidationResult => {
  try {
    return paginationSchema.validate(params, {
      abortEarly: false,
      stripUnknown: true,
      cache: {
        ttl: CACHE_TTL_SECONDS
      }
    });
  } catch (error) {
    throw new Error(`Pagination validation failed: ${error.message}`);
  }
};

/**
 * Validates date range with timezone and business rules
 */
export const validateDateRange = (
  startDate: string,
  endDate: string,
  timezone?: string
): Joi.ValidationResult => {
  try {
    return dateRangeSchema.validate(
      { startDate, endDate, timezone },
      {
        abortEarly: false,
        stripUnknown: true
      }
    );
  } catch (error) {
    throw new Error(`Date range validation failed: ${error.message}`);
  }
};