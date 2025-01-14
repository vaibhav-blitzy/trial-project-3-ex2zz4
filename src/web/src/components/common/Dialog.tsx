/**
 * @fileoverview Material Design 3.0 Dialog Component
 * Implements WCAG 2.1 Level AA accessibility with theme transitions
 * @version 1.0.0
 */

import React, { useEffect, useCallback } from 'react'; // ^18.0.0
import { Portal, FocusTrap, useMediaQuery } from '@mui/material'; // ^5.0.0
import clsx from 'clsx'; // ^2.0.0
import { BaseComponentProps } from '../../types/components.types';
import { Button } from './Button';
import { useTheme } from '../../hooks/useTheme';
import { COLORS, SPACING, TRANSITIONS, BREAKPOINTS } from '../../constants/theme.constants';

/**
 * Props interface for Dialog component with comprehensive accessibility support
 */
export interface DialogProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'info' | 'warning' | 'error' | 'success';
  size?: 'small' | 'medium';
  disableBackdropClick?: boolean;
  autoFocus?: boolean;
  disableEscapeKeyDown?: boolean;
  fullScreen?: boolean;
  maxWidth?: string;
  transitionDuration?: number;
  keepMounted?: boolean;
}

/**
 * Material Design 3.0 Dialog component with comprehensive accessibility support
 */
const Dialog = React.memo<DialogProps>(({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  variant = 'info',
  size = 'medium',
  disableBackdropClick = false,
  autoFocus = true,
  disableEscapeKeyDown = false,
  fullScreen = false,
  maxWidth,
  transitionDuration = 200,
  keepMounted = false,
  className,
  style,
  testId = 'dialog',
  ...props
}) => {
  const { theme, themeMode } = useTheme();
  const isMobile = useMediaQuery(BREAKPOINTS.down('sm'));

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    if (event.key === 'Escape' && !disableEscapeKeyDown) {
      event.preventDefault();
      onClose();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onConfirm();
    }
  }, [isOpen, onClose, onConfirm, disableEscapeKeyDown]);

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !disableBackdropClick) {
      onClose();
    }
  }, [onClose, disableBackdropClick]);

  // Early return if dialog is not open and not kept mounted
  if (!isOpen && !keepMounted) return null;

  // Generate dynamic styles
  const backdropStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${themeMode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)'}`,
    zIndex: 1300,
    display: isOpen ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `opacity ${transitionDuration}ms ${TRANSITIONS.easing.easeInOut}`,
    opacity: isOpen ? 1 : 0,
  };

  const dialogStyles: React.CSSProperties = {
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[24],
    padding: SPACING.scale[6],
    maxWidth: maxWidth || (size === 'small' ? '400px' : '600px'),
    width: fullScreen || isMobile ? '100%' : 'auto',
    height: fullScreen || isMobile ? '100%' : 'auto',
    position: 'relative',
    transition: `transform ${transitionDuration}ms ${TRANSITIONS.easing.easeInOut}`,
    transform: isOpen ? 'scale(1)' : 'scale(0.9)',
    ...style,
  };

  const getVariantStyles = () => {
    const variantColors = {
      info: COLORS[themeMode].primary,
      warning: { main: '#ED6C02' },
      error: { main: '#D32F2F' },
      success: { main: '#2E7D32' },
    };
    return variantColors[variant];
  };

  return (
    <Portal>
      <div
        role="presentation"
        style={backdropStyles}
        onClick={handleBackdropClick}
        data-testid={`${testId}-backdrop`}
      >
        <FocusTrap open={isOpen} disableEnforceFocus={!autoFocus}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${testId}-title`}
            aria-describedby={`${testId}-message`}
            style={dialogStyles}
            className={clsx('dialog', className)}
            data-testid={testId}
            {...props}
          >
            <div
              id={`${testId}-title`}
              style={{
                color: getVariantStyles().main,
                fontSize: theme.typography.h5.fontSize,
                fontWeight: theme.typography.fontWeightMedium,
                marginBottom: SPACING.scale[4],
              }}
            >
              {title}
            </div>
            
            <div
              id={`${testId}-message`}
              style={{
                color: theme.palette.text.primary,
                fontSize: theme.typography.body1.fontSize,
                marginBottom: SPACING.scale[6],
              }}
            >
              {message}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: SPACING.scale[3],
              }}
            >
              {cancelLabel && (
                <Button
                  variant="OUTLINED"
                  onClick={onClose}
                  data-testid={`${testId}-cancel`}
                  aria-label={cancelLabel}
                >
                  {cancelLabel}
                </Button>
              )}
              <Button
                variant="PRIMARY"
                onClick={onConfirm}
                data-testid={`${testId}-confirm`}
                aria-label={confirmLabel}
                style={{ backgroundColor: getVariantStyles().main }}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </FocusTrap>
      </div>
    </Portal>
  );
});

Dialog.displayName = 'Dialog';

export default Dialog;