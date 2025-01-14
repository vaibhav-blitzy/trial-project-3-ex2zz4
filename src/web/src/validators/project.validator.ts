/**
 * @fileoverview Enterprise-grade project validation with WCAG 2.1 Level AA compliance
 * Provides comprehensive validation for project-related data with security and accessibility
 * @version 1.0.0
 */

import { isAfter, isBefore, isValid as isValidDate } from 'date-fns'; // v2.29.0
import i18next from 'i18next'; // v21.8.0
import { IProject, SecurityLevel } from '../interfaces/project.interface';
import { Priority } from '../types/common.types';
import { ValidationUtils, ValidationResult } from '../utils/validation.utils';

/**
 * Interface for project validation results with accessibility support
 */
export interface ProjectValidationResult {
  isValid: boolean;
  errors: string[];
  ariaMessages: string[];
  metadata: {
    fieldErrors: Record<string, string>;
    timestamp: number;
    validationId: string;
  };
}

/**
 * Validates project name with security and accessibility compliance
 * @param name - Project name to validate
 * @returns Validation result with ARIA attributes
 */
export const validateProjectName = (name: string): ValidationResult => {
  // Required field validation
  const requiredCheck = ValidationUtils.validateRequired(name, 'projectName');
  if (!requiredCheck.isValid) {
    return requiredCheck;
  }

  // Length validation (3-100 characters)
  const lengthCheck = ValidationUtils.validateLength(
    name,
    3,
    100,
    'projectName',
    { allowEmpty: false }
  );
  if (!lengthCheck.isValid) {
    return lengthCheck;
  }

  // Security validation - check for potentially malicious patterns
  const securityPattern = /^[a-zA-Z0-9\s\-_]+$/;
  if (!securityPattern.test(name)) {
    return {
      isValid: false,
      error: i18next.t('validation.project.name.invalid'),
      fieldId: 'projectName-error',
      ariaDescription: i18next.t('aria.project.name.invalid')
    };
  }

  return {
    isValid: true,
    fieldId: 'projectName-valid',
    ariaDescription: i18next.t('aria.project.name.valid')
  };
};

/**
 * Validates project description with content security policies
 * @param description - Project description to validate
 * @returns Validation result with ARIA attributes
 */
export const validateProjectDescription = (description: string): ValidationResult => {
  // Required field validation
  const requiredCheck = ValidationUtils.validateRequired(description, 'projectDescription');
  if (!requiredCheck.isValid) {
    return requiredCheck;
  }

  // Length validation (10-1000 characters)
  const lengthCheck = ValidationUtils.validateLength(
    description,
    10,
    1000,
    'projectDescription',
    { allowEmpty: false }
  );
  if (!lengthCheck.isValid) {
    return lengthCheck;
  }

  // Content security validation - check for HTML/script injection
  const securityPattern = /<[^>]*>|javascript:|data:/i;
  if (securityPattern.test(description)) {
    return {
      isValid: false,
      error: i18next.t('validation.project.description.security'),
      fieldId: 'projectDescription-error',
      ariaDescription: i18next.t('aria.project.description.security')
    };
  }

  return {
    isValid: true,
    fieldId: 'projectDescription-valid',
    ariaDescription: i18next.t('aria.project.description.valid')
  };
};

/**
 * Validates project dates with business rules and timezone handling
 * @param startDate - Project start date
 * @param endDate - Project end date
 * @returns Validation result with ARIA attributes
 */
export const validateProjectDates = (
  startDate: Date,
  endDate: Date
): ValidationResult => {
  // Validate date formats
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return {
      isValid: false,
      error: i18next.t('validation.project.dates.invalid'),
      fieldId: 'projectDates-error',
      ariaDescription: i18next.t('aria.project.dates.invalid')
    };
  }

  // Ensure start date is not in the past
  if (isBefore(startDate, new Date())) {
    return {
      isValid: false,
      error: i18next.t('validation.project.startDate.past'),
      fieldId: 'projectStartDate-error',
      ariaDescription: i18next.t('aria.project.startDate.past')
    };
  }

  // Validate end date is after start date
  if (!isAfter(endDate, startDate)) {
    return {
      isValid: false,
      error: i18next.t('validation.project.endDate.before'),
      fieldId: 'projectEndDate-error',
      ariaDescription: i18next.t('aria.project.endDate.before')
    };
  }

  return {
    isValid: true,
    fieldId: 'projectDates-valid',
    ariaDescription: i18next.t('aria.project.dates.valid')
  };
};

/**
 * Comprehensive project validation with security and accessibility
 * @param project - Project data to validate
 * @returns Complete validation results with ARIA support
 */
export const validateProject = (project: IProject): ProjectValidationResult => {
  const errors: string[] = [];
  const ariaMessages: string[] = [];
  const fieldErrors: Record<string, string> = {};

  // Validate project name
  const nameValidation = validateProjectName(project.name);
  if (!nameValidation.isValid) {
    errors.push(nameValidation.error!);
    ariaMessages.push(nameValidation.ariaDescription!);
    fieldErrors.name = nameValidation.error!;
  }

  // Validate project description
  const descriptionValidation = validateProjectDescription(project.description);
  if (!descriptionValidation.isValid) {
    errors.push(descriptionValidation.error!);
    ariaMessages.push(descriptionValidation.ariaDescription!);
    fieldErrors.description = descriptionValidation.error!;
  }

  // Validate project dates
  const dateValidation = validateProjectDates(project.startDate, project.endDate);
  if (!dateValidation.isValid) {
    errors.push(dateValidation.error!);
    ariaMessages.push(dateValidation.ariaDescription!);
    fieldErrors.dates = dateValidation.error!;
  }

  // Validate team ID
  const teamValidation = ValidationUtils.validateRequired(project.teamId, 'teamId');
  if (!teamValidation.isValid) {
    errors.push(teamValidation.error!);
    ariaMessages.push(teamValidation.ariaDescription!);
    fieldErrors.teamId = teamValidation.error!;
  }

  // Validate priority
  if (!Object.values(Priority).includes(project.priority)) {
    const error = i18next.t('validation.project.priority.invalid');
    errors.push(error);
    ariaMessages.push(i18next.t('aria.project.priority.invalid'));
    fieldErrors.priority = error;
  }

  // Generate validation metadata
  const metadata = {
    fieldErrors,
    timestamp: Date.now(),
    validationId: `proj-val-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };

  return {
    isValid: errors.length === 0,
    errors,
    ariaMessages,
    metadata
  };
};