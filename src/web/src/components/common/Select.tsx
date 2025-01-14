/**
 * @fileoverview Material Design 3.0 select component with WCAG 2.1 Level AA compliance
 * Provides enhanced accessibility, form validation, and performance optimization
 * @version 1.0.0
 */

import React, { useCallback, useMemo, useRef, useState } from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import { BaseComponentProps } from '../../types/components.types';
import { Size, Variant } from '../../types/common.types';
import useForm from '../../hooks/useForm';

/**
 * Enhanced props interface for Select component with accessibility and validation
 */
interface SelectProps extends BaseComponentProps {
  name: string;
  value: string | number | string[];
  options: Array<{
    value: string | number;
    label: string;
    disabled?: boolean;
  }>;
  onChange: (value: string | number | string[], event: React.SyntheticEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  multiple?: boolean;
  size?: Size;
  variant?: Variant;
  required?: boolean;
  searchable?: boolean;
  virtualized?: boolean;
  maxHeight?: number;
}

/**
 * Custom hook for select component logic with optimization
 */
const useSelect = (props: SelectProps) => {
  const {
    value,
    options,
    multiple,
    searchable,
    virtualized,
    maxHeight = 300
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const selectRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Memoize filtered options for performance
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options;
    return options.filter(option => 
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchable, searchQuery]);

  // Virtual scroll configuration
  const itemHeight = 40;
  const visibleItems = Math.ceil(maxHeight / itemHeight);
  const virtualizedOptions = useMemo(() => {
    if (!virtualized) return filteredOptions;
    const startIndex = Math.max(0, focusedIndex - Math.floor(visibleItems / 2));
    return filteredOptions.slice(startIndex, startIndex + visibleItems);
  }, [filteredOptions, virtualized, focusedIndex, visibleItems]);

  // Keyboard navigation handlers
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => 
          Math.min(prev + 1, filteredOptions.length - 1)
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0) {
          const selectedOption = filteredOptions[focusedIndex];
          handleSelect(selectedOption.value, event);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        break;
    }
  }, [filteredOptions, focusedIndex]);

  // Selection handler with multi-select support
  const handleSelect = useCallback((optionValue: string | number, event: React.SyntheticEvent) => {
    if (multiple) {
      const newValue = Array.isArray(value) ? value : [];
      const valueIndex = newValue.indexOf(optionValue as never);
      
      if (valueIndex === -1) {
        props.onChange([...newValue, optionValue], event);
      } else {
        props.onChange(
          [...newValue.slice(0, valueIndex), ...newValue.slice(valueIndex + 1)],
          event
        );
      }
    } else {
      props.onChange(optionValue, event);
      setIsOpen(false);
    }
  }, [multiple, value, props.onChange]);

  return {
    isOpen,
    setIsOpen,
    searchQuery,
    setSearchQuery,
    focusedIndex,
    setFocusedIndex,
    filteredOptions,
    virtualizedOptions,
    handleKeyDown,
    handleSelect,
    selectRef,
    listRef,
    searchRef,
    itemHeight
  };
};

/**
 * Material Design 3.0 select component with enhanced accessibility
 */
const Select = React.memo<SelectProps>((props) => {
  const {
    name,
    value,
    options,
    onChange,
    placeholder,
    disabled,
    error,
    multiple,
    size = Size.MEDIUM,
    variant = Variant.PRIMARY,
    required,
    searchable,
    virtualized,
    maxHeight,
    className,
    style,
    ariaLabel,
    testId,
    ...rest
  } = props;

  const {
    isOpen,
    setIsOpen,
    searchQuery,
    setSearchQuery,
    focusedIndex,
    filteredOptions,
    virtualizedOptions,
    handleKeyDown,
    handleSelect,
    selectRef,
    listRef,
    searchRef,
    itemHeight
  } = useSelect(props);

  // Generate unique IDs for accessibility
  const selectId = useMemo(() => `select-${name}`, [name]);
  const listboxId = useMemo(() => `listbox-${name}`, [name]);
  const searchId = useMemo(() => `search-${name}`, [name]);

  return (
    <div
      ref={selectRef}
      className={clsx(
        'select-container',
        `select-${size}`,
        `select-${variant}`,
        {
          'select-disabled': disabled,
          'select-error': error,
          'select-multiple': multiple
        },
        className
      )}
      style={style}
      data-testid={testId}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={ariaLabel || `Select ${name}`}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : undefined}
        id={selectId}
        className="select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
      >
        {/* Selected value display */}
        <span className="select-value">
          {multiple 
            ? (Array.isArray(value) ? value : []).map(v => 
                options.find(o => o.value === v)?.label
              ).join(', ') || placeholder
            : options.find(o => o.value === value)?.label || placeholder
          }
        </span>
        
        {/* Dropdown arrow icon */}
        <span className={clsx('select-arrow', { 'select-arrow-open': isOpen })} />
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="select-dropdown" style={{ maxHeight }}>
          {searchable && (
            <input
              ref={searchRef}
              id={searchId}
              type="text"
              className="select-search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              aria-label="Search options"
              autoComplete="off"
            />
          )}

          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-multiselectable={multiple}
            className="select-options"
            style={virtualized ? { height: itemHeight * virtualizedOptions.length } : undefined}
          >
            {(virtualized ? virtualizedOptions : filteredOptions).map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={multiple 
                  ? Array.isArray(value) && value.includes(option.value as never)
                  : value === option.value
                }
                aria-disabled={option.disabled}
                className={clsx('select-option', {
                  'select-option-selected': multiple 
                    ? Array.isArray(value) && value.includes(option.value as never)
                    : value === option.value,
                  'select-option-focused': index === focusedIndex,
                  'select-option-disabled': option.disabled
                })}
                onClick={e => !option.disabled && handleSelect(option.value, e)}
              >
                {multiple && (
                  <input
                    type="checkbox"
                    checked={Array.isArray(value) && value.includes(option.value as never)}
                    readOnly
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                )}
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          id={`${selectId}-error`}
          className="select-error-message"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;