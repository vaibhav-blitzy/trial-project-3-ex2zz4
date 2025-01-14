/**
 * @fileoverview TypeScript type definitions for Material Design 3.0 UI components
 * Implements atomic design methodology with comprehensive accessibility support
 * @version 1.0.0
 */

import React from 'react';
import { Theme, Size, Variant, ColorScheme } from '../types/common.types';

/**
 * Supported breakpoints for responsive design
 * Follows Material Design 3.0 breakpoint system
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Base interface for all component props with comprehensive accessibility support
 * Follows WCAG 2.1 Level AA compliance requirements
 */
export interface BaseComponentProps {
  /** Optional CSS class name for custom styling */
  className?: string;
  /** Inline CSS styles */
  style?: React.CSSProperties;
  /** Unique identifier for the component */
  id?: string;
  /** Data test identifier for testing purposes */
  testId?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** ID of element that describes this component */
  ariaDescribedBy?: string;
  /** ID of element that labels this component */
  ariaLabelledBy?: string;
  /** ARIA role for accessibility */
  role?: string;
  /** Tab index for keyboard navigation */
  tabIndex?: number;
  /** Theme variant (light/dark) */
  theme?: Theme;
  /** Color scheme for the component */
  colorScheme?: ColorScheme;
  /** Responsive styles based on breakpoints */
  responsive?: Record<Breakpoint, Partial<React.CSSProperties>>;
}

/**
 * Button component props following Material Design 3.0 specifications
 */
export interface ButtonProps extends BaseComponentProps {
  /** Button variant (contained, outlined, text) */
  variant: Variant;
  /** Button size */
  size: Size;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Click event handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Button content */
  children: React.ReactNode;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Elevation level (0-5) */
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
  /** Enable/disable ripple effect */
  ripple?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Icon before text */
  startIcon?: React.ReactNode;
  /** Icon after text */
  endIcon?: React.ReactNode;
  /** Button color */
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  /** Disable elevation */
  disableElevation?: boolean;
  /** URL for link buttons */
  href?: string;
  /** Target for link buttons */
  target?: '_blank' | '_self' | '_parent' | '_top';
}

/**
 * Input component props following Material Design 3.0 specifications
 */
export interface InputProps extends BaseComponentProps {
  /** Input name */
  name: string;
  /** Input value */
  value: string | number;
  /** Change event handler */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Input type */
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';
  /** Placeholder text */
  placeholder?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Content before input */
  startAdornment?: React.ReactNode;
  /** Content after input */
  endAdornment?: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
  /** Full width input */
  fullWidth?: boolean;
  /** Autocomplete attribute */
  autoComplete?: string;
  /** Autofocus attribute */
  autoFocus?: boolean;
  /** Maximum length */
  maxLength?: number;
  /** Minimum length */
  minLength?: number;
  /** Input pattern */
  pattern?: string;
  /** Read-only state */
  readOnly?: boolean;
  /** Input variant */
  variant?: 'outlined' | 'filled' | 'standard';
  /** Input size */
  size?: Size;
  /** Multiline input */
  multiline?: boolean;
  /** Number of rows (multiline) */
  rows?: number;
  /** Maximum rows (multiline) */
  maxRows?: number;
  /** Minimum rows (multiline) */
  minRows?: number;
}

/**
 * Card component props following Material Design 3.0 specifications
 */
export interface CardProps extends BaseComponentProps {
  /** Card elevation level */
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
  /** Card content */
  children: React.ReactNode;
  /** Enable/disable hover effect */
  hover?: boolean;
  /** Card variant */
  variant?: 'outlined' | 'elevated';
  /** Enable/disable rounded corners */
  square?: boolean;
  /** Click event handler */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Icon component props following Material Design 3.0 specifications
 */
export interface IconProps extends BaseComponentProps {
  /** Icon name/identifier */
  name: string;
  /** Icon size */
  size?: Size | number;
  /** Icon color */
  color?: string;
  /** Spin animation */
  spin?: boolean;
  /** Rotation angle */
  rotate?: number;
  /** Flip direction */
  flip?: 'horizontal' | 'vertical' | 'both';
}