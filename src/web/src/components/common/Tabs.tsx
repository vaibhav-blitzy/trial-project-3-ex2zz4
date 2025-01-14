/**
 * @fileoverview Material Design 3.0 Tabs component with comprehensive accessibility support
 * Implements WCAG 2.1 Level AA compliance with responsive design and theme support
 * @version 1.0.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import classNames from 'classnames'; // ^2.3.2
import { BaseComponentProps } from '../../types/components.types';

// Tab item interface with comprehensive type safety
export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  tooltip?: string;
}

// Enhanced props interface extending base component props
export interface TabsProps extends BaseComponentProps {
  items: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'contained' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  iconPosition?: 'start' | 'end' | 'top';
  scrollButtons?: 'auto' | 'always' | 'never';
}

// Enhanced keyboard navigation handler
const handleKeyDown = (
  event: React.KeyboardEvent,
  items: TabItem[],
  activeTab: string,
  onChange: (tabId: string) => void,
  orientation: 'horizontal' | 'vertical'
): void => {
  const enabledTabs = items.filter(item => !item.disabled);
  const currentIndex = enabledTabs.findIndex(item => item.id === activeTab);
  let newIndex = currentIndex;

  switch (event.key) {
    case orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown':
      newIndex = currentIndex + 1 >= enabledTabs.length ? 0 : currentIndex + 1;
      break;
    case orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp':
      newIndex = currentIndex - 1 < 0 ? enabledTabs.length - 1 : currentIndex - 1;
      break;
    case 'Home':
      newIndex = 0;
      break;
    case 'End':
      newIndex = enabledTabs.length - 1;
      break;
    default:
      return;
  }

  event.preventDefault();
  onChange(enabledTabs[newIndex].id);
};

const Tabs: React.FC<TabsProps> = ({
  items,
  activeTab,
  onChange,
  orientation = 'horizontal',
  variant = 'default',
  size = 'medium',
  iconPosition = 'start',
  scrollButtons = 'auto',
  className,
  style,
  ariaLabel,
  testId,
}) => {
  const tabListRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  // Handle scroll visibility
  const checkScrollButtons = useCallback(() => {
    if (!tabListRef.current || scrollButtons === 'never') {
      setShowScrollButtons(false);
      return;
    }

    const { scrollWidth, clientWidth, scrollLeft } = tabListRef.current;
    setShowScrollButtons(scrollWidth > clientWidth);
    setScrollPosition(scrollLeft);
  }, [scrollButtons]);

  // Initialize resize observer
  useEffect(() => {
    const observer = new ResizeObserver(checkScrollButtons);
    if (tabListRef.current) {
      observer.observe(tabListRef.current);
    }
    return () => observer.disconnect();
  }, [checkScrollButtons]);

  // Handle scroll button clicks
  const handleScroll = (direction: 'left' | 'right') => {
    if (!tabListRef.current) return;
    const scrollAmount = direction === 'left' ? -200 : 200;
    tabListRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Render tab list with enhanced accessibility
  const renderTabList = () => {
    const tabListClasses = classNames(
      'tabs__list',
      `tabs__list--${orientation}`,
      `tabs__list--${variant}`,
      `tabs__list--${size}`,
      className
    );

    return (
      <div className="tabs__container" style={style}>
        {showScrollButtons && scrollButtons !== 'never' && orientation === 'horizontal' && (
          <button
            className="tabs__scroll-button"
            onClick={() => handleScroll('left')}
            disabled={scrollPosition === 0}
            aria-label="Scroll tabs left"
          >
            ←
          </button>
        )}
        <div
          ref={tabListRef}
          role="tablist"
          aria-label={ariaLabel}
          aria-orientation={orientation}
          className={tabListClasses}
          data-testid={testId}
          onScroll={checkScrollButtons}
        >
          {items.map((item) => {
            const isActive = item.id === activeTab;
            const tabClasses = classNames(
              'tabs__tab',
              `tabs__tab--${size}`,
              {
                'tabs__tab--active': isActive,
                'tabs__tab--disabled': item.disabled,
                [`tabs__tab--icon-${iconPosition}`]: !!item.icon,
              }
            );

            return (
              <button
                key={item.id}
                ref={(el) => {
                  if (el) tabRefs.current.set(item.id, el);
                  else tabRefs.current.delete(item.id);
                }}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${item.id}`}
                aria-disabled={item.disabled}
                id={`tab-${item.id}`}
                tabIndex={isActive ? 0 : -1}
                className={tabClasses}
                onClick={() => !item.disabled && onChange(item.id)}
                onKeyDown={(e) => handleKeyDown(e, items, activeTab, onChange, orientation)}
                title={item.tooltip}
                disabled={item.disabled}
              >
                {item.icon && iconPosition !== 'end' && (
                  <span className="tabs__tab-icon">{item.icon}</span>
                )}
                <span className="tabs__tab-label">{item.label}</span>
                {item.icon && iconPosition === 'end' && (
                  <span className="tabs__tab-icon">{item.icon}</span>
                )}
              </button>
            );
          })}
        </div>
        {showScrollButtons && scrollButtons !== 'never' && orientation === 'horizontal' && (
          <button
            className="tabs__scroll-button"
            onClick={() => handleScroll('right')}
            disabled={
              tabListRef.current &&
              scrollPosition + tabListRef.current.clientWidth >=
                tabListRef.current.scrollWidth
            }
            aria-label="Scroll tabs right"
          >
            →
          </button>
        )}
      </div>
    );
  };

  // Render tab panels with accessibility support
  const renderTabPanels = () => (
    <div className="tabs__panels">
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`panel-${item.id}`}
          aria-labelledby={`tab-${item.id}`}
          hidden={item.id !== activeTab}
          className={classNames('tabs__panel', {
            'tabs__panel--active': item.id === activeTab,
          })}
          tabIndex={0}
        >
          {item.content}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={classNames('tabs', `tabs--${orientation}`, className)}
      style={style}
    >
      {renderTabList()}
      {renderTabPanels()}
    </div>
  );
};

export default Tabs;