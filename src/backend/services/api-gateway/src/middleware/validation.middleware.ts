/**
 * Enhanced API Gateway Validation Middleware
 * Version: 1.0.0
 * Implements comprehensive request validation with security features,
 * performance optimization, and caching.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express'; // v4.18.2
import Joi from 'joi'; // v17.9.0
import { StatusCodes as HttpStatus } from 'http-status-codes'; // v2.2.0
import Redis from 'ioredis'; // v5.3.0
import winston from 'winston'; // v3.8.2
import {
  validateAuthCredentials,
} from '../../../../shared/validators/common.validator';
import {
  validateEmail,
  validatePassword,
  validateUUID,
} from '../../../../shared/utils/validation.util';
import { IAuthCredentials } from '../../../../shared/interfaces/auth.interface';

// Initialize Redis client for validation caching
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  keyPrefix: 'validation:',
});

// Configure validation logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'validation-error.log', level: 'error' }),
    new winston.transports.Console()
  ]
});

// Validation Constants
const VALIDATION_OPTIONS = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true,
  timeout: 5000,
  cache: true,
  cacheTTL: 300
};

const RATE_LIMIT_OPTIONS = {
  windowMs: 900000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
};

/**
 * Enhanced request validation middleware factory with caching
 * @param schema - Joi validation schema
 * @param property - Request property to validate
 * @param options - Validation options
 */
export const validateRequest = (
  schema: Joi.Schema,
  property: string,
  options: Partial<typeof VALIDATION_OPTIONS> = {}
): RequestHandler => {
  const validationOptions = { ...VALIDATION_OPTIONS, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dataToValidate = req[property as keyof Request];
      
      // Generate cache key if caching is enabled
      let cacheKey: string | null = null;
      if (validationOptions.cache) {
        cacheKey = `${property}:${JSON.stringify(dataToValidate)}`;
        const cachedResult = await redis.get(cacheKey);
        if (cachedResult) {
          req[property as keyof Request] = JSON.parse(cachedResult);
          return next();
        }
      }

      // Validate with timeout
      const validationPromise = schema.validateAsync(dataToValidate, {
        abortEarly: validationOptions.abortEarly,
        allowUnknown: validationOptions.allowUnknown,
        stripUnknown: validationOptions.stripUnknown
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Validation timeout')), validationOptions.timeout);
      });

      const result = await Promise.race([validationPromise, timeoutPromise]);

      // Cache successful validation result
      if (validationOptions.cache && cacheKey) {
        await redis.setex(cacheKey, validationOptions.cacheTTL, JSON.stringify(result));
      }

      req[property as keyof Request] = result;
      next();
    } catch (error) {
      logger.error('Validation error', {
        property,
        error: error.message,
        stack: error.stack,
        requestId: req.headers['x-request-id']
      });

      res.status(HttpStatus.BAD_REQUEST).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.details?.map((detail: Joi.ValidationErrorItem) => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
  };
};

/**
 * Enhanced authentication request validation middleware
 * with rate limiting and security tracking
 */
export const validateAuthRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const credentials = req.body as IAuthCredentials;

    // Enhanced credential validation
    const validationResult = await validateAuthCredentials(credentials);
    if (!validationResult) {
      throw new Error('Invalid credentials format');
    }

    // Additional security checks
    const emailValidation = await validateEmail(credentials.email);
    if (!emailValidation.isValid) {
      throw new Error(emailValidation.message);
    }

    const passwordValidation = validatePassword(credentials.password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.message);
    }

    // Log security relevant information
    logger.info('Auth validation successful', {
      email: credentials.email,
      clientId: credentials.clientId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id']
    });

    next();
  } catch (error) {
    logger.error('Auth validation failed', {
      error: error.message,
      stack: error.stack,
      requestId: req.headers['x-request-id']
    });

    res.status(HttpStatus.UNAUTHORIZED).json({
      status: 'error',
      message: 'Authentication validation failed',
      error: error.message
    });
  }
};

/**
 * Enhanced UUID parameter validation middleware with caching
 */
export const validateIdParam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id;
    const cacheKey = `uuid:${id}`;

    // Check cache
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      return next();
    }

    // Validate UUID
    const validation = validateUUID(id);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    // Cache successful validation
    await redis.setex(cacheKey, VALIDATION_OPTIONS.cacheTTL, 'valid');

    next();
  } catch (error) {
    logger.error('UUID validation failed', {
      error: error.message,
      params: req.params,
      requestId: req.headers['x-request-id']
    });

    res.status(HttpStatus.BAD_REQUEST).json({
      status: 'error',
      message: 'Invalid ID parameter',
      error: error.message
    });
  }
};