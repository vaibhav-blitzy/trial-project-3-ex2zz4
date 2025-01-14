/**
 * @fileoverview Material Design 3.0 TextArea component with accessibility and validation
 * Implements WCAG 2.1 Level AA compliance with comprehensive theming support
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { debounce } from 'lodash'; // v4.17.21
import { BaseComponentProps, FormControlProps } from '../../types/components.types';
import { COLORS, TYPOGRAPHY, SPACING, TRANSITIONS } from '../../constants/theme.constants';
import { validateLength, validateInput } from '../../utils/validation.utils';

/**
 * Props interface for TextArea component with enhanced accessibility
 */
export interface TextAreaProps extends BaseComponentProps, FormControlProps {
  /** Input field name for form identification */
  name: string;
  /** Current input value */
  value: string;
  /** Change event handler */
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Placeholder text with i18n support */
  placeholder?: string;
  /** Number of visible text rows */
  rows?: number;
  /** Maximum character length */
  maxLength?: number;
  /** Minimum character length */
  minLength?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Required field indicator */
  required?: boolean;
  /** Autofocus on mount */
  autoFocus?: boolean;
  /** Resize behavior control */
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
  /** Character count display */
  showCharCount?: boolean;
  /** Theme preference */
  theme?: 'light' | 'dark' | 'system';
  /** Text direction */
  dir?: 'ltr' | 'rtl';
}

/**
 * Material Design 3.0 TextArea component with comprehensive features
 */
const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      name,
      value = '',
      onChange,
      placeholder = '',
      rows = 3,
      maxLength,
      minLength = 0,
      disabled = false,
      required = false,
      autoFocus = false,
      resize = 'vertical',
      showCharCount = true,
      theme = 'system',
      dir = 'ltr',
      className = '',
      style,
      id,
      testId = 'textarea',
      ariaLabel,
      ariaDescribedBy,
      ariaLabelledBy,
    },
    ref
  ) => {
    const [error, setError] = useState<string>('');
    const [isFocused, setIsFocused] = useState(false);
    const [currentTheme, setCurrentTheme] = useState(theme);

    // Detect system theme preference
    useEffect(() => {
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setCurrentTheme(isDark ? 'dark' : 'light');
      } else {
        setCurrentTheme(theme);
      }
    }, [theme]);

    // Debounced validation handler
    const validateContent = useCallback(
      debounce((content: string) => {
        if (required && content.trim().length === 0) {
          setError('This field is required');
          return;
        }

        const lengthValidation = validateLength(
          content,
          minLength,
          maxLength || Number.MAX_SAFE_INTEGER,
          name
        );

        if (!lengthValidation.isValid) {
          setError(lengthValidation.error || '');
        } else {
          setError('');
        }
      }, 300),
      [minLength, maxLength, required, name]
    );

    // Handle value changes
    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event);
      validateContent(event.target.value);
    };

    // Dynamic styles based on theme and state
    const getStyles = (): React.CSSProperties => ({
      width: '100%',
      minHeight: `${rows * 24}px`,
      padding: SPACING.scale[3],
      fontSize: TYPOGRAPHY.fontSizes.base,
      fontFamily: TYPOGRAPHY.fontFamilies.primary,
      lineHeight: TYPOGRAPHY.lineHeights.normal,
      color: COLORS[currentTheme].text.primary,
      backgroundColor: COLORS[currentTheme].background.paper,
      border: `1px solid ${error ? COLORS[currentTheme].primary.main : COLORS[currentTheme].text.secondary}`,
      borderRadius: SPACING.scale[1],
      resize,
      transition: `all ${TRANSITIONS.duration.standard} ${TRANSITIONS.easing.easeInOut}`,
      outline: 'none',
      ...style,
      ...(isFocused && {
        borderColor: COLORS[currentTheme].primary.main,
        boxShadow: `0 0 0 2px ${COLORS[currentTheme].primary.light}`,
      }),
      ...(disabled && {
        backgroundColor: COLORS[currentTheme].background.default,
        color: COLORS[currentTheme].text.disabled,
        cursor: 'not-allowed',
      }),
    });

    return (
      <div
        className={`textarea-wrapper ${className}`}
        style={{ width: '100%', direction: dir }}
        data-testid={testId}
      >
        <textarea
          ref={ref}
          id={id || name}
          name={name}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          aria-label={ariaLabel || placeholder}
          aria-describedby={ariaDescribedBy}
          aria-labelledby={ariaLabelledBy}
          aria-invalid={!!error}
          aria-required={required}
          style={getStyles()}
        />
        
        {/* Error message with ARIA support */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              color: COLORS[currentTheme].primary.main,
              fontSize: TYPOGRAPHY.fontSizes.sm,
              marginTop: SPACING.scale[1],
            }}
          >
            {error}
          </div>
        )}

        {/* Character count indicator */}
        {showCharCount && maxLength && (
          <div
            aria-live="polite"
            style={{
              color: COLORS[currentTheme].text.secondary,
              fontSize: TYPOGRAPHY.fontSizes.sm,
              textAlign: 'right',
              marginTop: SPACING.scale[1],
            }}
          >
            {value.length}/{maxLength}
          </div>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export default TextArea;