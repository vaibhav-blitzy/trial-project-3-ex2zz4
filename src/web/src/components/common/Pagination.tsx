/**
 * @fileoverview Material Design 3.0 Pagination Component
 * Implements WCAG 2.1 Level AA accessibility standards with RTL support
 * @version 1.0.0
 */

import React, { useCallback, useMemo } from 'react';
// react ^18.0.0
import classNames from 'classnames';
// classnames ^2.3.2
import { BaseComponentProps } from '../../types/components.types';

/**
 * Props interface for the Pagination component
 * Extends BaseComponentProps for consistent styling and accessibility
 */
export interface PaginationProps extends BaseComponentProps {
  /** Total number of items to paginate */
  totalItems: number;
  /** Number of items to display per page */
  itemsPerPage: number;
  /** Current active page number (1-based) */
  currentPage: number;
  /** Callback function when page changes */
  onPageChange: (page: number) => void;
  /** Number of page buttons to show on each side of current page */
  siblingCount?: number;
  /** Disables pagination interaction */
  disabled?: boolean;
  /** Text direction for RTL support */
  dir?: 'ltr' | 'rtl';
}

/**
 * Generates array of page numbers to display
 * Implements ellipsis for large page ranges
 */
const getPageNumbers = (
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | string)[] => {
  const pageNumbers: (number | string)[] = [];
  const totalNumbers = siblingCount * 2 + 3; // siblings + current + first + last
  const totalBlocks = totalNumbers + 2; // +2 for ellipsis blocks

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);
  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftRange = Array.from({ length: totalNumbers }, (_, i) => i + 1);
    return [...leftRange, '...', totalPages];
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightRange = Array.from(
      { length: totalNumbers },
      (_, i) => totalPages - totalNumbers + i + 1
    );
    return [1, '...', ...rightRange];
  }

  if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );
    return [1, '...', ...middleRange, '...', totalPages];
  }

  return [];
};

/**
 * Pagination component implementing Material Design 3.0 principles
 * Features keyboard navigation, RTL support, and WCAG 2.1 Level AA compliance
 */
export const Pagination: React.FC<PaginationProps> = React.memo(({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  siblingCount = 1,
  disabled = false,
  dir = 'ltr',
  className,
  style,
  ariaLabel = 'Pagination navigation',
  testId = 'pagination',
}) => {
  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Generate page numbers with memoization
  const pageNumbers = useMemo(() => 
    getPageNumbers(currentPage, totalPages, siblingCount),
    [currentPage, totalPages, siblingCount]
  );

  /**
   * Handles page change with validation
   */
  const handlePageChange = useCallback((page: number) => {
    if (disabled || page === currentPage) return;
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  }, [disabled, currentPage, totalPages, onPageChange]);

  /**
   * Handles keyboard navigation
   */
  const handleKeyPress = useCallback((
    event: React.KeyboardEvent<HTMLButtonElement>,
    page: number
  ) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handlePageChange(page);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        handlePageChange(dir === 'rtl' ? currentPage + 1 : currentPage - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        handlePageChange(dir === 'rtl' ? currentPage - 1 : currentPage + 1);
        break;
      case 'Home':
        event.preventDefault();
        handlePageChange(1);
        break;
      case 'End':
        event.preventDefault();
        handlePageChange(totalPages);
        break;
      default:
        break;
    }
  }, [disabled, handlePageChange, currentPage, totalPages, dir]);

  // Don't render if there's only one page
  if (totalPages <= 1) return null;

  return (
    <nav
      className={classNames('pagination', className, {
        'pagination--disabled': disabled,
        'pagination--rtl': dir === 'rtl'
      })}
      style={style}
      aria-label={ariaLabel}
      data-testid={testId}
      dir={dir}
    >
      <ul className="pagination__list" role="list">
        {/* Previous page button */}
        <li>
          <button
            type="button"
            className={classNames('pagination__button', {
              'pagination__button--disabled': currentPage === 1 || disabled
            })}
            onClick={() => handlePageChange(currentPage - 1)}
            onKeyDown={(e) => handleKeyPress(e, currentPage - 1)}
            disabled={currentPage === 1 || disabled}
            aria-label="Previous page"
            aria-disabled={currentPage === 1 || disabled}
          >
            {dir === 'rtl' ? '›' : '‹'}
          </button>
        </li>

        {/* Page numbers */}
        {pageNumbers.map((pageNumber, index) => (
          <li key={`${pageNumber}-${index}`}>
            {pageNumber === '...' ? (
              <span
                className="pagination__ellipsis"
                aria-hidden="true"
              >
                ⋯
              </span>
            ) : (
              <button
                type="button"
                className={classNames('pagination__button', {
                  'pagination__button--active': pageNumber === currentPage,
                  'pagination__button--disabled': disabled
                })}
                onClick={() => handlePageChange(pageNumber as number)}
                onKeyDown={(e) => handleKeyPress(e, pageNumber as number)}
                disabled={disabled}
                aria-current={pageNumber === currentPage ? 'page' : undefined}
                aria-label={`Page ${pageNumber}`}
              >
                {pageNumber}
              </button>
            )}
          </li>
        ))}

        {/* Next page button */}
        <li>
          <button
            type="button"
            className={classNames('pagination__button', {
              'pagination__button--disabled': currentPage === totalPages || disabled
            })}
            onClick={() => handlePageChange(currentPage + 1)}
            onKeyDown={(e) => handleKeyPress(e, currentPage + 1)}
            disabled={currentPage === totalPages || disabled}
            aria-label="Next page"
            aria-disabled={currentPage === totalPages || disabled}
          >
            {dir === 'rtl' ? '‹' : '›'}
          </button>
        </li>
      </ul>

      {/* Screen reader status */}
      <div className="sr-only" role="status" aria-live="polite">
        {`Page ${currentPage} of ${totalPages}`}
      </div>
    </nav>
  );
});

Pagination.displayName = 'Pagination';

export default Pagination;