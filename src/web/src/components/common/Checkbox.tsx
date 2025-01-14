import React, { useRef, useEffect, forwardRef } from 'react';
import clsx from 'clsx'; // v1.2.1
import { BaseComponentProps } from '../../types/components.types';
import { useTheme } from '../../hooks/useTheme';
import { TRANSITIONS, SPACING } from '../../constants/theme.constants';

/**
 * Props interface for Checkbox component with enhanced accessibility and interaction features
 */
interface CheckboxProps extends BaseComponentProps {
  /** Input name for form submission */
  name: string;
  /** Controlled checked state */
  checked: boolean;
  /** Change handler callback */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Required field indicator */
  required?: boolean;
  /** Accessible label text */
  label?: string;
  /** Error message text */
  error?: string;
  /** Indeterminate state */
  indeterminate?: boolean;
  /** Checkbox size variant */
  size?: 'small' | 'medium' | 'large';
  /** Custom checkbox icon */
  icon?: React.ReactNode;
}

/**
 * Custom hook for managing checkbox state and interactions
 */
const useCheckboxState = (props: CheckboxProps) => {
  const { checked, indeterminate, disabled } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);

  // Handle indeterminate state
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  // Handle ripple effect
  const handleRipple = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !rippleRef.current) return;

    const ripple = rippleRef.current;
    const rect = ripple.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const rippleElement = document.createElement('span');
    rippleElement.style.width = rippleElement.style.height = `${size}px`;
    rippleElement.style.left = `${x}px`;
    rippleElement.style.top = `${y}px`;
    rippleElement.classList.add('checkbox-ripple-effect');

    ripple.appendChild(rippleElement);
    setTimeout(() => ripple.removeChild(rippleElement), 600);
  };

  return {
    inputRef,
    rippleRef,
    handleRipple,
    isChecked: checked,
    isDisabled: disabled,
    isIndeterminate: indeterminate
  };
};

/**
 * Enhanced checkbox component following Material Design 3.0 principles
 * Implements WCAG 2.1 Level AA compliance and theme-aware styling
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (props, ref) => {
    const {
      name,
      checked,
      onChange,
      disabled = false,
      required = false,
      label,
      error,
      indeterminate = false,
      size = 'medium',
      icon,
      className,
      style,
      id,
      testId = 'checkbox',
      ariaLabel,
      ariaDescribedBy,
      ariaLabelledBy,
    } = props;

    const { theme } = useTheme();
    const { inputRef, rippleRef, handleRipple, isChecked, isDisabled } = useCheckboxState(props);

    // Size mappings
    const sizeMap = {
      small: SPACING.scale['4'],
      medium: SPACING.scale['5'],
      large: SPACING.scale['6']
    };

    // Generate component classes
    const checkboxClasses = clsx(
      'checkbox-root',
      `checkbox-${size}`,
      {
        'checkbox-checked': isChecked,
        'checkbox-disabled': isDisabled,
        'checkbox-error': error,
        'checkbox-indeterminate': indeterminate
      },
      className
    );

    // Component styles with theme integration
    const checkboxStyles: React.CSSProperties = {
      '--checkbox-size': sizeMap[size],
      '--checkbox-color': theme.palette.primary.main,
      '--checkbox-border-color': isDisabled 
        ? theme.palette.text.disabled 
        : error 
          ? theme.palette.error.main 
          : theme.palette.text.secondary,
      '--checkbox-transition': TRANSITIONS.duration.shortest,
      ...style
    };

    return (
      <div 
        className={checkboxClasses} 
        style={checkboxStyles}
        data-testid={testId}
      >
        <div className="checkbox-input-wrapper">
          <input
            ref={ref || inputRef}
            type="checkbox"
            name={name}
            id={id || name}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            required={required}
            aria-label={ariaLabel || label}
            aria-describedby={ariaDescribedBy}
            aria-labelledby={ariaLabelledBy}
            aria-invalid={Boolean(error)}
            className="checkbox-input"
          />
          <div 
            ref={rippleRef}
            className="checkbox-ripple"
            onClick={handleRipple}
          >
            {icon || (
              <svg 
                className="checkbox-icon" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {isChecked && (
                  <path 
                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                    fill="currentColor"
                  />
                )}
                {indeterminate && (
                  <path
                    d="M19 13H5v-2h14v2z"
                    fill="currentColor"
                  />
                )}
              </svg>
            )}
          </div>
        </div>
        {label && (
          <label 
            htmlFor={id || name}
            className="checkbox-label"
          >
            {label}
            {required && <span className="checkbox-required">*</span>}
          </label>
        )}
        {error && (
          <div 
            className="checkbox-error-text"
            role="alert"
          >
            {error}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export type { CheckboxProps };