/**
 * Enhanced Registration Page Component
 * Implements secure user registration with comprehensive validation and monitoring
 * Version: 1.0.0
 */

import React, { useEffect, useCallback } from 'react'; // ^18.0.0
import { useNavigate } from 'react-router-dom'; // ^6.0.0
import { useApm } from '@elastic/apm-rum-react'; // ^1.4.0
import { RegisterForm } from '../../components/auth/RegisterForm';
import { useAuth } from '../../hooks/useAuth';
import { IAuthResponse } from '../../interfaces/auth.interface';

// Route constants for secure navigation
const DASHBOARD_ROUTE = '/dashboard';
const LOGIN_ROUTE = '/auth/login';

// Security configuration for registration
const REGISTRATION_CONFIG = {
  MAX_ATTEMPTS: 3,
  TIMEOUT_DURATION: 300000, // 5 minutes in milliseconds
  MONITORING_ENABLED: true
} as const;

/**
 * Enhanced registration page component with security monitoring
 */
const Register: React.FC = () => {
  const navigate = useNavigate();
  const apm = useApm();
  const { isAuthenticated, securityStatus } = useAuth();

  // Redirect authenticated users
  useEffect(() => {
    const transaction = apm.startTransaction('check_auth_status', 'security');
    try {
      if (isAuthenticated) {
        navigate(DASHBOARD_ROUTE, { replace: true });
      }
    } finally {
      transaction?.end();
    }
  }, [isAuthenticated, navigate, apm]);

  // Check security status before allowing registration
  useEffect(() => {
    if (securityStatus?.blockedUntil && Date.now() < securityStatus.blockedUntil) {
      navigate(LOGIN_ROUTE, { 
        replace: true,
        state: { 
          error: 'Registration temporarily disabled. Please try again later.' 
        }
      });
    }
  }, [securityStatus, navigate]);

  /**
   * Enhanced success handler with security monitoring
   */
  const handleRegistrationSuccess = useCallback(async (response: IAuthResponse) => {
    const transaction = apm.startTransaction('registration_success', 'security');
    
    try {
      // Log successful registration
      apm.addLabels({
        registrationSuccess: true,
        userRole: response.user.role
      });

      // Clear sensitive data
      window.history.replaceState({}, document.title, window.location.pathname);

      // Navigate to login with success message
      navigate(LOGIN_ROUTE, {
        replace: true,
        state: {
          success: 'Registration successful. Please log in to continue.',
          email: response.user.email // Pass email for auto-fill
        }
      });

      transaction?.setOutcome('success');
    } catch (error) {
      transaction?.setOutcome('failure');
      console.error('Registration success handling failed:', error);
    } finally {
      transaction?.end();
    }
  }, [navigate, apm]);

  /**
   * Enhanced error handler with security monitoring
   */
  const handleRegistrationError = useCallback((error: Error) => {
    const transaction = apm.startTransaction('registration_error', 'security');
    
    try {
      // Log registration failure
      apm.captureError(error, {
        labels: {
          registrationFailure: true,
          errorType: error.name,
          errorMessage: error.message
        }
      });

      // Update security monitoring
      if (securityStatus?.rateLimitRemaining <= 1) {
        apm.addLabels({
          securityAlert: 'registration_rate_limit_exceeded',
          timestamp: new Date().toISOString()
        });
      }

      transaction?.setOutcome('failure');
    } finally {
      transaction?.end();
    }
  }, [apm, securityStatus]);

  return (
    <div 
      className="register-page"
      role="main"
      aria-label="Registration page"
    >
      <RegisterForm
        onSuccess={handleRegistrationSuccess}
        onError={handleRegistrationError}
        className="register-form"
      />

      {/* Accessibility announcement for screen readers */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {securityStatus?.blockedUntil && 
          'Registration is temporarily disabled for security reasons. Please try again later.'}
      </div>
    </div>
  );
};

// Export with security monitoring HOC
export default Register;