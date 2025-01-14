/**
 * @fileoverview Common interfaces used across the frontend application
 * Provides fundamental interface definitions for entities, components, and shared functionality
 * @version 1.0.0
 */

import {
    ID,
    Timestamp,
    Status,
    Priority,
    Theme,
    Size,
    Variant,
    LoadingState,
    ErrorType
} from '../types/common.types';

/**
 * Base interface for all entities in the system
 * Provides standard metadata properties that all entities must implement
 */
export interface BaseEntity {
    id: ID;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    status: Status;
}

/**
 * Base interface for React component props
 * Provides common styling and children support for components
 */
export interface BaseComponentProps {
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
}

/**
 * Interface for components with loading state management
 * Enables consistent loading state handling across components
 */
export interface LoadingProps {
    loading: boolean;
    loadingState: LoadingState;
}

/**
 * Interface for components with error handling capabilities
 * Provides standardized error state and message handling
 */
export interface ErrorProps {
    error: boolean;
    errorType: ErrorType;
    errorMessage: string;
}

/**
 * Interface for theme-aware components
 * Enables consistent theme support across the application
 */
export interface ThemeProps {
    theme: Theme;
}

/**
 * Interface for size-configurable components
 * Ensures consistent sizing options across UI elements
 */
export interface SizeProps {
    size: Size;
}

/**
 * Interface for components with style variants
 * Provides consistent styling options across components
 */
export interface VariantProps {
    variant: Variant;
}