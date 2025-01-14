/**
 * @fileoverview Comprehensive test suite for LoginForm component
 * Tests authentication flows, form validation, accessibility, and Material Design compliance
 * @version 1.0.0
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@mui/material';
import { describe, beforeAll, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import LoginForm from '../../../src/components/auth/LoginForm';
import { useAuth } from '../../../src/hooks/useAuth';
import { getTheme } from '../../../src/config/theme.config';
import { THEME_MODES } from '../../../src/constants/theme.constants';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock useAuth hook
jest.mock('../../../src/hooks/useAuth');

// Test constants
const TEST_CREDENTIALS = {
  VALID: {
    email: 'test@example.com',
    password: 'ValidPass123!'
  },
  INVALID_EMAIL: {
    email: 'invalid-email',
    password: 'ValidPass123!'
  },
  INVALID_PASSWORD: {
    email: 'test@example.com',
    password: 'weak'
  }
};

const ERROR_MESSAGES = {
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PASSWORD: 'Password must be at least 8 characters',
  REQUIRED_FIELD: 'This field is required',
  AUTH_FAILED: 'Invalid credentials'
};

describe('LoginForm', () => {
  // Setup test environment
  beforeAll(() => {
    // Configure test environment
    window.matchMedia = window.matchMedia || function() {
      return {
        matches: false,
        addListener: () => {},
        removeListener: () => {}
      };
    };
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock useAuth hook implementation
    (useAuth as jest.Mock).mockImplementation(() => ({
      login: jest.fn(),
      loading: false,
      error: null
    }));
  });

  afterEach(() => {
    // Clean up after each test
    jest.resetAllMocks();
  });

  // Rendering tests
  describe('Rendering', () => {
    it('should render all form elements correctly', () => {
      render(
        <ThemeProvider theme={getTheme(THEME_MODES.LIGHT)}>
          <LoginForm />
        </ThemeProvider>
      );

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should apply Material Design styles correctly', () => {
      const { container } = render(
        <ThemeProvider theme={getTheme(THEME_MODES.LIGHT)}>
          <LoginForm />
        </ThemeProvider>
      );

      const form = container.firstChild;
      expect(form).toHaveStyle({
        display: 'flex',
        flexDirection: 'column'
      });
    });
  });

  // Form validation tests
  describe('Form Validation', () => {
    it('should show required field errors when submitting empty form', async () => {
      render(
        <ThemeProvider theme={getTheme(THEME_MODES.LIGHT)}>
          <LoginForm />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(ERROR_MESSAGES.REQUIRED_FIELD)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(
        <ThemeProvider theme={getTheme(THEME_MODES.LIGHT)}>
          <LoginForm />
        </ThemeProvider>
      );

      await userEvent.type(screen.getByLabelText(/email/i), TEST_CREDENTIALS.INVALID_EMAIL.email);
      fireEvent.blur(screen.getByLabelText(/email/i));

      await waitFor(() => {
        expect(screen.getByText(ERROR_MESSAGES.INVALID_EMAIL)).toBeInTheDocument();
      });
    });

    it('should validate password requirements', async () => {
      render(
        <ThemeProvider theme={getTheme(THEME_MODES.LIGHT)}>
          <LoginForm />
        </ThemeProvider>
      );

      await userEvent.type(screen.getByLabelText(/password/i), TEST_CREDENTIALS.INVALID_PASSWORD.password);
      fireEvent.blur(screen.getByLabelText(/password/i));

      await waitFor(() => {
        expect(screen.getByText(ERROR_MESSAGES.INVALID_PASSWORD)).toBeInTheDocument();
      });
    });
  });

  // Authentication flow tests
  describe('Authentication Flow', () => {
    it('should handle successful login', async () => {
      const mockLogin = jest.fn();
      (useAuth as jest.Mock).mockImplementation(() => ({
        login: mockLogin,
        loading: false,
        error: null
      }));

      render(
        <ThemeProvider theme={getTheme(THEME_MODES.LIGHT)}>
          <LoginForm />
        </ThemeProvider>
      );

      await userEvent.type(screen.getByLabelText(/email/i), TEST_CREDENTIALS.VALID.email);
      await userEvent.type(screen.getByLabelText(/password/i), TEST_CREDENTIALS.VALID.password);
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(TEST_CREDENTIALS.VALID);
      });
    });

    it('should handle failed login attempt', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error(ERROR_MESSAGES.AUTH_FAILED));
      (useAuth as jest.Mock).mockImplementation(() => ({
        login: mockLogin,
        loading: false,
        error: ERROR_MESSAGES.AUTH_FAILED
      }));

      render(
        <ThemeProvider theme={getTheme(THEME_MODES.LIGHT)}>
          <LoginForm />
        </ThemeProvider>
      );

      await userEvent.type(screen.getByLabelText(/email/i), TEST_CREDENTIALS.VALID.email);
      await userEvent.type(screen.getByLabelText(/password/i), TEST_CREDENTIALS.VALID.password);
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(ERROR_MESSAGES.AUTH_FAILED)).toBeInTheDocument();
      });
    });

    it('should disable form during loading state', async () => {
      (useAuth as jest.Mock).mockImplementation(() => ({
        login: jest.fn(),
        loading: true,
        error: null
      }));

      render(
        <ThemeProvider theme={getTheme(THEME_MODES.LIGHT)}>
          <LoginForm />
        </ThemeProvider>
      );

      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    });
  });

  // Accessibility tests
  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <ThemeProvider theme={getTheme(THEME_MODES.LIGHT)}>
          <LoginForm />
        </ThemeProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      render(
        <ThemeProvider theme={getTheme(THEME_MODES.LIGHT)}>
          <LoginForm />
        </ThemeProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);

      userEvent.tab();
      expect(document.activeElement).toBe(passwordInput);

      userEvent.tab();
      expect(document.activeElement).toBe(submitButton);
    });

    it('should have proper ARIA attributes', () => {
      render(
        <ThemeProvider theme={getTheme(THEME_MODES.LIGHT)}>
          <LoginForm />
        </ThemeProvider>
      );

      expect(screen.getByRole('form')).toHaveAttribute('aria-label', 'Login form');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'false');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('aria-invalid', 'false');
    });
  });
});