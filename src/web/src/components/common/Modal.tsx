/**
 * @fileoverview Material Design 3.0 Modal Component
 * Implements WCAG 2.1 Level AA accessibility with enhanced theme support
 * @version 1.0.0
 */

import React, { useEffect, useCallback } from 'react'; // ^18.0.0
import styled from '@emotion/styled'; // ^11.0.0
import FocusTrap from 'focus-trap-react'; // ^9.0.0
import { BaseComponentProps } from '../../types/components.types';
import { Button } from './Button';
import { useTheme } from '../../hooks/useTheme';
import { COLORS, TRANSITIONS, SPACING } from '../../constants/theme.constants';

// Modal size configurations
const MODAL_SIZES = {
  sm: '400px',
  md: '600px',
  lg: '800px',
  xl: '1000px'
} as const;

// GPU-accelerated overlay with theme support
const ModalOverlay = styled.div<{ isOpen: boolean; highContrastMode: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme, highContrastMode }) =>
    highContrastMode
      ? 'rgba(0, 0, 0, 0.9)'
      : theme.palette.mode === 'dark'
      ? 'rgba(0, 0, 0, 0.7)'
      : 'rgba(0, 0, 0, 0.5)'};
  z-index: 1300;
  opacity: ${({ isOpen }) => (isOpen ? 1 : 0)};
  visibility: ${({ isOpen }) => (isOpen ? 'visible' : 'hidden')};
  transition: opacity ${TRANSITIONS.duration.standard} ${TRANSITIONS.easing.easeInOut},
              visibility ${TRANSITIONS.duration.standard} ${TRANSITIONS.easing.easeInOut};
  will-change: opacity, visibility;
  transform: translateZ(0);
`;

// GPU-accelerated modal container with theme support
const ModalContainer = styled.div<{
  size: keyof typeof MODAL_SIZES;
  isOpen: boolean;
  rtl: boolean;
  highContrastMode: boolean;
}>`
  position: relative;
  width: 90%;
  max-width: ${({ size }) => MODAL_SIZES[size]};
  max-height: 90vh;
  background-color: ${({ theme, highContrastMode }) =>
    highContrastMode
      ? theme.palette.mode === 'dark'
      ? '#000000'
      : '#FFFFFF'
      : theme.palette.background.paper};
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
  box-shadow: ${({ theme }) =>
    theme.palette.mode === 'dark'
      ? '0 8px 32px rgba(0, 0, 0, 0.5)'
      : '0 8px 32px rgba(0, 0, 0, 0.1)'};
  padding: ${SPACING.scale[6]};
  margin: ${SPACING.scale[4]};
  overflow-y: auto;
  direction: ${({ rtl }) => (rtl ? 'rtl' : 'ltr')};
  opacity: ${({ isOpen }) => (isOpen ? 1 : 0)};
  transform: ${({ isOpen }) =>
    isOpen ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)'};
  transition: transform ${TRANSITIONS.duration.standard} ${TRANSITIONS.easing.easeOut},
              opacity ${TRANSITIONS.duration.standard} ${TRANSITIONS.easing.easeOut};
  will-change: transform, opacity;
  
  @media (forced-colors: active) {
    border: 2px solid ButtonText;
  }
`;

const ModalHeader = styled.header<{ rtl: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${SPACING.scale[4]};
  flex-direction: ${({ rtl }) => (rtl ? 'row-reverse' : 'row')};
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.h5.fontSize};
  font-weight: ${({ theme }) => theme.typography.fontWeightMedium};
  color: ${({ theme }) => theme.palette.text.primary};
`;

// Props interface extending base component props
interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: keyof typeof MODAL_SIZES;
  children: React.ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  ariaLabel?: string;
  ariaDescribedby?: string;
  highContrastMode?: boolean;
  animationDuration?: number;
  preventScroll?: boolean;
  rtl?: boolean;
}

/**
 * Enhanced modal component with improved accessibility and theme support
 */
const Modal = React.memo<ModalProps>(({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  ariaLabel,
  ariaDescribedby,
  highContrastMode = false,
  preventScroll = true,
  rtl = false,
  className,
  style,
  testId = 'modal',
}) => {
  const { theme } = useTheme();

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (closeOnEscape && event.key === 'Escape') {
      onClose();
    }
  }, [closeOnEscape, onClose]);

  // Handle scroll lock
  useEffect(() => {
    if (preventScroll && isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [preventScroll, isOpen]);

  // Handle keyboard events
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClick={closeOnOverlayClick ? onClose : undefined}
      highContrastMode={highContrastMode}
      data-testid={`${testId}-overlay`}
      className={className}
      style={style}
    >
      <FocusTrap
        focusTrapOptions={{
          initialFocus: false,
          returnFocusOnDeactivate: true,
          allowOutsideClick: true,
          clickOutsideDeactivates: closeOnOverlayClick,
        }}
      >
        <ModalContainer
          size={size}
          isOpen={isOpen}
          rtl={rtl}
          highContrastMode={highContrastMode}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel || title}
          aria-describedby={ariaDescribedby}
          data-testid={`${testId}-container`}
        >
          <ModalHeader rtl={rtl}>
            <ModalTitle>{title}</ModalTitle>
            {showCloseButton && (
              <Button
                variant="TEXT"
                size="SMALL"
                onClick={onClose}
                aria-label="Close modal"
                data-testid={`${testId}-close-button`}
              >
                Close
              </Button>
            )}
          </ModalHeader>
          {children}
        </ModalContainer>
      </FocusTrap>
    </ModalOverlay>
  );
});

Modal.displayName = 'Modal';

export default Modal;