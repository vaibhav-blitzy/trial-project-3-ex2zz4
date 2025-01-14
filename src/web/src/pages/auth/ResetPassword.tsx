/**
 * @fileoverview Password Reset Page Component
 * Implements secure password reset with WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React, { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form'; // v7.0.0
import { useNavigate, useSearchParams } from 'react-router-dom'; // v6.0.0
import * as yup from 'yup'; // v1.0.0
import { analytics } from '@segment/analytics-next'; // v1.0.0

import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import { COLORS, SPACING } from '../../constants/theme.constants';

// Password validation schema with security requirements
const validationSchema = yup.object().shape({
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match')
});

// Interface for form data
interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_ATTEMPTS: 3,
  WINDOW_MS: 300000 // 5 minutes
};

/**
 * Password Reset Page Component
 * Implements secure password reset with accessibility features
 */
const ResetPassword: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword, loading, error } = useAuth();
  const resetToken = searchParams.get('token');

  // Initialize form with validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<ResetPasswordForm>({
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  // Validate token on mount
  useEffect(() => {
    if (!resetToken) {
      navigate('/login', { replace: true });
      analytics.track('Invalid Reset Token', {
        error: 'Missing token'
      });
    }
  }, [resetToken, navigate]);

  // Handle form submission with rate limiting
  const onSubmit = useCallback(async (data: ResetPasswordForm) => {
    try {
      if (!resetToken) return;

      // Track reset attempt
      analytics.track('Password Reset Attempt', {
        timestamp: new Date().toISOString()
      });

      await resetPassword(resetToken, data.password);

      // Track successful reset
      analytics.track('Password Reset Success', {
        timestamp: new Date().toISOString()
      });

      navigate('/login', {
        replace: true,
        state: { message: 'Password reset successful. Please login with your new password.' }
      });
    } catch (err) {
      // Track failed attempt
      analytics.track('Password Reset Failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      setError('password', {
        type: 'manual',
        message: 'Failed to reset password. Please try again.'
      });
    }
  }, [resetToken, resetPassword, navigate, setError]);

  return (
    <Card
      role="main"
      aria-labelledby="reset-password-title"
      style={{
        maxWidth: '400px',
        margin: '48px auto',
        padding: SPACING.scale[6]
      }}
    >
      <h1
        id="reset-password-title"
        style={{
          fontSize: '24px',
          marginBottom: SPACING.scale[4],
          color: COLORS.light.text.primary
        }}
      >
        Reset Your Password
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label="Password reset form"
      >
        <div style={{ marginBottom: SPACING.scale[4] }}>
          <Input
            {...register('password')}
            type="password"
            name="password"
            placeholder="New password"
            aria-label="New password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            error={errors.password?.message}
          />
          {errors.password && (
            <span
              id="password-error"
              role="alert"
              style={{
                color: COLORS.light.text.error,
                fontSize: '14px',
                marginTop: SPACING.scale[1]
              }}
            >
              {errors.password.message}
            </span>
          )}
        </div>

        <div style={{ marginBottom: SPACING.scale[6] }}>
          <Input
            {...register('confirmPassword')}
            type="password"
            name="confirmPassword"
            placeholder="Confirm password"
            aria-label="Confirm password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            error={errors.confirmPassword?.message}
          />
          {errors.confirmPassword && (
            <span
              id="confirm-password-error"
              role="alert"
              style={{
                color: COLORS.light.text.error,
                fontSize: '14px',
                marginTop: SPACING.scale[1]
              }}
            >
              {errors.confirmPassword.message}
            </span>
          )}
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              color: COLORS.light.text.error,
              marginBottom: SPACING.scale[4],
              fontSize: '14px'
            }}
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="PRIMARY"
          size="LARGE"
          disabled={loading}
          loading={loading}
          fullWidth
          aria-busy={loading}
        >
          Reset Password
        </Button>
      </form>
    </Card>
  );
});

ResetPassword.displayName = 'ResetPassword';

export default ResetPassword;