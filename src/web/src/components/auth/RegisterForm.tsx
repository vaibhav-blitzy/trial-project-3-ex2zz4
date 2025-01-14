/**
 * @fileoverview Secure and accessible registration form component
 * Implements Material Design 3.0 principles with comprehensive validation
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form'; // v7.0.0
import * as yup from 'yup'; // v1.0.0
import DOMPurify from 'dompurify'; // v2.4.0
import { SecurityMonitor } from '@security/monitor'; // v1.0.0
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { AuthService } from '../../services/auth.service';

// Interface definitions
interface IRegisterFormProps {
  onSuccess: (data: IAuthResponse) => void;
  onError: (error: Error) => void;
  className?: string;
}

interface IRegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

// Validation schema with security requirements
const validationSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .email('Invalid email format')
    .max(255)
    .trim(),
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
    .required('Please confirm password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  fullName: yup
    .string()
    .required('Full name is required')
    .max(100)
    .trim()
});

/**
 * RegisterForm Component
 * Implements secure registration with progressive disclosure and accessibility
 */
export const RegisterForm: React.FC<IRegisterFormProps> = ({
  onSuccess,
  onError,
  className
}) => {
  // Form state management with validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError
  } = useForm<IRegisterFormData>({
    mode: 'onChange',
    resolver: yup.resolver(validationSchema)
  });

  // Security monitoring state
  const [securityViolation, setSecurityViolation] = useState<boolean>(false);
  const securityMonitor = new SecurityMonitor();

  // Form submission handler with security checks
  const onSubmit = useCallback(async (data: IRegisterFormData) => {
    try {
      // Security checks and input sanitization
      const sanitizedData = {
        email: DOMPurify.sanitize(data.email).trim(),
        password: data.password,
        confirmPassword: data.confirmPassword,
        fullName: DOMPurify.sanitize(data.fullName).trim()
      };

      // Track registration attempt for security monitoring
      await securityMonitor.trackEvent('registration_attempt', {
        email: sanitizedData.email,
        timestamp: new Date().toISOString()
      });

      // Validate password strength
      const passwordValidation = await AuthService.validatePassword(sanitizedData.password);
      if (!passwordValidation.isValid) {
        setError('password', {
          type: 'manual',
          message: passwordValidation.errors[0]
        });
        return;
      }

      // Attempt registration
      const response = await AuthService.register(sanitizedData);
      onSuccess(response);
    } catch (error) {
      // Handle security violations
      if (error.response?.status === 429) {
        setSecurityViolation(true);
        onError(new Error('Too many registration attempts. Please try again later.'));
        return;
      }

      onError(error as Error);
    }
  }, [onSuccess, onError, setError]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={className}
      noValidate
      aria-label="Registration form"
    >
      <Input
        {...register('fullName')}
        type="text"
        placeholder="Full Name"
        error={errors.fullName?.message}
        aria-label="Full name"
        disabled={isSubmitting || securityViolation}
        autoComplete="name"
        required
      />

      <Input
        {...register('email')}
        type="email"
        placeholder="Email Address"
        error={errors.email?.message}
        aria-label="Email address"
        disabled={isSubmitting || securityViolation}
        autoComplete="email"
        required
      />

      <Input
        {...register('password')}
        type="password"
        placeholder="Password"
        error={errors.password?.message}
        aria-label="Password"
        disabled={isSubmitting || securityViolation}
        autoComplete="new-password"
        required
      />

      <Input
        {...register('confirmPassword')}
        type="password"
        placeholder="Confirm Password"
        error={errors.confirmPassword?.message}
        aria-label="Confirm password"
        disabled={isSubmitting || securityViolation}
        autoComplete="new-password"
        required
      />

      <Button
        type="submit"
        variant="PRIMARY"
        size="LARGE"
        disabled={isSubmitting || securityViolation}
        loading={isSubmitting}
        fullWidth
        aria-label="Create account"
      >
        Create Account
      </Button>

      {/* Accessibility announcement for screen readers */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {isSubmitting ? 'Creating your account...' : ''}
        {securityViolation ? 'Security violation detected. Please try again later.' : ''}
      </div>
    </form>
  );
};

export default RegisterForm;