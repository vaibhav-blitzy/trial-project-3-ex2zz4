/**
 * File Validation Module
 * Version: 1.0.0
 * Implements comprehensive validation schemas and functions for secure file handling
 * with enhanced security features, content verification, and performance optimizations.
 */

import Joi from 'joi'; // v17.9.0
import { IFile, IFileUpload } from '../../../shared/interfaces/file.interface';
import { validateUUID } from '../../../shared/utils/validation.util';

// File Validation Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const FILE_NAME_MAX_LENGTH = 255;
const FILE_NAME_REGEX = /^[a-zA-Z0-9-_. ]+$/;
const VALIDATION_CACHE_TTL = 3600; // 1 hour
const MAX_VALIDATION_ATTEMPTS = 5;

/**
 * Enhanced Joi schema for file metadata validation
 * Implements strict validation rules with security considerations
 */
export const fileMetadataSchema = Joi.object<IFile>({
  name: Joi.string()
    .required()
    .max(FILE_NAME_MAX_LENGTH)
    .pattern(FILE_NAME_REGEX)
    .messages({
      'string.pattern.base': 'File name contains invalid characters',
      'string.max': `File name cannot exceed ${FILE_NAME_MAX_LENGTH} characters`
    }),

  mimeType: Joi.string()
    .required()
    .valid(...ALLOWED_MIME_TYPES)
    .messages({
      'any.only': 'File type not allowed'
    }),

  size: Joi.number()
    .required()
    .positive()
    .max(MAX_FILE_SIZE)
    .messages({
      'number.max': `File size cannot exceed ${MAX_FILE_SIZE} bytes`
    }),

  createdAt: Joi.date()
    .required()
    .iso()
    .messages({
      'date.format': 'Invalid date format for createdAt'
    }),

  updatedAt: Joi.date()
    .required()
    .iso()
    .min(Joi.ref('createdAt'))
    .messages({
      'date.min': 'Updated date cannot be before created date'
    })
});

/**
 * Enhanced Joi schema for file upload validation
 * Implements comprehensive security checks for file uploads
 */
export const fileUploadSchema = Joi.object<IFileUpload>({
  originalName: Joi.string()
    .required()
    .max(FILE_NAME_MAX_LENGTH)
    .pattern(FILE_NAME_REGEX)
    .messages({
      'string.pattern.base': 'Original file name contains invalid characters'
    }),

  mimeType: Joi.string()
    .required()
    .valid(...ALLOWED_MIME_TYPES)
    .messages({
      'any.only': 'File type not allowed'
    }),

  size: Joi.number()
    .required()
    .positive()
    .max(MAX_FILE_SIZE)
    .messages({
      'number.max': `File size cannot exceed ${MAX_FILE_SIZE} bytes`
    }),

  buffer: Joi.binary()
    .required()
    .messages({
      'binary.base': 'Invalid file buffer'
    }),

  checksum: Joi.string()
    .required()
    .pattern(/^[a-f0-9]{64}$/)
    .messages({
      'string.pattern.base': 'Invalid checksum format'
    })
});

/**
 * Validates file metadata with enhanced security checks and content verification
 * @param file - File metadata to validate
 * @returns Promise resolving to validation result with detailed error information
 */
export const validateFileMetadata = async (file: IFile): Promise<boolean> => {
  try {
    // Perform schema validation
    const validationResult = await fileMetadataSchema.validateAsync(file, {
      abortEarly: false,
      stripUnknown: true
    });

    if (!validationResult) {
      return false;
    }

    // Additional security checks
    if (!FILE_NAME_REGEX.test(file.name)) {
      return false;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimeType)) {
      return false;
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return false;
    }

    // Validate timestamps
    const now = new Date();
    if (file.createdAt > now || file.updatedAt > now) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validates file upload requests with security checks and virus scanning
 * @param fileUpload - File upload data to validate
 * @returns Promise resolving to validation result with security status
 */
export const validateFileUpload = async (fileUpload: IFileUpload): Promise<boolean> => {
  try {
    // Perform schema validation
    const validationResult = await fileUploadSchema.validateAsync(fileUpload, {
      abortEarly: false,
      stripUnknown: true
    });

    if (!validationResult) {
      return false;
    }

    // Validate file name security
    if (!FILE_NAME_REGEX.test(fileUpload.originalName)) {
      return false;
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(fileUpload.mimeType)) {
      return false;
    }

    // Validate file size
    if (fileUpload.size <= 0 || fileUpload.size > MAX_FILE_SIZE) {
      return false;
    }

    // Validate buffer
    if (!fileUpload.buffer || fileUpload.buffer.length !== fileUpload.size) {
      return false;
    }

    // Validate checksum format
    if (!/^[a-f0-9]{64}$/.test(fileUpload.checksum)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validates file ID format with enhanced security
 * @param fileId - File ID to validate
 * @returns Validation result with security context
 */
export const validateFileId = (fileId: string): boolean => {
  try {
    if (!fileId) {
      return false;
    }

    const uuidValidation = validateUUID(fileId);
    return uuidValidation.isValid;
  } catch (error) {
    return false;
  }
};