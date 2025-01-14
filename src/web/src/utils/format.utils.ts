/**
 * @fileoverview Utility functions for formatting data with locale support and accessibility
 * @version 1.0.0
 */

import { Timestamp } from '../types/common.types';

// Default locale fallback using browser settings
const DEFAULT_LOCALE = navigator.language || 'en-US';

// Cache for Intl formatters to improve performance
const FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

/**
 * Type guard to check if a value is a valid number
 */
const isValidNumber = (value: unknown): value is number => {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

/**
 * Get cached formatter or create new one
 */
const getFormatter = (
    key: string,
    options: Intl.NumberFormatOptions,
    locale: string
): Intl.NumberFormat => {
    const cacheKey = `${locale}-${JSON.stringify(options)}`;
    if (!FORMATTER_CACHE.has(cacheKey)) {
        FORMATTER_CACHE.set(cacheKey, new Intl.NumberFormat(locale, options));
    }
    return FORMATTER_CACHE.get(cacheKey)!;
};

/**
 * Formats a number with locale-specific formatting
 * @param value - Number to format
 * @param options - Intl.NumberFormat options
 * @param locale - Optional locale override
 * @returns Formatted number string with ARIA attributes
 */
export const formatNumber = (
    value: number,
    options: Intl.NumberFormatOptions = {},
    locale: string = DEFAULT_LOCALE
): string => {
    if (!isValidNumber(value)) {
        return 'N/A';
    }

    const formatter = getFormatter(locale, options, locale);
    const formatted = formatter.format(value);

    return `<span aria-label="number ${formatted}">${formatted}</span>`;
};

/**
 * Formats a number as currency with symbol
 * @param amount - Amount to format
 * @param currencyCode - ISO 4217 currency code
 * @param locale - Optional locale override
 * @returns Formatted currency string with accessibility support
 */
export const formatCurrency = (
    amount: number,
    currencyCode: string,
    locale: string = DEFAULT_LOCALE
): string => {
    if (!isValidNumber(amount)) {
        return 'N/A';
    }

    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    };

    const formatter = getFormatter(locale, options, locale);
    const formatted = formatter.format(amount);

    return `<span aria-label="amount ${formatted}">${formatted}</span>`;
};

/**
 * Formats a number as a percentage
 * @param value - Value to format as percentage
 * @param decimals - Number of decimal places
 * @param locale - Optional locale override
 * @returns Formatted percentage string with accessibility support
 */
export const formatPercentage = (
    value: number,
    decimals: number = 0,
    locale: string = DEFAULT_LOCALE
): string => {
    if (!isValidNumber(value)) {
        return 'N/A';
    }

    const options: Intl.NumberFormatOptions = {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    };

    const formatter = getFormatter(locale, options, locale);
    const formatted = formatter.format(value);

    return `<span aria-label="percentage ${formatted}">${formatted}</span>`;
};

/**
 * Formats bytes into human-readable file size
 * @param bytes - Number of bytes
 * @param locale - Optional locale override
 * @returns Formatted file size string with unit
 */
export const formatFileSize = (
    bytes: number,
    locale: string = DEFAULT_LOCALE
): string => {
    if (!isValidNumber(bytes)) {
        return 'N/A';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }

    const formatter = getFormatter(locale, {
        maximumFractionDigits: 2
    }, locale);

    const formatted = formatter.format(value);
    const unit = units[unitIndex];

    return `<span aria-label="file size ${formatted} ${unit}">${formatted} ${unit}</span>`;
};

/**
 * Formats milliseconds into human-readable duration
 * @param milliseconds - Duration in milliseconds
 * @param locale - Optional locale override
 * @returns Formatted duration string with accessibility support
 */
export const formatDuration = (
    milliseconds: number,
    locale: string = DEFAULT_LOCALE
): string => {
    if (!isValidNumber(milliseconds)) {
        return 'N/A';
    }

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts: string[] = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);

    const formatted = parts.join(' ') || '0s';

    return `<span aria-label="duration ${formatted}">${formatted}</span>`;
};

/**
 * Formats a timestamp into a locale-specific date string
 * @param timestamp - Timestamp to format
 * @param options - Intl.DateTimeFormat options
 * @param locale - Optional locale override
 * @returns Formatted date string with accessibility support
 */
export const formatDate = (
    timestamp: Timestamp,
    options: Intl.DateTimeFormatOptions = {
        dateStyle: 'medium'
    },
    locale: string = DEFAULT_LOCALE
): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }

    const formatted = new Intl.DateTimeFormat(locale, options).format(date);
    return `<span aria-label="date ${formatted}">${formatted}</span>`;
};