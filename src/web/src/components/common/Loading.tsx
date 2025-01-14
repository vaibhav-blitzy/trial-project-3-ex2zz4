/**
 * @fileoverview Enhanced loading spinner component with Material Design 3.0 principles
 * Provides visual feedback during asynchronous operations with accessibility support
 * @version 1.0.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { BaseComponentProps } from '../../types/components.types';

/**
 * Props interface for the Loading component with comprehensive customization
 */
interface LoadingProps extends BaseComponentProps {
  /** Size variant of the loading indicator */
  size?: 'xs' | 'small' | 'medium' | 'large' | 'xl';
  /** Visual style of the loading indicator */
  variant?: 'circular' | 'linear' | 'dots' | 'pulse';
  /** Theme-aware color options */
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'inherit';
  /** Overlay configuration with backdrop effects */
  overlay?: boolean | { blur?: boolean; opacity?: number };
  /** Accessible label for screen readers */
  label?: string;
  /** Delay before showing loader (ms) */
  delayMs?: number;
}

/**
 * Size mapping for consistent dimensions across variants
 */
const SIZE_MAP = {
  xs: { width: 16, height: 16, borderWidth: 2 },
  small: { width: 24, height: 24, borderWidth: 2 },
  medium: { width: 32, height: 32, borderWidth: 3 },
  large: { width: 48, height: 48, borderWidth: 4 },
  xl: { width: 64, height: 64, borderWidth: 5 },
};

/**
 * Calculates spinner dimensions based on size prop
 */
const getSpinnerSize = (size: LoadingProps['size'] = 'medium') => {
  return SIZE_MAP[size] || SIZE_MAP.medium;
};

/**
 * Enhanced loading spinner component with Material Design 3.0 principles
 */
export const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  variant = 'circular',
  color = 'primary',
  overlay = false,
  label = 'Loading...',
  delayMs = 0,
  className = '',
  style,
  ...props
}) => {
  const [visible, setVisible] = useState(delayMs === 0);

  // Handle delayed appearance
  useEffect(() => {
    if (delayMs > 0) {
      const timer = setTimeout(() => setVisible(true), delayMs);
      return () => clearTimeout(timer);
    }
  }, [delayMs]);

  // Calculate spinner dimensions
  const dimensions = useMemo(() => getSpinnerSize(size), [size]);

  // Prepare overlay styles
  const overlayStyles = useMemo(() => {
    if (!overlay) return {};
    const overlayConfig = typeof overlay === 'object' ? overlay : {};
    return {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: `rgba(var(--background-rgb), ${overlayConfig.opacity || 0.8})`,
      backdropFilter: overlayConfig.blur ? 'blur(4px)' : undefined,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  }, [overlay]);

  // Base spinner styles with theme integration
  const spinnerStyles = useMemo(() => ({
    width: dimensions.width,
    height: dimensions.height,
    borderWidth: dimensions.borderWidth,
    color: `var(--color-${color})`,
    opacity: visible ? 1 : 0,
    transition: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    ...style,
  }), [dimensions, color, visible, style]);

  // ARIA attributes for accessibility
  const ariaProps = {
    role: 'progressbar',
    'aria-label': label,
    'aria-live': 'polite',
    'aria-busy': 'true',
  };

  // Render appropriate variant
  const renderSpinner = () => {
    switch (variant) {
      case 'linear':
        return (
          <div
            className={`loading loading--linear ${className}`}
            style={spinnerStyles}
            {...ariaProps}
            {...props}
          />
        );
      case 'dots':
        return (
          <div
            className={`loading loading--dots ${className}`}
            style={spinnerStyles}
            {...ariaProps}
            {...props}
          >
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>
        );
      case 'pulse':
        return (
          <div
            className={`loading loading--pulse ${className}`}
            style={spinnerStyles}
            {...ariaProps}
            {...props}
          />
        );
      default:
        return (
          <div
            className={`loading loading--circular ${className}`}
            style={spinnerStyles}
            {...ariaProps}
            {...props}
          />
        );
    }
  };

  return overlay ? (
    <div className="loading--overlay" style={overlayStyles}>
      {renderSpinner()}
    </div>
  ) : renderSpinner();
};

// Default export for convenient importing
export default Loading;

// CSS Module styles
const styles = {
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
  '@keyframes pulse': {
    '0%, 100%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.2)' },
  },
  '@keyframes dots': {
    '0%, 80%, 100%': { transform: 'scale(0)' },
    '40%': { transform: 'scale(1)' },
  },
  '.loading': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    verticalAlign: 'middle',
    transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  '.loading--circular': {
    animation: 'spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite',
    borderRadius: '50%',
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderTopColor: 'currentColor',
    willChange: 'transform',
  },
  '.loading--linear': {
    width: '100%',
    height: '4px',
    overflow: 'hidden',
    position: 'relative',
    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      height: '100%',
      width: '30%',
      background: 'currentColor',
      animation: 'linear 1.5s infinite',
    },
  },
  '.loading--dots': {
    gap: '4px',
    '.dot': {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: 'currentColor',
      animation: 'dots 1.4s infinite ease-in-out both',
      '&:nth-child(1)': { animationDelay: '-0.32s' },
      '&:nth-child(2)': { animationDelay: '-0.16s' },
    },
  },
  '.loading--pulse': {
    animation: 'pulse 1.4s infinite ease-in-out both',
    borderRadius: '50%',
    background: 'currentColor',
  },
};