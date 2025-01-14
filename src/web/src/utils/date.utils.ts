/**
 * @fileoverview Date utility functions for task management system
 * Provides comprehensive date manipulation, formatting, and validation with i18n support
 * @version 1.0.0
 */

import { format, parseISO, isValid, differenceInDays, addDays, formatDistanceToNow } from 'date-fns'; // ^2.30.0
import type { Timestamp } from '../types/common.types';

/**
 * Memoization decorator for performance optimization
 */
function memoize<T extends Function>(target: T, context: ClassMethodDecoratorContext) {
  const cache = new Map();
  
  return function (...args: any[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = target.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Formats a date value into a standardized string format with locale support
 * @param date - Date value to format
 * @param formatString - Format pattern (e.g., 'yyyy-MM-dd')
 * @param locale - Locale object for i18n
 * @returns Formatted date string or fallback for invalid dates
 */
export const formatDate = memoize(function(
  date: Timestamp,
  formatString: string = 'yyyy-MM-dd',
  locale?: Locale
): string {
  try {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    if (!isValidDate(dateObj)) return '';
    
    return format(dateObj, formatString, { locale });
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
});

/**
 * Safely parses a date string into a Date object
 * @param dateString - ISO date string to parse
 * @returns Parsed Date object or null if invalid
 */
export const parseDate = function(dateString: string): Date | null {
  try {
    if (!dateString) return null;
    
    const parsedDate = parseISO(dateString);
    return isValidDate(parsedDate) ? parsedDate : null;
  } catch (error) {
    console.error('Date parsing error:', error);
    return null;
  }
};

/**
 * Comprehensively validates if a given value is a valid date
 * @param date - Value to validate as date
 * @returns Boolean indicating validity
 */
export const isValidDate = function(date: Timestamp): boolean {
  try {
    if (!date) return false;
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check for invalid date ranges
    if (dateObj.getFullYear() < 1900 || dateObj.getFullYear() > 2100) {
      return false;
    }
    
    return isValid(dateObj);
  } catch (error) {
    console.error('Date validation error:', error);
    return false;
  }
};

/**
 * Calculates the precise difference in days between two dates
 * @param dateLeft - First date for comparison
 * @param dateRight - Second date for comparison
 * @returns Number of days difference or 0 if invalid
 */
export const getDaysDifference = memoize(function(
  dateLeft: Timestamp,
  dateRight: Timestamp
): number {
  try {
    if (!isValidDate(dateLeft) || !isValidDate(dateRight)) return 0;
    
    const date1 = dateLeft instanceof Date ? dateLeft : new Date(dateLeft);
    const date2 = dateRight instanceof Date ? dateRight : new Date(dateRight);
    
    return differenceInDays(date1, date2);
  } catch (error) {
    console.error('Days difference calculation error:', error);
    return 0;
  }
});

/**
 * Adds a specified number of days to a date
 * @param date - Base date
 * @param days - Number of days to add (positive or negative)
 * @returns New date with added days or null if invalid
 */
export const addDaysToDate = function(
  date: Timestamp,
  days: number
): Date | null {
  try {
    if (!isValidDate(date) || typeof days !== 'number') return null;
    
    const dateObj = date instanceof Date ? date : new Date(date);
    const newDate = addDays(dateObj, days);
    
    return isValidDate(newDate) ? newDate : null;
  } catch (error) {
    console.error('Add days to date error:', error);
    return null;
  }
};

/**
 * Generates accessible human-readable relative time string
 * @param date - Date to generate relative string for
 * @param locale - Locale object for i18n
 * @returns Localized relative time string with ARIA attributes
 */
export const getRelativeTimeString = memoize(function(
  date: Timestamp,
  locale?: Locale
): string {
  try {
    if (!isValidDate(date)) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    const relativeTime = formatDistanceToNow(dateObj, {
      addSuffix: true,
      locale
    });
    
    // Add absolute date for screen readers
    const absoluteDate = formatDate(dateObj, 'PPP', locale);
    return `<span aria-label="${absoluteDate}">${relativeTime}</span>`;
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return '';
  }
});