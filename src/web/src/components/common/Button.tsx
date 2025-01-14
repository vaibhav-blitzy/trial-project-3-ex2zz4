/**
 * @fileoverview Material Design 3.0 Button Component
 * Implements WCAG 2.1 Level AA accessibility with theme transitions
 * @version 1.0.0
 */

import React from 'react'; // ^18.0.0
import styled from '@emotion/styled'; // ^11.0.0
import { useMediaQuery } from '@mui/material'; // ^5.0.0
import { ButtonProps } from '../../types/components.types';
import { COLORS, SPACING, TRANSITIONS } from '../../constants/theme.constants';

// Styled button with enhanced accessibility and theme support
const StyledButton = styled.button<Partial<ButtonProps>>`
  /* Base styles with touch target size compliance */
  min-width: 64px;
  min-height: 44px;
  padding: ${({ size }) => 
    size === 'SMALL' ? `${SPACING.scale[2]} ${SPACING.scale[4]}` :
    size === 'LARGE' ? `${SPACING.scale[4]} ${SPACING.scale[8]}` :
    `${SPACING.scale[3]} ${SPACING.scale[6]}`};
  
  /* Typography and layout */
  font-family: ${TYPOGRAPHY.fontFamilies.primary};
  font-weight: ${TYPOGRAPHY.fontWeights.medium};
  font-size: ${({ size }) => 
    size === 'SMALL' ? TYPOGRAPHY.fontSizes.sm :
    size === 'LARGE' ? TYPOGRAPHY.fontSizes.lg :
    TYPOGRAPHY.fontSizes.base};
  line-height: ${TYPOGRAPHY.lineHeights.normal};
  text-align: center;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  
  /* Interactive states with GPU acceleration */
  cursor: ${({ disabled, loading }) => (disabled || loading) ? 'not-allowed' : 'pointer'};
  border: none;
  border-radius: 4px;
  outline: none;
  position: relative;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  
  /* GPU-accelerated transitions */
  transition: all ${TRANSITIONS.duration.shorter} ${TRANSITIONS.easing.easeInOut};
  transform: translateZ(0);
  will-change: transform, opacity, background-color;
  
  /* Focus visible styles for keyboard navigation */
  &:focus-visible {
    outline: 2px solid ${COLORS.light.primary.main};
    outline-offset: 2px;
  }
  
  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
  }
  
  /* Disabled state styles */
  opacity: ${({ disabled, loading }) => (disabled || loading) ? 0.6 : 1};
  
  /* Loading state animation */
  ${({ loading }) => loading && `
    &::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 20px;
      height: 20px;
      margin: -10px 0 0 -10px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: button-loading 0.8s linear infinite;
    }
    
    @keyframes button-loading {
      to { transform: rotate(360deg); }
    }
  `}
`;

/**
 * Enhanced button component with theme transitions and accessibility
 */
const Button = React.memo<ButtonProps>(({
  variant = 'PRIMARY',
  size = 'MEDIUM',
  disabled = false,
  loading = false,
  onClick,
  children,
  ariaLabel,
  type = 'button',
  fullWidth = false,
  startIcon,
  endIcon,
  color = 'primary',
  disableElevation = false,
  ...props
}) => {
  // System theme detection
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  // Generate variant-specific styles
  const getVariantStyles = (variant: ButtonProps['variant']) => {
    const theme = prefersDarkMode ? COLORS.dark : COLORS.light;
    
    switch (variant) {
      case 'PRIMARY':
        return {
          backgroundColor: theme.primary.main,
          color: theme.primary.contrast,
          '&:hover': !disabled && {
            backgroundColor: theme.primary.dark,
            transform: 'translateY(-1px)'
          },
          '&:active': !disabled && {
            backgroundColor: theme.primary.dark,
            transform: 'translateY(0)'
          }
        };
      case 'SECONDARY':
        return {
          backgroundColor: theme.secondary.main,
          color: theme.secondary.contrast,
          '&:hover': !disabled && {
            backgroundColor: theme.secondary.dark,
            transform: 'translateY(-1px)'
          },
          '&:active': !disabled && {
            backgroundColor: theme.secondary.dark,
            transform: 'translateY(0)'
          }
        };
      case 'OUTLINED':
        return {
          backgroundColor: 'transparent',
          color: theme.primary.main,
          border: `1px solid ${theme.primary.main}`,
          '&:hover': !disabled && {
            backgroundColor: `${theme.primary.main}10`,
            transform: 'translateY(-1px)'
          },
          '&:active': !disabled && {
            backgroundColor: `${theme.primary.main}20`,
            transform: 'translateY(0)'
          }
        };
      case 'TEXT':
        return {
          backgroundColor: 'transparent',
          color: theme.primary.main,
          '&:hover': !disabled && {
            backgroundColor: `${theme.primary.main}10`,
            transform: 'translateY(-1px)'
          },
          '&:active': !disabled && {
            backgroundColor: `${theme.primary.main}20`,
            transform: 'translateY(0)'
          }
        };
      default:
        return {};
    }
  };

  return (
    <StyledButton
      type={type}
      disabled={disabled || loading}
      onClick={!disabled && !loading ? onClick : undefined}
      aria-label={ariaLabel || typeof children === 'string' ? children : undefined}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      role="button"
      tabIndex={disabled ? -1 : 0}
      style={{
        width: fullWidth ? '100%' : 'auto',
        ...getVariantStyles(variant)
      }}
      variant={variant}
      size={size}
      loading={loading}
      {...props}
    >
      {startIcon && <span className="button-start-icon">{startIcon}</span>}
      {!loading && children}
      {endIcon && <span className="button-end-icon">{endIcon}</span>}
    </StyledButton>
  );
});

Button.displayName = 'Button';

export default Button;