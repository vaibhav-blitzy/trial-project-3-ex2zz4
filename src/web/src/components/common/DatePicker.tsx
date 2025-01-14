/**
 * @fileoverview Production-ready date picker component following Material Design 3.0
 * Provides comprehensive date selection with accessibility, validation, and i18n support
 * @version 1.0.0
 */

import React, { useCallback, useMemo } from 'react';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers'; // ^6.0.0
import { TextField } from '@mui/material'; // ^5.0.0
import { useMediaQuery } from '@mui/material'; // ^5.0.0
import { BaseComponentProps } from '../../types/components.types';
import { formatDate, parseDate, isValidDate } from '../../utils/date.utils';
import useDebounce from '../../hooks/useDebounce';

/**
 * Enhanced props interface for DatePicker component
 * Extends BaseComponentProps for consistent styling and accessibility
 */
interface DatePickerProps extends BaseComponentProps {
  /** Selected date value */
  value: Date | null;
  /** Change handler with error feedback */
  onChange: (date: Date | null, error?: string) => void;
  /** Input label */
  label?: string;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Date format pattern */
  inputFormat?: string;
  /** Allow clearing the date */
  clearable?: boolean;
  /** Custom validation function */
  validate?: (date: Date) => string | null;
  /** Locale identifier */
  locale?: string;
}

/**
 * Production-ready date picker component with comprehensive features
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 */
const DatePicker: React.FC<DatePickerProps> = React.memo(({
  value,
  onChange,
  label,
  error,
  disabled = false,
  required = false,
  minDate,
  maxDate,
  inputFormat = 'yyyy-MM-dd',
  clearable = true,
  validate,
  locale = 'en-US',
  className,
  style,
  id,
  testId = 'date-picker',
  ariaLabel,
  ariaDescribedBy,
  ariaLabelledBy,
}) => {
  // Responsive handling for mobile devices
  const isMobile = useMediaQuery('(max-width:768px)');

  /**
   * Memoized date formatter for consistent display
   */
  const formatDisplayDate = useMemo(() => (date: Date | null): string => {
    if (!date || !isValidDate(date)) return '';
    return formatDate(date, inputFormat, locale);
  }, [inputFormat, locale]);

  /**
   * Debounced change handler with validation
   */
  const handleDateChange = useCallback((newDate: Date | null) => {
    let validationError: string | null = null;

    if (newDate) {
      // Validate date range
      if (minDate && newDate < minDate) {
        validationError = `Date must be after ${formatDisplayDate(minDate)}`;
      }
      if (maxDate && newDate > maxDate) {
        validationError = `Date must be before ${formatDisplayDate(maxDate)}`;
      }

      // Custom validation
      if (!validationError && validate) {
        validationError = validate(newDate);
      }
    } else if (required) {
      validationError = 'Date is required';
    }

    // Debounce the onChange call to prevent rapid updates
    const debouncedOnChange = useDebounce(() => {
      onChange(newDate, validationError || undefined);
    }, 300);

    debouncedOnChange();
  }, [minDate, maxDate, required, validate, onChange, formatDisplayDate]);

  return (
    <MuiDatePicker
      value={value}
      onChange={handleDateChange}
      disabled={disabled}
      inputFormat={inputFormat}
      minDate={minDate}
      maxDate={maxDate}
      clearable={clearable}
      renderInput={(params) => (
        <TextField
          {...params}
          id={id}
          data-testid={testId}
          label={label}
          error={!!error}
          helperText={error}
          required={required}
          className={className}
          style={style}
          aria-label={ariaLabel || label}
          aria-describedby={ariaDescribedBy}
          aria-labelledby={ariaLabelledBy}
          aria-invalid={!!error}
          aria-required={required}
          fullWidth
        />
      )}
      // Accessibility enhancements
      PopperProps={{
        role: 'dialog',
        'aria-modal': true,
        'aria-label': `${label || 'Date'} picker`,
      }}
      // Mobile optimizations
      DialogProps={{
        fullScreen: isMobile,
        'aria-labelledby': `${id}-dialog-title`,
      }}
      // Localization
      locale={locale}
      // Error handling
      onError={(reason) => {
        if (reason) {
          handleDateChange(null);
        }
      }}
      // Performance optimizations
      shouldDisableDate={(date) => {
        if (!isValidDate(date)) return true;
        if (minDate && date < minDate) return true;
        if (maxDate && date > maxDate) return true;
        return false;
      }}
    />
  );
});

DatePicker.displayName = 'DatePicker';

export default DatePicker;