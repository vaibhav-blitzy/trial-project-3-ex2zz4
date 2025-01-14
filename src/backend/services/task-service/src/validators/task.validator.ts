/**
 * Task Validation Schema and Functions
 * Version: 1.0.0
 * Implements comprehensive validation schemas and functions for task-related data
 * with enhanced security features, caching, and audit logging.
 */

import Joi from 'joi'; // v17.9.0
import sanitizeHtml from 'sanitize-html'; // v2.11.0
import { Cache } from 'cache-manager'; // v5.2.0
import { createLogger } from 'winston'; // v3.8.0
import { TaskPriority, TaskStatus, TaskActivityType } from '../../../shared/interfaces/task.interface';

// Validation Constants
const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;
const MAX_ASSIGNEES = 10;
const MAX_TAGS = 5;
const VALIDATION_CACHE_TTL = 300; // seconds
const MAX_VALIDATION_ATTEMPTS = 5;
const VALIDATION_RATE_LIMIT = 100; // per minute

// Configure validation logger
const validationLogger = createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'task-validator' },
  transports: [
    new winston.transports.File({ filename: 'validation-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'validation.log' })
  ]
});

// HTML Sanitization Options
const sanitizeOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li'],
  allowedAttributes: {
    'a': ['href', 'target']
  },
  allowedIframeHostnames: []
};

/**
 * Enhanced Joi schema for task creation with comprehensive validation rules
 */
export const createTaskSchema = Joi.object({
  title: Joi.string()
    .required()
    .min(TITLE_MIN_LENGTH)
    .max(TITLE_MAX_LENGTH)
    .trim()
    .pattern(/^[\w\s\-.,!?()]+$/)
    .messages({
      'string.empty': 'Task title is required',
      'string.min': `Title must be at least ${TITLE_MIN_LENGTH} characters`,
      'string.max': `Title cannot exceed ${TITLE_MAX_LENGTH} characters`,
      'string.pattern.base': 'Title contains invalid characters'
    }),

  description: Joi.string()
    .required()
    .max(DESCRIPTION_MAX_LENGTH)
    .trim()
    .messages({
      'string.empty': 'Task description is required',
      'string.max': `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`
    }),

  projectId: Joi.string()
    .required()
    .uuid()
    .messages({
      'string.empty': 'Project ID is required',
      'string.guid': 'Invalid project ID format'
    }),

  priority: Joi.string()
    .required()
    .valid(...Object.values(TaskPriority))
    .messages({
      'any.only': 'Invalid task priority'
    }),

  status: Joi.string()
    .required()
    .valid(...Object.values(TaskStatus))
    .messages({
      'any.only': 'Invalid task status'
    }),

  assigneeIds: Joi.array()
    .items(Joi.string().uuid())
    .max(MAX_ASSIGNEES)
    .unique()
    .messages({
      'array.max': `Cannot assign more than ${MAX_ASSIGNEES} users`,
      'array.unique': 'Duplicate assignee IDs are not allowed'
    }),

  dueDate: Joi.date()
    .iso()
    .min('now')
    .messages({
      'date.base': 'Invalid due date format',
      'date.min': 'Due date must be in the future'
    }),

  tags: Joi.array()
    .items(Joi.string().max(20).pattern(/^[\w\-]+$/))
    .max(MAX_TAGS)
    .unique()
    .messages({
      'array.max': `Cannot have more than ${MAX_TAGS} tags`,
      'array.unique': 'Duplicate tags are not allowed',
      'string.pattern.base': 'Tags can only contain letters, numbers, and hyphens'
    }),

  attachments: Joi.array()
    .items(Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().max(255).required(),
      size: Joi.number().max(10485760) // 10MB
    }))
}).options({ stripUnknown: true, abortEarly: false });

/**
 * Validates task creation data with enhanced security checks and caching
 * @param taskData - Task data to validate
 * @returns Validation result with detailed error messages
 */
export const validateCreateTask = async (
  taskData: any,
  cache?: Cache
): Promise<Joi.ValidationResult> => {
  try {
    // Check validation cache
    const cacheKey = `task_validation_${JSON.stringify(taskData)}`;
    if (cache) {
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult) {
        return cachedResult as Joi.ValidationResult;
      }
    }

    // Sanitize text inputs
    if (taskData.title) {
      taskData.title = sanitizeHtml(taskData.title, { allowedTags: [] });
    }
    if (taskData.description) {
      taskData.description = sanitizeHtml(taskData.description, sanitizeOptions);
    }

    // Validate data against schema
    const validationResult = await createTaskSchema.validateAsync(taskData, {
      abortEarly: false
    });

    // Cache successful validation result
    if (cache && !validationResult.error) {
      await cache.set(cacheKey, validationResult, VALIDATION_CACHE_TTL);
    }

    // Log validation outcome
    validationLogger.info('Task validation completed', {
      success: !validationResult.error,
      taskData: { title: taskData.title, projectId: taskData.projectId }
    });

    return validationResult;
  } catch (error) {
    // Log validation error
    validationLogger.error('Task validation failed', {
      error: error.message,
      taskData: { title: taskData.title, projectId: taskData.projectId }
    });

    throw error;
  }
};

/**
 * Validates task update data with partial schema validation
 */
export const validateUpdateTask = async (
  taskData: any,
  cache?: Cache
): Promise<Joi.ValidationResult> => {
  // Create a partial schema for updates
  const updateTaskSchema = createTaskSchema.fork(
    Object.keys(createTaskSchema.describe().keys),
    (schema) => schema.optional()
  );

  return validateCreateTask(taskData, cache);
};

/**
 * Validates task activity log entry
 */
export const validateTaskActivity = Joi.object({
  type: Joi.string()
    .required()
    .valid(...Object.values(TaskActivityType))
    .messages({
      'any.only': 'Invalid activity type'
    }),

  changes: Joi.object({
    oldValue: Joi.any().required(),
    newValue: Joi.any().required()
  }).required(),

  metadata: Joi.object()
    .pattern(/^[a-zA-Z0-9_]+$/, Joi.any())
    .max(10)
}).required();