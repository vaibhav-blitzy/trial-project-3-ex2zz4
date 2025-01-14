/**
 * @fileoverview Material Design 3.0 Dropdown Component with enhanced accessibility
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
// @version ^18.0.0
import clsx from 'clsx';
// @version ^2.0.0
import { useVirtual } from 'react-virtual';
// @version ^2.10.4
import { BaseComponentProps } from '../../types/components.types';

export interface DropdownOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface DropdownProps extends BaseComponentProps {
  options: DropdownOption[];
  value: string | string[] | number | number[];
  onChange: (value: string | string[] | number | number[]) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  multiple?: boolean;
  searchable?: boolean;
  loading?: boolean;
  maxHeight?: number;
  required?: boolean;
  virtualScrolling?: boolean;
  itemHeight?: number;
  searchDebounceMs?: number;
  renderOption?: (option: DropdownOption) => React.ReactNode;
  onSearchChange?: (searchTerm: string) => void;
  loadingMessage?: string;
  noOptionsMessage?: string;
  clearable?: boolean;
}

const DEFAULT_ITEM_HEIGHT = 48;
const DEFAULT_MAX_HEIGHT = 300;
const DEFAULT_DEBOUNCE_MS = 300;

const useDropdownKeyboard = (
  options: DropdownOption[],
  highlightedIndex: number,
  setHighlightedIndex: (index: number) => void,
  isOpen: boolean,
  onClose: () => void,
  onSelect: (option: DropdownOption) => void
) => {
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex((prev) => 
          prev < options.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) => 
          prev > 0 ? prev - 1 : options.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && options[highlightedIndex]) {
          onSelect(options[highlightedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
      case 'Home':
        event.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setHighlightedIndex(options.length - 1);
        break;
    }
  }, [isOpen, options, highlightedIndex, setHighlightedIndex, onClose, onSelect]);

  return { handleKeyDown };
};

export const Dropdown: React.FC<DropdownProps> = React.memo(({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  error,
  multiple = false,
  searchable = false,
  loading = false,
  maxHeight = DEFAULT_MAX_HEIGHT,
  required = false,
  virtualScrolling = false,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  searchDebounceMs = DEFAULT_DEBOUNCE_MS,
  renderOption,
  onSearchChange,
  loadingMessage = 'Loading...',
  noOptionsMessage = 'No options available',
  clearable = true,
  className,
  style,
  ariaLabel,
  ariaDescribedBy,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option => 
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const rowVirtualizer = useVirtual({
    size: filteredOptions.length,
    parentRef: menuRef,
    estimateSize: useCallback(() => itemHeight, [itemHeight]),
    overscan: 5,
  });

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsOpen(prev => !prev);
    setHighlightedIndex(-1);
    setSearchTerm('');
  }, [disabled]);

  const handleSelect = useCallback((option: DropdownOption) => {
    if (option.disabled) return;

    if (multiple) {
      const newValue = Array.isArray(value) ? [...value] : [];
      const optionValue = option.value.toString();
      
      if (newValue.includes(optionValue)) {
        onChange(newValue.filter(v => v !== optionValue));
      } else {
        onChange([...newValue, optionValue]);
      }
    } else {
      onChange(option.value);
      setIsOpen(false);
    }
  }, [multiple, value, onChange]);

  const { handleKeyDown } = useDropdownKeyboard(
    filteredOptions,
    highlightedIndex,
    setHighlightedIndex,
    isOpen,
    () => setIsOpen(false),
    handleSelect
  );

  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!onSearchChange || !searchTerm) return;

    const timer = setTimeout(() => {
      onSearchChange(searchTerm);
    }, searchDebounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, onSearchChange, searchDebounceMs]);

  const renderDropdownOption = useCallback((option: DropdownOption) => {
    if (renderOption) return renderOption(option);

    const isSelected = multiple
      ? Array.isArray(value) && value.includes(option.value.toString())
      : value === option.value;

    return (
      <div
        className={clsx(
          'dropdown-option',
          option.disabled && 'disabled',
          isSelected && 'selected'
        )}
        aria-selected={isSelected}
        role="option"
      >
        {option.icon && <span className="option-icon">{option.icon}</span>}
        <span className="option-label">{option.label}</span>
        {option.description && (
          <span className="option-description">{option.description}</span>
        )}
      </div>
    );
  }, [multiple, value, renderOption]);

  return (
    <div
      ref={containerRef}
      className={clsx('md3-dropdown', className, {
        'is-disabled': disabled,
        'has-error': error,
        'is-open': isOpen
      })}
      style={style}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-disabled={disabled}
      aria-invalid={!!error}
      aria-required={required}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      onKeyDown={handleKeyDown}
    >
      <button
        className="dropdown-trigger"
        onClick={handleToggle}
        disabled={disabled}
        aria-controls="dropdown-menu"
        type="button"
      >
        <span className="trigger-content">
          {multiple
            ? Array.isArray(value) && value.length > 0
              ? `${value.length} selected`
              : placeholder
            : options.find(opt => opt.value === value)?.label || placeholder
          }
        </span>
        <span className="trigger-icon" aria-hidden="true">
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id="dropdown-menu"
          className="dropdown-menu"
          role="listbox"
          aria-multiselectable={multiple}
          style={{ maxHeight }}
        >
          {searchable && (
            <div className="search-container">
              <input
                ref={searchRef}
                type="text"
                className="search-input"
                placeholder="Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                aria-label="Search dropdown options"
              />
            </div>
          )}

          {loading ? (
            <div className="dropdown-message" role="status">
              {loadingMessage}
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="dropdown-message" role="status">
              {noOptionsMessage}
            </div>
          ) : virtualScrolling ? (
            <div
              style={{
                height: `${rowVirtualizer.totalSize}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.virtualItems.map(virtualRow => (
                <div
                  key={virtualRow.index}
                  className={clsx(
                    'virtualized-option',
                    highlightedIndex === virtualRow.index && 'highlighted'
                  )}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${itemHeight}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => handleSelect(filteredOptions[virtualRow.index])}
                >
                  {renderDropdownOption(filteredOptions[virtualRow.index])}
                </div>
              ))}
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={option.value}
                className={clsx(
                  'dropdown-option-container',
                  highlightedIndex === index && 'highlighted'
                )}
                onClick={() => handleSelect(option)}
              >
                {renderDropdownOption(option)}
              </div>
            ))
          )}
        </div>
      )}

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
});

Dropdown.displayName = 'Dropdown';

export default Dropdown;