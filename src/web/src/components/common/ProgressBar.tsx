/**
 * @fileoverview Material Design 3.0 Progress Bar Component
 * Implements accessible, theme-aware progress visualization with smooth transitions
 * @version 1.0.0
 */

import React from 'react'; // ^18.0.0
import { BaseComponentProps } from '../../types/components.types';
import { Size, Variant } from '../../types/common.types';

/**
 * Props interface for the ProgressBar component
 * Extends BaseComponentProps for consistent component structure
 */
interface ProgressBarProps extends BaseComponentProps {
  /** Current progress value (0-100) */
  value?: number;
  /** Visual variant following Material Design color system */
  variant?: Variant;
  /** Size variant affecting height */
  size?: Size;
  /** Indeterminate state for loading scenarios */
  indeterminate?: boolean;
  /** Accessible label for screen readers */
  label?: string;
  /** Toggle numerical value display */
  showValue?: boolean;
  /** Theme transition duration in ms */
  transitionDuration?: number;
}

/**
 * Generates Material Design 3.0 compliant class names
 * @param props Component props
 * @returns Combined class string
 */
const getProgressBarClasses = (props: ProgressBarProps): string => {
  const classes: string[] = ['md3-progress-bar'];

  // Add variant-specific classes
  if (props.variant) {
    classes.push(`md3-progress-bar--${props.variant.toLowerCase()}`);
  }

  // Add size-specific classes
  if (props.size) {
    const heights = {
      [Size.SMALL]: '4px',
      [Size.MEDIUM]: '8px',
      [Size.LARGE]: '12px'
    };
    classes.push(`md3-progress-bar--${props.size.toLowerCase()}`);
  }

  // Add state classes
  if (props.indeterminate) {
    classes.push('md3-progress-bar--indeterminate');
  }

  // Add custom classes
  if (props.className) {
    classes.push(props.className);
  }

  return classes.join(' ');
};

/**
 * Material Design 3.0 Progress Bar Component
 * Implements WCAG 2.1 Level AA accessibility standards
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  value = 0,
  variant = Variant.PRIMARY,
  size = Size.MEDIUM,
  indeterminate = false,
  label,
  showValue = false,
  transitionDuration = 150,
  style,
  ...rest
}) => {
  // Ensure value is within bounds
  const normalizedValue = Math.min(Math.max(value, 0), 100);

  // Base styles with theme transitions
  const baseStyles: React.CSSProperties = {
    transition: `all ${transitionDuration}ms ease-in-out`,
    ...style
  };

  // Progress indicator styles
  const indicatorStyles: React.CSSProperties = {
    width: indeterminate ? '100%' : `${normalizedValue}%`,
    transition: `width ${transitionDuration}ms ease-in-out`
  };

  return (
    <div
      className={getProgressBarClasses({ variant, size, indeterminate, ...rest })}
      style={baseStyles}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : normalizedValue}
      aria-label={label}
      aria-busy={indeterminate}
      {...rest}
    >
      <div className="md3-progress-bar__track">
        <div 
          className="md3-progress-bar__indicator"
          style={indicatorStyles}
        />
      </div>
      
      {showValue && !indeterminate && (
        <span 
          className="md3-progress-bar__value"
          aria-hidden="true"
        >
          {Math.round(normalizedValue)}%
        </span>
      )}
    </div>
  );
};

// Default props
ProgressBar.defaultProps = {
  value: 0,
  variant: Variant.PRIMARY,
  size: Size.MEDIUM,
  indeterminate: false,
  showValue: false,
  transitionDuration: 150
};

export default ProgressBar;