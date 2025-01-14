/**
 * @fileoverview Common TypeScript types and enums used across the frontend application
 * Provides fundamental type definitions for consistent type safety and standardization
 * @version 1.0.0
 */

/**
 * Type-safe identifier for all entities in the system
 * Ensures consistent ID handling across the application
 */
export type ID = Readonly<string>;

/**
 * Flexible timestamp type supporting multiple formats:
 * - ISO 8601 string
 * - Unix timestamp (number)
 * - JavaScript Date object
 */
export type Timestamp = string | number | Date;

/**
 * Entity lifecycle status
 * Used for tracking the state of various entities in the system
 */
export enum Status {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    DELETED = 'DELETED'
}

/**
 * Task and project priority levels
 * Enables consistent prioritization across the application
 */
export enum Priority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH'
}

/**
 * Application theme options
 * Supports light/dark modes and system preference detection
 */
export enum Theme {
    LIGHT = 'LIGHT',
    DARK = 'DARK',
    SYSTEM = 'SYSTEM'
}

/**
 * Standardized component size options
 * Ensures consistent sizing across UI components
 */
export enum Size {
    SMALL = 'SMALL',
    MEDIUM = 'MEDIUM',
    LARGE = 'LARGE'
}

/**
 * Component style variants
 * Follows Material Design principles for consistent UI appearance
 */
export enum Variant {
    PRIMARY = 'PRIMARY',
    SECONDARY = 'SECONDARY',
    OUTLINED = 'OUTLINED',
    TEXT = 'TEXT'
}

/**
 * Loading states for asynchronous operations
 * Provides granular control over loading states in components
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Comprehensive error type categorization
 * Enables specific error handling and user feedback
 * @description
 * - validation: Form/input validation errors
 * - network: API/network connectivity issues
 * - auth: Authentication/authorization failures
 * - server: Backend server errors
 * - unknown: Unhandled/unexpected errors
 */
export type ErrorType = 'validation' | 'network' | 'auth' | 'server' | 'unknown';