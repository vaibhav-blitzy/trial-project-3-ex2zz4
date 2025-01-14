/**
 * @fileoverview Enterprise-grade Input component implementing Material Design 3.0
 * Provides comprehensive validation, accessibility, and internationalization support
 * @version 1.0.0
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import { styled } from '@mui/material/styles'; // v5.0.0
import { TextField } from '@mui/material'; // v5.0.0
import { debounce } from 'lodash'; // v4.17.21
import { InputProps } from '../../types/components.types';
import { validateRequired, validateEmail, validateLength } from '../../utils/validation.utils';

// Enhanced styled TextField with Material Design 3.0 principles
const StyledInput = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    borderRadius: theme.shape.borderRadius,
    transition: theme.transitions.create(['border-color', 'box-shadow']),
    '&:hover': {
      borderColor: theme.palette.primary.main,
    },
    '&.Mui-focused': {
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}25`,
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: theme.typography.pxToRem(16),
    transition: theme.transitions.create(['color', 'transform']),
  },
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.5, 2),
    '&::placeholder': {
      opacity: 0.7,
      color: theme.palette.text.secondary,
    },
  },
  '& .MuiFormHelperText-root': {
    marginLeft: 0,
    fontSize: theme.typography.pxToRem(12),
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },
  // Enhanced touch targets for mobile accessibility
  '@media (pointer: coarse)': {
    '& .MuiInputBase-input': {
      padding: theme.spacing(2),
      minHeight: 48,
    },
  },
}));

// Interface for input state management
interface InputState {
  error: string | null;
  touched: boolean;
  validationMetadata: Record<string, unknown>;
  accessibilityAnnouncement: string;
}

/**
 * Enterprise-grade Input component with comprehensive validation and accessibility
 * @param props - Input component props
 * @returns React component
 */
export const Input: React.FC<InputProps> = React.memo(({
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  helperText,
  required = false,
  disabled = false,
  autoComplete,
  autoFocus = false,
  maxLength,
  minLength,
  pattern,
  readOnly = false,
  variant = 'outlined',
  size = 'medium',
  fullWidth = true,
  startAdornment,
  endAdornment,
  ariaLabel,
  ariaDescribedBy,
  testId,
  ...rest
}) => {
  // State management
  const [state, setState] = useState<InputState>({
    error: null,
    touched: false,
    validationMetadata: {},
    accessibilityAnnouncement: '',
  });

  // Refs for DOM elements
  const inputRef = useRef<HTMLInputElement>(null);
  const announcer = useRef<HTMLDivElement>(null);

  // Debounced validation for performance
  const debouncedValidation = useMemo(
    () => debounce(async (value: string) => {
      let validationResult = { isValid: true, error: null, ariaDescription: '' };

      // Required field validation
      if (required) {
        validationResult = validateRequired(value, name);
        if (!validationResult.isValid) {
          return validationResult;
        }
      }

      // Email validation
      if (type === 'email' && value) {
        validationResult = validateEmail(value);
        if (!validationResult.isValid) {
          return validationResult;
        }
      }

      // Length validation
      if ((minLength || maxLength) && value) {
        validationResult = validateLength(
          value,
          minLength || 0,
          maxLength || Number.MAX_SAFE_INTEGER,
          name
        );
      }

      // Pattern validation
      if (pattern && value) {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          return {
            isValid: false,
            error: `Invalid ${name} format`,
            ariaDescription: `${name} format is invalid`,
          };
        }
      }

      return validationResult;
    }, 300),
    [name, required, type, minLength, maxLength, pattern]
  );

  // Handle input changes with validation
  const handleChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      
      // Call parent onChange handler
      onChange(event);

      // Update touched state
      setState(prev => ({ ...prev, touched: true }));

      // Perform validation
      const validationResult = await debouncedValidation(newValue);

      // Update state with validation results
      setState(prev => ({
        ...prev,
        error: validationResult.error,
        validationMetadata: {
          ...prev.validationMetadata,
          lastValidated: new Date(),
        },
        accessibilityAnnouncement: validationResult.ariaDescription || '',
      }));

      // Update ARIA live region
      if (announcer.current) {
        announcer.current.textContent = validationResult.ariaDescription || '';
      }
    },
    [onChange, debouncedValidation]
  );

  // Memoized input ID for accessibility
  const inputId = useMemo(() => `input-${name}`, [name]);
  const errorId = useMemo(() => `error-${name}`, [name]);

  return (
    <>
      <StyledInput
        id={inputId}
        inputRef={inputRef}
        name={name}
        value={value}
        onChange={handleChange}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        error={Boolean(state.error)}
        helperText={state.error || helperText}
        required={required}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        inputProps={{
          maxLength,
          minLength,
          pattern,
          readOnly,
          'aria-label': ariaLabel || name,
          'aria-invalid': Boolean(state.error),
          'aria-required': required,
          'aria-describedby': state.error ? errorId : ariaDescribedBy,
          'data-testid': testId,
        }}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        InputProps={{
          startAdornment,
          endAdornment,
        }}
        {...rest}
      />
      {/* Hidden ARIA live region for announcing validation status */}
      <div
        ref={announcer}
        role="status"
        aria-live="polite"
        className="sr-only"
        style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}
      />
    </>
  );
});

Input.displayName = 'Input';

export default Input;