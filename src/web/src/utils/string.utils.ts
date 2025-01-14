/**
 * @fileoverview String utility functions for secure, Unicode-aware string manipulation
 * @version 1.0.0
 * @license MIT
 */

import { escape } from 'lodash'; // v4.17.21 - Secure HTML escaping

/**
 * Safely truncates a string to a specified length with Unicode awareness
 * @param {string} text - The input text to truncate
 * @param {number} maxLength - Maximum length of the resulting string including ellipsis
 * @returns {string} Truncated string with ellipsis if needed
 * @throws {Error} If maxLength is less than 4 (minimum length to add ellipsis)
 */
export const truncate = (text: string, maxLength: number): string => {
  // Input validation
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  if (!Number.isInteger(maxLength) || maxLength < 4) {
    throw new Error('maxLength must be an integer greater than or equal to 4');
  }

  // Return original if no truncation needed
  if (text.length <= maxLength) {
    return text;
  }

  // Use Array.from to properly handle Unicode surrogate pairs
  const chars = Array.from(text);
  if (chars.length <= maxLength) {
    return text;
  }

  // Truncate considering Unicode characters
  return chars.slice(0, maxLength - 3).join('') + '...';
};

/**
 * Capitalizes the first letter of a string with Unicode character support
 * @param {string} text - The input text to capitalize
 * @returns {string} String with first letter capitalized
 */
export const capitalize = (text: string): string => {
  // Input validation
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length === 0) {
    return text;
  }

  // Use Unicode-aware string splitting
  const chars = Array.from(text);
  if (chars.length === 0) {
    return text;
  }

  // Capitalize first character using locale rules
  return chars[0].toLocaleUpperCase() + chars.slice(1).join('');
};

/**
 * Converts a string to a URL-friendly slug with Unicode character handling
 * @param {string} text - The input text to convert to a slug
 * @returns {string} URL-friendly slug string
 */
export const slugify = (text: string): string => {
  // Input validation
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    // Convert to lowercase using locale rules
    .toLocaleLowerCase()
    // Normalize Unicode characters
    .normalize('NFKD')
    // Remove accents
    .replace(/[\u0300-\u036f]/g, '')
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove all non-word chars except hyphens
    .replace(/[^\w-]+/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
};

/**
 * Securely escapes HTML special characters with comprehensive XSS protection
 * @param {string} text - The input text to escape
 * @returns {string} Securely HTML-escaped string
 */
export const escapeHtml = (text: string): string => {
  // Input validation
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Initial escape using lodash
  let escaped = escape(text);

  // Additional security measures
  escaped = escaped
    // Prevent JavaScript protocol in links
    .replace(/javascript:/gi, 'removed:')
    // Prevent data: URLs
    .replace(/data:/gi, 'removed:')
    // Remove potential script tags that might have survived
    .replace(/<script/gi, '&lt;script')
    // Remove potential on* event handlers
    .replace(/on\w+=/gi, 'removed=')
    // Remove potential base64 encoded content
    .replace(/base64/gi, 'removed');

  return escaped;
};

/**
 * Type definition for exported string utility functions
 */
export type StringUtils = {
  truncate: typeof truncate;
  capitalize: typeof capitalize;
  slugify: typeof slugify;
  escapeHtml: typeof escapeHtml;
};