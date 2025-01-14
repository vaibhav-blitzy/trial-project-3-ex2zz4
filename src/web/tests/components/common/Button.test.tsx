/**
 * @fileoverview Button component test suite
 * Tests Material Design 3.0 compliance, accessibility, and theme support
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, describe, it, beforeEach } from '@jest/globals';
import { useMediaQuery } from '@mui/material';
import { Button } from '../../src/components/common/Button';
import { ButtonProps } from '../../src/types/components.types';
import { COLORS, TRANSITIONS, TYPOGRAPHY } from '../../src/constants/theme.constants';

// Mock useMediaQuery hook for theme detection testing
jest.mock('@mui/material', () => ({
  useMediaQuery: jest.fn()
}));

// Helper function to render Button with theme context
const renderButton = (props: Partial<ButtonProps> = {}) => {
  const defaultProps: ButtonProps = {
    variant: 'PRIMARY',
    size: 'MEDIUM',
    children: 'Test Button',
    onClick: jest.fn(),
    ...props
  };
  return render(<Button {...defaultProps} />);
};

describe('Button Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (useMediaQuery as jest.Mock).mockReturnValue(false); // Default to light theme
  });

  describe('Material Design 3.0 Compliance', () => {
    it('should apply correct typography styles based on size', () => {
      const { rerender } = renderButton();

      // Test medium size (default)
      let button = screen.getByRole('button');
      expect(button).toHaveStyle({
        fontFamily: TYPOGRAPHY.fontFamilies.primary,
        fontWeight: String(TYPOGRAPHY.fontWeights.medium),
        fontSize: TYPOGRAPHY.fontSizes.base
      });

      // Test small size
      rerender(<Button size="SMALL">Small Button</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveStyle({
        fontSize: TYPOGRAPHY.fontSizes.sm
      });

      // Test large size
      rerender(<Button size="LARGE">Large Button</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveStyle({
        fontSize: TYPOGRAPHY.fontSizes.lg
      });
    });

    it('should apply correct variant styles', () => {
      const { rerender } = renderButton();

      // Test PRIMARY variant
      let button = screen.getByRole('button');
      expect(button).toHaveStyle({
        backgroundColor: COLORS.light.primary.main,
        color: COLORS.light.primary.contrast
      });

      // Test SECONDARY variant
      rerender(<Button variant="SECONDARY">Secondary Button</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveStyle({
        backgroundColor: COLORS.light.secondary.main,
        color: COLORS.light.secondary.contrast
      });

      // Test OUTLINED variant
      rerender(<Button variant="OUTLINED">Outlined Button</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveStyle({
        backgroundColor: 'transparent',
        border: `1px solid ${COLORS.light.primary.main}`
      });
    });

    it('should apply GPU-accelerated transitions', () => {
      const button = renderButton().getByRole('button');
      expect(button).toHaveStyle({
        transition: `all ${TRANSITIONS.duration.shorter} ${TRANSITIONS.easing.easeInOut}`,
        transform: 'translateZ(0)',
        willChange: 'transform, opacity, background-color'
      });
    });
  });

  describe('Accessibility Standards', () => {
    it('should meet minimum touch target size requirements', () => {
      const button = renderButton().getByRole('button');
      expect(button).toHaveStyle({
        minWidth: '64px',
        minHeight: '44px'
      });
    });

    it('should have proper ARIA attributes', () => {
      const { rerender } = renderButton({ ariaLabel: 'Custom Label' });
      
      // Test with aria-label
      let button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom Label');

      // Test disabled state
      rerender(<Button disabled>Disabled Button</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('tabIndex', '-1');

      // Test loading state
      rerender(<Button loading>Loading Button</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('should handle keyboard navigation', async () => {
      const onClickMock = jest.fn();
      renderButton({ onClick: onClickMock });
      
      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);

      // Test space key
      await userEvent.keyboard(' ');
      expect(onClickMock).toHaveBeenCalledTimes(1);

      // Test enter key
      await userEvent.keyboard('{Enter}');
      expect(onClickMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Theme Support', () => {
    it('should adapt to system theme preference', () => {
      // Test light theme
      (useMediaQuery as jest.Mock).mockReturnValue(false);
      const { rerender } = renderButton();
      let button = screen.getByRole('button');
      expect(button).toHaveStyle({
        backgroundColor: COLORS.light.primary.main
      });

      // Test dark theme
      (useMediaQuery as jest.Mock).mockReturnValue(true);
      rerender(<Button>Theme Test</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveStyle({
        backgroundColor: COLORS.dark.primary.main
      });
    });

    it('should support high contrast mode', () => {
      const button = renderButton().getByRole('button');
      const styles = window.getComputedStyle(button);
      
      // Simulate forced-colors media query
      // Note: This is a basic check as actual forced-colors testing requires browser support
      expect(button).toHaveStyleRule('border', '1px solid ButtonText', {
        media: '(forced-colors: active)'
      });
    });
  });

  describe('Interactive States', () => {
    it('should handle loading state correctly', () => {
      const { rerender } = renderButton({ loading: true });
      
      // Test loading state UI
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ opacity: '0.6' });
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button.textContent).toBe(''); // Content should be hidden during loading

      // Test click prevention during loading
      fireEvent.click(button);
      expect(button).toHaveAttribute('disabled');
    });

    it('should handle disabled state correctly', () => {
      const onClickMock = jest.fn();
      const { rerender } = renderButton({ disabled: true, onClick: onClickMock });
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(onClickMock).not.toHaveBeenCalled();
      expect(button).toHaveStyle({ opacity: '0.6', cursor: 'not-allowed' });
    });

    it('should render icons correctly', () => {
      const startIcon = <span data-testid="start-icon">Start</span>;
      const endIcon = <span data-testid="end-icon">End</span>;
      
      renderButton({ startIcon, endIcon });
      
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });
  });
});