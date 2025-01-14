/**
 * @fileoverview Material Design 3.0 Toast component with accessibility support
 * @version 1.0.0
 */

import React, { useEffect, useCallback } from 'react';
import classNames from 'classnames'; // ^2.3.2
import { motion, AnimatePresence } from 'framer-motion'; // ^10.0.0
import type { BaseComponentProps } from '../../types/components.types';
import type { NotificationType } from '../../store/ui/ui.types';

// Animation duration constants
const TOAST_ANIMATION_DURATION = 150;
const DEFAULT_TOAST_DURATION = 3000;

/**
 * Props interface for Toast component extending base component props
 */
interface ToastProps extends BaseComponentProps {
  /** Type of notification determining visual style */
  type: NotificationType;
  /** Content message to display */
  message: string;
  /** Duration before auto-dismiss in milliseconds */
  duration?: number;
  /** Callback function when toast is dismissed */
  onClose: () => void;
  /** Controls toast visibility */
  open: boolean;
}

/**
 * Material Design 3.0 Toast component with accessibility features
 * Implements WCAG 2.1 Level AA compliance
 */
const Toast: React.FC<ToastProps> = React.memo(({
  type,
  message,
  duration = DEFAULT_TOAST_DURATION,
  onClose,
  open,
  className,
  style,
  ariaLabel,
}) => {
  // Auto-dismiss timer
  useEffect(() => {
    if (open && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  // Handle keyboard dismiss
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Animation variants
  const variants = {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  };

  // Type-based styling
  const toastClasses = classNames(
    'toast',
    `toast--${type}`,
    {
      'toast--success': type === 'success',
      'toast--error': type === 'error',
      'toast--warning': type === 'warning',
      'toast--info': type === 'info'
    },
    className
  );

  // Type-based icons
  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return null;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="alert"
          aria-live="polite"
          aria-label={ariaLabel || `${type} notification`}
          className={toastClasses}
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            ...style
          }}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: TOAST_ANIMATION_DURATION / 1000 }}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="toast__content">
            <span className="toast__icon" aria-hidden="true">
              {getIcon()}
            </span>
            <span className="toast__message">{message}</span>
            <button
              className="toast__close"
              onClick={onClose}
              aria-label="Close notification"
              type="button"
            >
              ✕
            </button>
          </div>
          <motion.div
            className="toast__progress"
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// Display name for debugging
Toast.displayName = 'Toast';

export default Toast;