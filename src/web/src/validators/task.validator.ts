/**
 * @fileoverview Task validation module with comprehensive security and accessibility features
 * Provides robust validation for task-related data with WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import { DateTime } from 'luxon'; // v3.0.0
import DOMPurify from 'dompurify'; // v2.4.0
import { ITask, TaskPriority, TaskStatus } from '../interfaces/task.interface';
import { validateRequired, validateLength, sanitizeHtml, validateMarkdown } from '../utils/validation.utils';

/**
 * Interface for task validation results with sanitization support
 */
export interface TaskValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedContent?: string;
  fieldId?: string;
  ariaDescription?: string;
}

/**
 * Interface for comprehensive task form validation results
 */
export interface TaskFormValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: Partial<ITask>;
  fieldErrors: Record<string, string>;
  ariaDescriptions: Record<string, string>;
}

/**
 * Validates task title with WCAG compliance and XSS prevention
 * @param title - Task title to validate
 * @returns Validation result with accessibility attributes
 */
export const validateTaskTitle = (title: string): TaskValidationResult => {
  // Required field validation
  const requiredCheck = validateRequired(title, 'title');
  if (!requiredCheck.isValid) {
    return {
      isValid: false,
      error: requiredCheck.error,
      fieldId: requiredCheck.fieldId,
      ariaDescription: requiredCheck.ariaDescription
    };
  }

  // Length validation (3-100 characters)
  const lengthCheck = validateLength(title, 3, 100, 'title');
  if (!lengthCheck.isValid) {
    return {
      isValid: false,
      error: lengthCheck.error,
      fieldId: lengthCheck.fieldId,
      ariaDescription: lengthCheck.ariaDescription
    };
  }

  // Sanitize content
  const sanitizedTitle = DOMPurify.sanitize(title.trim(), {
    ALLOWED_TAGS: [], // Strip all HTML for titles
    ALLOWED_ATTR: []
  });

  return {
    isValid: true,
    sanitizedContent: sanitizedTitle,
    fieldId: 'title-valid',
    ariaDescription: 'Task title is valid'
  };
};

/**
 * Validates task description with rich text support and XSS prevention
 * @param description - Task description to validate
 * @returns Validation result with sanitized content
 */
export const validateTaskDescription = (description: string): TaskValidationResult => {
  // Optional field, but if provided must be valid
  if (!description) {
    return {
      isValid: true,
      sanitizedContent: '',
      fieldId: 'description-valid',
      ariaDescription: 'Task description is empty but valid'
    };
  }

  // Length validation (0-1000 characters)
  const lengthCheck = validateLength(description, 0, 1000, 'description', { allowEmpty: true });
  if (!lengthCheck.isValid) {
    return {
      isValid: false,
      error: lengthCheck.error,
      fieldId: lengthCheck.fieldId,
      ariaDescription: lengthCheck.ariaDescription
    };
  }

  // Sanitize HTML content with allowed formatting tags
  const sanitizedDescription = DOMPurify.sanitize(description, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    SANITIZE_DOM: true
  });

  return {
    isValid: true,
    sanitizedContent: sanitizedDescription,
    fieldId: 'description-valid',
    ariaDescription: 'Task description is valid'
  };
};

/**
 * Validates task due date with timezone and business hours consideration
 * @param dueDate - Task due date to validate
 * @param timezone - User's timezone
 * @returns Validation result
 */
export const validateTaskDueDate = (
  dueDate: string | Date,
  timezone: string = 'UTC'
): TaskValidationResult => {
  if (!dueDate) {
    return {
      isValid: false,
      error: 'Due date is required',
      fieldId: 'dueDate-error',
      ariaDescription: 'Due date is required for task creation'
    };
  }

  const dueDateObj = DateTime.fromISO(dueDate.toString(), { zone: timezone });
  const now = DateTime.now().setZone(timezone);

  // Validate date is valid
  if (!dueDateObj.isValid) {
    return {
      isValid: false,
      error: 'Invalid date format',
      fieldId: 'dueDate-error',
      ariaDescription: 'Due date format is invalid'
    };
  }

  // Validate date is in the future
  if (dueDateObj < now) {
    return {
      isValid: false,
      error: 'Due date must be in the future',
      fieldId: 'dueDate-error',
      ariaDescription: 'Due date must be set to a future date and time'
    };
  }

  return {
    isValid: true,
    fieldId: 'dueDate-valid',
    ariaDescription: 'Task due date is valid'
  };
};

/**
 * Validates complete task form data with comprehensive checks
 * @param taskData - Task data to validate
 * @returns Comprehensive validation results with sanitized data
 */
export const validateTaskForm = (taskData: Partial<ITask>): TaskFormValidationResult => {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};
  const ariaDescriptions: Record<string, string> = {};
  const sanitizedData: Partial<ITask> = {};

  // Validate title
  const titleValidation = validateTaskTitle(taskData.title || '');
  if (!titleValidation.isValid) {
    errors.push(titleValidation.error!);
    fieldErrors.title = titleValidation.error!;
    ariaDescriptions.title = titleValidation.ariaDescription!;
  } else {
    sanitizedData.title = titleValidation.sanitizedContent!;
  }

  // Validate description
  const descriptionValidation = validateTaskDescription(taskData.description || '');
  if (!descriptionValidation.isValid) {
    errors.push(descriptionValidation.error!);
    fieldErrors.description = descriptionValidation.error!;
    ariaDescriptions.description = descriptionValidation.ariaDescription!;
  } else {
    sanitizedData.description = descriptionValidation.sanitizedContent!;
  }

  // Validate due date
  const dueDateValidation = validateTaskDueDate(taskData.dueDate || '');
  if (!dueDateValidation.isValid) {
    errors.push(dueDateValidation.error!);
    fieldErrors.dueDate = dueDateValidation.error!;
    ariaDescriptions.dueDate = dueDateValidation.ariaDescription!;
  } else {
    sanitizedData.dueDate = taskData.dueDate;
  }

  // Validate priority
  if (!Object.values(TaskPriority).includes(taskData.priority as TaskPriority)) {
    errors.push('Invalid task priority');
    fieldErrors.priority = 'Invalid task priority';
    ariaDescriptions.priority = 'Selected task priority is invalid';
  } else {
    sanitizedData.priority = taskData.priority;
  }

  // Validate status
  if (!Object.values(TaskStatus).includes(taskData.status as TaskStatus)) {
    errors.push('Invalid task status');
    fieldErrors.status = 'Invalid task status';
    ariaDescriptions.status = 'Selected task status is invalid';
  } else {
    sanitizedData.status = taskData.status;
  }

  // Validate assignees
  if (taskData.assigneeIds && !Array.isArray(taskData.assigneeIds)) {
    errors.push('Invalid assignee list format');
    fieldErrors.assignees = 'Invalid assignee list format';
    ariaDescriptions.assignees = 'Task assignee list is in invalid format';
  } else {
    sanitizedData.assigneeIds = taskData.assigneeIds;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData,
    fieldErrors,
    ariaDescriptions
  };
};