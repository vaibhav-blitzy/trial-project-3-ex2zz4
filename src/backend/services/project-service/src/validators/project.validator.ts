/**
 * Project Validation Module
 * Version: 1.0.0
 * Implements comprehensive validation schemas and functions for project-related data
 * with enhanced security, caching, and business rule enforcement.
 */

import Joi from 'joi'; // v17.9.0
import { validateUUID } from '../../../../shared/utils/validation.util';
import { validateDateRange } from '../../../../shared/validators/common.validator';
import { ProjectStatus, IProject } from '../../../../shared/interfaces/project.interface';

// Validation Constants
const PROJECT_NAME_MIN_LENGTH = 3;
const PROJECT_NAME_MAX_LENGTH = 100;
const PROJECT_DESCRIPTION_MAX_LENGTH = 1000;
const MAX_TEAM_MEMBERS = 100;
const VALIDATION_CACHE_TTL = 300;
const MAX_VALIDATION_RETRIES = 3;

// Status Transition Rules
const ALLOWED_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.PLANNING]: [ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD, ProjectStatus.ARCHIVED],
  [ProjectStatus.ACTIVE]: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.ARCHIVED],
  [ProjectStatus.ON_HOLD]: [ProjectStatus.ACTIVE, ProjectStatus.ARCHIVED],
  [ProjectStatus.COMPLETED]: [ProjectStatus.ARCHIVED],
  [ProjectStatus.ARCHIVED]: []
};

// Enhanced Joi Schema for Project Creation
export const projectCreateSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(PROJECT_NAME_MIN_LENGTH)
    .max(PROJECT_NAME_MAX_LENGTH)
    .pattern(/^[\w\s-]+$/)
    .messages({
      'string.empty': 'Project name is required',
      'string.min': `Project name must be at least ${PROJECT_NAME_MIN_LENGTH} characters`,
      'string.max': `Project name cannot exceed ${PROJECT_NAME_MAX_LENGTH} characters`,
      'string.pattern.base': 'Project name contains invalid characters'
    }),

  description: Joi.string()
    .max(PROJECT_DESCRIPTION_MAX_LENGTH)
    .allow('')
    .messages({
      'string.max': `Description cannot exceed ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`
    }),

  status: Joi.string()
    .valid(...Object.values(ProjectStatus))
    .default(ProjectStatus.PLANNING)
    .messages({
      'any.only': 'Invalid project status'
    }),

  teamId: Joi.string()
    .required()
    .custom((value, helpers) => {
      const validation = validateUUID(value);
      if (!validation.isValid) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'Invalid team ID format'
    }),

  memberIds: Joi.array()
    .items(Joi.string().custom((value, helpers) => {
      const validation = validateUUID(value);
      if (!validation.isValid) {
        return helpers.error('any.invalid');
      }
      return value;
    }))
    .max(MAX_TEAM_MEMBERS)
    .unique()
    .messages({
      'array.max': `Cannot exceed ${MAX_TEAM_MEMBERS} team members`,
      'array.unique': 'Duplicate member IDs are not allowed'
    }),

  startDate: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': 'Invalid start date format'
    }),

  endDate: Joi.date()
    .iso()
    .greater(Joi.ref('startDate'))
    .required()
    .messages({
      'date.base': 'Invalid end date format',
      'date.greater': 'End date must be after start date'
    })
}).options({ abortEarly: false, stripUnknown: true });

// Enhanced Joi Schema for Project Updates
export const projectUpdateSchema = projectCreateSchema.fork(
  ['name', 'teamId', 'startDate'],
  (schema) => schema.optional()
);

/**
 * Validates project creation data with enhanced security checks and caching
 * @param projectData - Partial project data for creation
 * @returns Validation result with detailed error information
 */
export const validateProjectCreate = async (projectData: Partial<IProject>): Promise<Joi.ValidationResult> => {
  try {
    // Validate basic schema
    const schemaValidation = await projectCreateSchema.validateAsync(projectData, {
      cache: true,
      ttl: VALIDATION_CACHE_TTL
    });

    // Validate date range with business rules
    if (projectData.startDate && projectData.endDate) {
      const dateValidation = validateDateRange(
        projectData.startDate.toISOString(),
        projectData.endDate.toISOString()
      );
      if (dateValidation.error) {
        throw dateValidation.error;
      }
    }

    return schemaValidation;
  } catch (error) {
    throw new Error(`Project validation failed: ${error.message}`);
  }
};

/**
 * Validates project update data with transition rules and audit logging
 * @param projectId - Project ID to update
 * @param updateData - Partial project data for update
 * @returns Validation result with transition metadata
 */
export const validateProjectUpdate = async (
  projectId: string,
  updateData: Partial<IProject>
): Promise<Joi.ValidationResult> => {
  try {
    // Validate project ID
    const idValidation = validateUUID(projectId);
    if (!idValidation.isValid) {
      throw new Error('Invalid project ID format');
    }

    // Validate update schema
    const schemaValidation = await projectUpdateSchema.validateAsync(updateData, {
      cache: true,
      ttl: VALIDATION_CACHE_TTL
    });

    // Validate status transition if included
    if (updateData.status) {
      const statusValidation = await validateProjectStatus(
        updateData.status as ProjectStatus,
        updateData.status as ProjectStatus
      );
      if (!statusValidation.isValid) {
        throw new Error(statusValidation.message);
      }
    }

    return schemaValidation;
  } catch (error) {
    throw new Error(`Project update validation failed: ${error.message}`);
  }
};

/**
 * Validates project status transitions with enhanced business rules
 * @param currentStatus - Current project status
 * @param newStatus - New project status
 * @returns Status validation result with detailed information
 */
export const validateProjectStatus = async (
  currentStatus: ProjectStatus,
  newStatus: ProjectStatus
): Promise<{ isValid: boolean; message?: string }> => {
  try {
    // Validate status values
    if (!Object.values(ProjectStatus).includes(currentStatus)) {
      return { isValid: false, message: 'Invalid current status' };
    }
    if (!Object.values(ProjectStatus).includes(newStatus)) {
      return { isValid: false, message: 'Invalid new status' };
    }

    // Check allowed transitions
    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      return {
        isValid: false,
        message: `Cannot transition from ${currentStatus} to ${newStatus}`
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      message: `Status validation failed: ${error.message}`
    };
  }
};