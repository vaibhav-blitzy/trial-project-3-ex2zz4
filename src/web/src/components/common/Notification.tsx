import React, { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // ^6.0.0
import classNames from 'classnames'; // ^2.3.0

import { BaseComponentProps } from '../../types/components.types';
import { useNotification } from '../../hooks/useNotification';

// Animation constants
const ANIMATION_DURATION = 150;
const DEFAULT_AUTO_HIDE_DURATION = 5000;
const NOTIFICATION_Z_INDEX = 1400;
const THEME_TRANSITION_DURATION = 200;

// Notification variants for different states
const variants = {
  initial: { opacity: 0, y: -20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } }
};

// Interface for notification props
interface NotificationProps extends BaseComponentProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  autoHideDuration?: number;
  onClose?: () => void;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  elevation?: number;
  disableWindowBlur?: boolean;
}

/**
 * A reusable notification component following Material Design 3.0 principles
 * Supports various notification types, auto-dismiss, and accessibility features
 */
const Notification: React.FC<NotificationProps> = React.memo(({
  className,
  style,
  variant = 'info',
  message,
  title,
  autoHideDuration = DEFAULT_AUTO_HIDE_DURATION,
  onClose,
  action,
  icon,
  elevation = 6,
  disableWindowBlur = false,
}) => {
  // Refs for managing timers and focus
  const timerRef = useRef<number>();
  const notificationRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Custom hook for notification management
  const { markAsRead } = useNotification();

  /**
   * Handles notification close with proper cleanup
   */
  const handleClose = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    // Return focus to previous element
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }

    // Call onClose callback if provided
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  /**
   * Sets up auto-hide timer and window blur handling
   */
  useEffect(() => {
    if (autoHideDuration) {
      timerRef.current = window.setTimeout(() => {
        handleClose();
      }, autoHideDuration);

      if (!disableWindowBlur) {
        const handleWindowBlur = () => {
          if (timerRef.current) {
            window.clearTimeout(timerRef.current);
          }
        };

        const handleWindowFocus = () => {
          if (autoHideDuration) {
            timerRef.current = window.setTimeout(handleClose, autoHideDuration);
          }
        };

        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('focus', handleWindowFocus);

        return () => {
          window.removeEventListener('blur', handleWindowBlur);
          window.removeEventListener('focus', handleWindowFocus);
        };
      }
    }

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [autoHideDuration, handleClose, disableWindowBlur]);

  /**
   * Stores previous focus element on mount
   */
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    notificationRef.current?.focus();

    return () => {
      previousFocusRef.current = null;
    };
  }, []);

  // Compute notification classes
  const notificationClasses = classNames(
    'notification',
    `notification--${variant}`,
    {
      'notification--with-action': !!action,
      'notification--with-icon': !!icon,
    },
    className
  );

  return (
    <AnimatePresence>
      <motion.div
        ref={notificationRef}
        className={notificationClasses}
        style={{
          ...style,
          '--elevation': elevation,
          '--z-index': NOTIFICATION_Z_INDEX,
          '--animation-duration': `${ANIMATION_DURATION}ms`,
          '--theme-transition': `${THEME_TRANSITION_DURATION}ms`,
        }}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        role="alert"
        aria-live="polite"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleClose();
          }
        }}
      >
        {icon && (
          <div className="notification__icon" aria-hidden="true">
            {icon}
          </div>
        )}
        <div className="notification__content">
          {title && (
            <div className="notification__title" role="heading" aria-level={2}>
              {title}
            </div>
          )}
          <div className="notification__message">{message}</div>
        </div>
        {action && (
          <div className="notification__actions">
            {action}
          </div>
        )}
        <button
          className="notification__close"
          onClick={handleClose}
          aria-label="Close notification"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
});

Notification.displayName = 'Notification';

export default Notification;