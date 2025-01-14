/**
 * @fileoverview A reusable tooltip component following Material Design 3.0 principles
 * Provides contextual information with comprehensive accessibility support
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
// @version ^2.3.2
import classNames from 'classnames';
import { BaseComponentProps } from '../../types/components.types';

/**
 * Props interface for the Tooltip component
 */
interface TooltipProps extends BaseComponentProps {
  /** Content to display in the tooltip */
  content: string | React.ReactNode;
  /** Preferred tooltip position */
  position?: 'top' | 'right' | 'bottom' | 'left';
  /** Delay before showing tooltip (ms) */
  delay?: number;
  /** Element that triggers the tooltip */
  children: React.ReactElement;
  /** Disable tooltip */
  disabled?: boolean;
  /** Show tooltip on focus (for keyboard navigation) */
  showOnFocus?: boolean;
  /** RTL support */
  rtl?: boolean;
}

/**
 * Internal state interface for tooltip positioning and visibility
 */
interface TooltipState {
  isVisible: boolean;
  position: { top: number; left: number };
  isKeyboardTriggered: boolean;
  isTouchTriggered: boolean;
}

/**
 * Calculates optimal tooltip position with RTL support
 */
const calculatePosition = (
  triggerElement: HTMLElement,
  tooltipElement: HTMLElement,
  preferredPosition: 'top' | 'right' | 'bottom' | 'left',
  isRTL: boolean
): { top: number; left: number; fallbackPosition?: string } => {
  const trigger = triggerElement.getBoundingClientRect();
  const tooltip = tooltipElement.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  // Initial position calculations
  const positions = {
    top: {
      top: trigger.top - tooltip.height - 8,
      left: trigger.left + (trigger.width - tooltip.width) / 2
    },
    bottom: {
      top: trigger.bottom + 8,
      left: trigger.left + (trigger.width - tooltip.width) / 2
    },
    left: {
      top: trigger.top + (trigger.height - tooltip.height) / 2,
      left: isRTL ? trigger.right + 8 : trigger.left - tooltip.width - 8
    },
    right: {
      top: trigger.top + (trigger.height - tooltip.height) / 2,
      left: isRTL ? trigger.left - tooltip.width - 8 : trigger.right + 8
    }
  };

  // Check viewport boundaries and determine optimal position
  const pos = positions[preferredPosition];
  let fallbackPosition: string | undefined;

  if (pos.left < 0) {
    pos.left = 8;
    fallbackPosition = 'right';
  } else if (pos.left + tooltip.width > viewport.width) {
    pos.left = viewport.width - tooltip.width - 8;
    fallbackPosition = 'left';
  }

  if (pos.top < 0) {
    pos.top = 8;
    fallbackPosition = 'bottom';
  } else if (pos.top + tooltip.height > viewport.height) {
    pos.top = viewport.height - tooltip.height - 8;
    fallbackPosition = 'top';
  }

  return { top: pos.top, left: pos.left, fallbackPosition };
};

/**
 * Tooltip component that provides contextual information with accessibility support
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  delay = 200,
  children,
  disabled = false,
  showOnFocus = true,
  rtl = false,
  className,
  style,
  id,
  role = 'tooltip',
  ...props
}) => {
  const [state, setState] = useState<TooltipState>({
    isVisible: false,
    position: { top: 0, left: 0 },
    isKeyboardTriggered: false,
    isTouchTriggered: false
  });

  const timeoutRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  const handlePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current || !state.isVisible) return;

    const { top, left, fallbackPosition } = calculatePosition(
      triggerRef.current,
      tooltipRef.current,
      position,
      rtl
    );

    setState(prev => ({
      ...prev,
      position: { top, left }
    }));

    if (fallbackPosition) {
      tooltipRef.current.setAttribute('data-position', fallbackPosition);
    }
  }, [position, rtl, state.isVisible]);

  const handleShow = useCallback(() => {
    if (disabled) return;

    timeoutRef.current = window.setTimeout(() => {
      setState(prev => ({ ...prev, isVisible: true }));
      handlePosition();
    }, delay);
  }, [disabled, delay, handlePosition]);

  const handleHide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState(prev => ({
      ...prev,
      isVisible: false,
      isKeyboardTriggered: false,
      isTouchTriggered: false
    }));
  }, []);

  const handleFocus = useCallback((event: React.FocusEvent) => {
    if (showOnFocus && !disabled) {
      setState(prev => ({ ...prev, isKeyboardTriggered: true }));
      handleShow();
    }
  }, [showOnFocus, disabled, handleShow]);

  const handleBlur = useCallback(() => {
    handleHide();
  }, [handleHide]);

  useEffect(() => {
    // Setup resize observer
    if (triggerRef.current) {
      resizeObserverRef.current = new ResizeObserver(handlePosition);
      resizeObserverRef.current.observe(triggerRef.current);
    }

    // Setup intersection observer
    intersectionObserverRef.current = new IntersectionObserver(
      entries => {
        if (!entries[0].isIntersecting) {
          handleHide();
        }
      },
      { threshold: 0.5 }
    );

    if (triggerRef.current) {
      intersectionObserverRef.current.observe(triggerRef.current);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, [handleHide, handlePosition]);

  const tooltipClasses = classNames(
    'tooltip',
    {
      'tooltip--visible': state.isVisible,
      'tooltip--keyboard': state.isKeyboardTriggered,
      'tooltip--touch': state.isTouchTriggered,
      'tooltip--rtl': rtl
    },
    className
  );

  return (
    <div
      ref={triggerRef}
      className="tooltip-trigger"
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-describedby={id}
    >
      {children}
      {state.isVisible && (
        <div
          ref={tooltipRef}
          className={tooltipClasses}
          style={{
            ...style,
            top: state.position.top,
            left: state.position.left
          }}
          id={id}
          role={role}
          data-position={position}
          {...props}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;