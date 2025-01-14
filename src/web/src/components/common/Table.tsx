/**
 * @fileoverview Material Design 3.0 Table Component
 * Implements virtualization, real-time updates, and WCAG 2.1 Level AA accessibility
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
// react ^18.0.0
import classNames from 'classnames';
// classnames ^2.3.2
import { AutoSizer, List, WindowScroller } from 'react-virtualized';
// react-virtualized ^9.22.3
import { BaseComponentProps } from '../../types/components.types';
import { Pagination } from './Pagination';

/**
 * Interface for table column configuration
 */
export interface TableColumn<T = any> {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string | number;
  render?: (value: any, record: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  ellipsis?: boolean;
}

/**
 * Props interface for Table component
 */
export interface TableProps<T = any> extends BaseComponentProps {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  virtualScroll?: boolean;
  rowHeight?: number;
  selectedRows?: string[];
  onRowClick?: (record: T) => void;
  onSelectionChange?: (selectedKeys: string[]) => void;
  rowKey?: string | ((record: T) => string);
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  sortable?: boolean;
  defaultSortKey?: string;
  defaultSortOrder?: 'asc' | 'desc';
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  emptyText?: string;
  scroll?: { x?: number | string; y?: number | string };
}

/**
 * Custom hook for managing virtualized table rows
 */
const useVirtualizedRows = <T extends any>(
  data: T[],
  rowHeight: number,
  scroll?: { x?: number | string; y?: number | string }
) => {
  const getRowHeight = useCallback(() => rowHeight, [rowHeight]);

  const rowRenderer = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => (
      <div style={style} role="row" aria-rowindex={index + 1}>
        {data[index]}
      </div>
    ),
    [data]
  );

  return { getRowHeight, rowRenderer };
};

/**
 * Enhanced table component with virtualization and real-time updates
 */
export const Table = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  virtualScroll = false,
  rowHeight = 48,
  selectedRows = [],
  onRowClick,
  onSelectionChange,
  rowKey = 'id',
  pagination,
  sortable = false,
  defaultSortKey,
  defaultSortOrder = 'asc',
  onSort,
  className,
  style,
  emptyText = 'No data available',
  scroll,
  ariaLabel = 'Data table',
  testId = 'table',
}: TableProps<T>): React.ReactElement => {
  // State management
  const [selection, setSelection] = useState<string[]>(selectedRows);
  const [sortState, setSortState] = useState({
    key: defaultSortKey,
    order: defaultSortOrder,
  });

  // Virtualization setup
  const { getRowHeight, rowRenderer } = useVirtualizedRows(data, rowHeight, scroll);

  // Handle row selection
  const handleRowSelection = useCallback(
    (record: T) => {
      const key = typeof rowKey === 'function' ? rowKey(record) : record[rowKey];
      const newSelection = selection.includes(key)
        ? selection.filter((k) => k !== key)
        : [...selection, key];
      
      setSelection(newSelection);
      onSelectionChange?.(newSelection);
    },
    [selection, rowKey, onSelectionChange]
  );

  // Handle sorting
  const handleSort = useCallback(
    (key: string) => {
      if (!sortable) return;

      const newOrder =
        sortState.key === key && sortState.order === 'asc' ? 'desc' : 'asc';
      setSortState({ key, order: newOrder });
      onSort?.(key, newOrder);
    },
    [sortable, sortState, onSort]
  );

  // Generate accessible table headers
  const renderHeaders = useMemo(
    () => (
      <div className="table-header" role="row">
        {columns.map((column) => (
          <div
            key={column.key}
            className={classNames('table-cell', {
              'table-cell--sortable': column.sortable,
              'table-cell--sorted': sortState.key === column.key,
              [`table-cell--align-${column.align}`]: column.align,
              'table-cell--fixed': column.fixed,
              'table-cell--ellipsis': column.ellipsis,
            })}
            style={{ width: column.width }}
            role="columnheader"
            aria-sort={
              sortState.key === column.key
                ? sortState.order === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
            onClick={() => column.sortable && handleSort(column.key)}
            tabIndex={column.sortable ? 0 : -1}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && column.sortable) {
                handleSort(column.key);
              }
            }}
          >
            {column.title}
            {column.sortable && (
              <span className="table-sort-icon" aria-hidden="true">
                {sortState.key === column.key
                  ? sortState.order === 'asc'
                    ? '↑'
                    : '↓'
                  : '↕'}
              </span>
            )}
          </div>
        ))}
      </div>
    ),
    [columns, sortState, handleSort]
  );

  // Render table content
  const renderContent = () => {
    if (loading) {
      return (
        <div className="table-loading" role="status" aria-busy="true">
          Loading...
        </div>
      );
    }

    if (!data.length) {
      return (
        <div className="table-empty" role="status">
          {emptyText}
        </div>
      );
    }

    return virtualScroll ? (
      <WindowScroller>
        {({ height, isScrolling, registerChild, scrollTop }) => (
          <AutoSizer disableHeight>
            {({ width }) => (
              <div ref={registerChild}>
                <List
                  autoHeight
                  height={height}
                  width={width}
                  isScrolling={isScrolling}
                  rowCount={data.length}
                  rowHeight={getRowHeight}
                  rowRenderer={rowRenderer}
                  scrollTop={scrollTop}
                  tabIndex={-1}
                />
              </div>
            )}
          </AutoSizer>
        )}
      </WindowScroller>
    ) : (
      data.map((record, index) => (
        <div
          key={typeof rowKey === 'function' ? rowKey(record) : record[rowKey]}
          className={classNames('table-row', {
            'table-row--selected': selection.includes(
              typeof rowKey === 'function' ? rowKey(record) : record[rowKey]
            ),
          })}
          role="row"
          aria-rowindex={index + 1}
          aria-selected={selection.includes(
            typeof rowKey === 'function' ? rowKey(record) : record[rowKey]
          )}
          onClick={() => {
            onRowClick?.(record);
            handleRowSelection(record);
          }}
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              onRowClick?.(record);
              handleRowSelection(record);
            }
          }}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              className={classNames('table-cell', {
                [`table-cell--align-${column.align}`]: column.align,
                'table-cell--fixed': column.fixed,
                'table-cell--ellipsis': column.ellipsis,
              })}
              style={{ width: column.width }}
              role="cell"
            >
              {column.render
                ? column.render(record[column.key], record)
                : record[column.key]}
            </div>
          ))}
        </div>
      ))
    );
  };

  return (
    <div
      className={classNames('table-container', className)}
      style={style}
      role="table"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {renderHeaders}
      {renderContent()}
      {pagination && (
        <Pagination
          currentPage={pagination.current}
          totalItems={pagination.total}
          itemsPerPage={pagination.pageSize}
          onPageChange={(page) => pagination.onChange(page, pagination.pageSize)}
          className="table-pagination"
        />
      )}
    </div>
  );
};

export default Table;