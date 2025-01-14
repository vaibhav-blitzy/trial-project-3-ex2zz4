/**
 * @fileoverview Enterprise-grade team validation with WCAG 2.1 Level AA compliance
 * Provides comprehensive validation for team-related data with accessibility support
 * @version 1.0.0
 */

import { memoize } from 'lodash'; // v4.17.21
import { escape, stripLow, isLength } from 'validator'; // v13.7.0
import i18next from 'i18next'; // v21.8.0
import { ITeam } from '../interfaces/team.interface';
import { validateRequired, validateLength } from '../utils/validation.utils';
import { TeamRole } from '../interfaces/team.interface';

/**
 * Interface for team validation results with accessibility support
 */
export interface TeamValidationResult {
  isValid: boolean;
  errors: string[];
  ariaMessages: string[];
  fieldErrors: Record<string, string>;
}

// Reserved team names for security
const RESERVED_TEAM_NAMES = [
  'admin',
  'system',
  'superuser',
  'root',
  'administrator'
];

/**
 * Validates team name with enhanced security and accessibility features
 * @param name - Team name to validate
 * @returns Validation result with ARIA-compliant messages
 */
export const validateTeamName = memoize((name: string): TeamValidationResult => {
  const errors: string[] = [];
  const ariaMessages: string[] = [];
  const fieldErrors: Record<string, string> = {};

  // Sanitize input
  const sanitizedName = escape(stripLow(name));

  // Required field validation
  const requiredCheck = validateRequired(sanitizedName, 'team name');
  if (!requiredCheck.isValid) {
    errors.push(requiredCheck.error!);
    ariaMessages.push(requiredCheck.ariaDescription!);
    fieldErrors.name = requiredCheck.error!;
    return { isValid: false, errors, ariaMessages, fieldErrors };
  }

  // Length validation (3-50 characters)
  const lengthCheck = validateLength(sanitizedName, 3, 50, 'team name');
  if (!lengthCheck.isValid) {
    errors.push(lengthCheck.error!);
    ariaMessages.push(lengthCheck.ariaDescription!);
    fieldErrors.name = lengthCheck.error!;
    return { isValid: false, errors, ariaMessages, fieldErrors };
  }

  // Character validation
  const namePattern = /^[a-zA-Z0-9\s\-_]+$/;
  if (!namePattern.test(sanitizedName)) {
    const error = i18next.t('validation.team.name.characters');
    errors.push(error);
    ariaMessages.push(i18next.t('aria.team.name.characters'));
    fieldErrors.name = error;
    return { isValid: false, errors, ariaMessages, fieldErrors };
  }

  // Reserved name check
  if (RESERVED_TEAM_NAMES.includes(sanitizedName.toLowerCase())) {
    const error = i18next.t('validation.team.name.reserved');
    errors.push(error);
    ariaMessages.push(i18next.t('aria.team.name.reserved'));
    fieldErrors.name = error;
    return { isValid: false, errors, ariaMessages, fieldErrors };
  }

  return { isValid: true, errors: [], ariaMessages: [], fieldErrors: {} };
});

/**
 * Validates team description with content filtering and accessibility
 * @param description - Team description to validate
 * @returns Validation result with ARIA-compliant messages
 */
export const validateTeamDescription = memoize((description: string): TeamValidationResult => {
  const errors: string[] = [];
  const ariaMessages: string[] = [];
  const fieldErrors: Record<string, string> = {};

  // Sanitize input
  const sanitizedDescription = escape(stripLow(description));

  // Length validation (0-500 characters)
  const lengthCheck = validateLength(sanitizedDescription, 0, 500, 'team description', { allowEmpty: true });
  if (!lengthCheck.isValid) {
    errors.push(lengthCheck.error!);
    ariaMessages.push(lengthCheck.ariaDescription!);
    fieldErrors.description = lengthCheck.error!;
    return { isValid: false, errors, ariaMessages, fieldErrors };
  }

  // Content validation (no profanity or malicious content)
  const profanityPattern = /(badword1|badword2)/i; // Replace with actual profanity filter
  if (profanityPattern.test(sanitizedDescription)) {
    const error = i18next.t('validation.team.description.inappropriate');
    errors.push(error);
    ariaMessages.push(i18next.t('aria.team.description.inappropriate'));
    fieldErrors.description = error;
    return { isValid: false, errors, ariaMessages, fieldErrors };
  }

  return { isValid: true, errors: [], ariaMessages: [], fieldErrors: {} };
});

/**
 * Validates team member list and roles with size constraints
 * @param members - Array of team member IDs
 * @param roles - Object mapping member IDs to roles
 * @returns Validation result with ARIA-compliant messages
 */
export const validateTeamMembers = memoize((
  members: string[],
  roles: Record<string, TeamRole>
): TeamValidationResult => {
  const errors: string[] = [];
  const ariaMessages: string[] = [];
  const fieldErrors: Record<string, string> = {};

  // Member count validation (10-10,000 members)
  if (members.length < 10 || members.length > 10000) {
    const error = i18next.t('validation.team.members.count', { min: 10, max: 10000 });
    errors.push(error);
    ariaMessages.push(i18next.t('aria.team.members.count', { min: 10, max: 10000 }));
    fieldErrors.members = error;
  }

  // Duplicate member check
  const uniqueMembers = new Set(members);
  if (uniqueMembers.size !== members.length) {
    const error = i18next.t('validation.team.members.duplicate');
    errors.push(error);
    ariaMessages.push(i18next.t('aria.team.members.duplicate'));
    fieldErrors.members = error;
  }

  // Role validation
  const validRoles = Object.values(TeamRole);
  for (const [memberId, role] of Object.entries(roles)) {
    if (!validRoles.includes(role)) {
      const error = i18next.t('validation.team.role.invalid', { memberId });
      errors.push(error);
      ariaMessages.push(i18next.t('aria.team.role.invalid', { memberId }));
      fieldErrors[`role_${memberId}`] = error;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    ariaMessages,
    fieldErrors
  };
});

/**
 * Performs comprehensive validation of team data
 * @param teamData - Complete team data object
 * @returns Validation result with ARIA-compliant messages
 */
export const validateTeamData = memoize((teamData: Partial<ITeam>): TeamValidationResult => {
  const errors: string[] = [];
  const ariaMessages: string[] = [];
  const fieldErrors: Record<string, string> = {};

  // Validate team name
  const nameValidation = validateTeamName(teamData.name || '');
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors);
    ariaMessages.push(...nameValidation.ariaMessages);
    Object.assign(fieldErrors, nameValidation.fieldErrors);
  }

  // Validate team description
  const descriptionValidation = validateTeamDescription(teamData.description || '');
  if (!descriptionValidation.isValid) {
    errors.push(...descriptionValidation.errors);
    ariaMessages.push(...descriptionValidation.ariaMessages);
    Object.assign(fieldErrors, descriptionValidation.fieldErrors);
  }

  // Validate team members and roles if provided
  if (teamData.memberIds && teamData.roles) {
    const memberValidation = validateTeamMembers(teamData.memberIds, teamData.roles);
    if (!memberValidation.isValid) {
      errors.push(...memberValidation.errors);
      ariaMessages.push(...memberValidation.ariaMessages);
      Object.assign(fieldErrors, memberValidation.fieldErrors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    ariaMessages,
    fieldErrors
  };
});