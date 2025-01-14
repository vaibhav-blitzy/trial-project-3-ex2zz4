/**
 * Enhanced Authentication Hook
 * Version: 1.0.0
 * 
 * Custom React hook for managing authentication state and operations with
 * advanced security features, performance monitoring, and secure session handling.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux'; // v8.1.0
import { useApm } from '@elastic/apm-rum-react'; // v1.4.0
import { RateLimiter } from 'rate-limiter-flexible'; // v2.4.1
import { AuthService } from '../services/auth.service';
import {
  ILoginCredentials,
  IAuthUser,
  IAuthResponse,
  MFAMethod
} from '../interfaces/auth.interface';

// Security configuration for authentication rate limiting
const AUTH_RATE_LIMIT_CONFIG = {
  points: 5, // Maximum attempts
  duration: 300, // Time window in seconds (5 minutes)
  blockDuration: 900 // Block duration in seconds (15 minutes)
};

// Interface for authentication security status
interface ISecurityStatus {
  rateLimitRemaining: number;
  lastAttemptTimestamp: number | null;
  blockedUntil: number | null;
}

// Initialize rate limiter for authentication attempts
const rateLimiter = new RateLimiter(AUTH_RATE_LIMIT_CONFIG);

/**
 * Enhanced authentication hook with security features and monitoring
 */
export function useAuth() {
  const apm = useApm();
  const dispatch = useDispatch();
  const authService = useMemo(() => AuthService.getInstance(), []);

  // Select authentication state from Redux store with monitoring
  const authState = useSelector((state: any) => {
    const transaction = apm.startTransaction('auth_state_selection', 'state');
    try {
      return state.auth;
    } finally {
      transaction?.end();
    }
  });

  // Initialize security status
  const [securityStatus, setSecurityStatus] = useState<ISecurityStatus>({
    rateLimitRemaining: AUTH_RATE_LIMIT_CONFIG.points,
    lastAttemptTimestamp: null,
    blockedUntil: null
  });

  /**
   * Secure login with rate limiting and monitoring
   */
  const login = useCallback(async (credentials: ILoginCredentials): Promise<void> => {
    const transaction = apm.startTransaction('login', 'auth');
    
    try {
      // Check rate limiting
      const rateLimitRes = await rateLimiter.consume(credentials.email);
      setSecurityStatus(prev => ({
        ...prev,
        rateLimitRemaining: rateLimitRes.remainingPoints,
        lastAttemptTimestamp: Date.now()
      }));

      const response = await authService.login(credentials);
      dispatch({ type: 'AUTH_SUCCESS', payload: response });
      
      transaction?.setOutcome('success');
    } catch (error) {
      transaction?.setOutcome('failure');
      
      if (error.name === 'RateLimiterError') {
        setSecurityStatus(prev => ({
          ...prev,
          blockedUntil: Date.now() + (AUTH_RATE_LIMIT_CONFIG.blockDuration * 1000)
        }));
      }
      
      dispatch({ type: 'AUTH_ERROR', payload: error.message });
      throw error;
    } finally {
      transaction?.end();
    }
  }, [apm, authService, dispatch]);

  /**
   * Secure logout with monitoring
   */
  const logout = useCallback(async (): Promise<void> => {
    const transaction = apm.startTransaction('logout', 'auth');
    
    try {
      await authService.logout();
      dispatch({ type: 'AUTH_LOGOUT' });
      transaction?.setOutcome('success');
    } catch (error) {
      transaction?.setOutcome('failure');
      throw error;
    } finally {
      transaction?.end();
    }
  }, [apm, authService, dispatch]);

  /**
   * MFA verification with monitoring
   */
  const verifyMfa = useCallback(async (code: string): Promise<boolean> => {
    const transaction = apm.startTransaction('verify_mfa', 'auth');
    
    try {
      const response = await authService.verifyMfa(code, MFAMethod.TOTP);
      dispatch({ type: 'MFA_SUCCESS', payload: response });
      transaction?.setOutcome('success');
      return true;
    } catch (error) {
      transaction?.setOutcome('failure');
      dispatch({ type: 'MFA_ERROR', payload: error.message });
      return false;
    } finally {
      transaction?.end();
    }
  }, [apm, authService, dispatch]);

  /**
   * Session validation with monitoring
   */
  const validateSession = useCallback(async (): Promise<boolean> => {
    const transaction = apm.startTransaction('validate_session', 'auth');
    
    try {
      const isValid = await authService.validateSession();
      if (!isValid) {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
      transaction?.setOutcome('success');
      return isValid;
    } catch (error) {
      transaction?.setOutcome('failure');
      dispatch({ type: 'AUTH_LOGOUT' });
      return false;
    } finally {
      transaction?.end();
    }
  }, [apm, authService, dispatch]);

  /**
   * Token rotation with monitoring
   */
  const rotateToken = useCallback(async (): Promise<void> => {
    const transaction = apm.startTransaction('rotate_token', 'auth');
    
    try {
      await authService.rotateToken();
      transaction?.setOutcome('success');
    } catch (error) {
      transaction?.setOutcome('failure');
      dispatch({ type: 'AUTH_LOGOUT' });
      throw error;
    } finally {
      transaction?.end();
    }
  }, [apm, authService, dispatch]);

  // Set up automatic session validation
  useEffect(() => {
    const validateInterval = setInterval(validateSession, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(validateInterval);
  }, [validateSession]);

  // Return authentication state and methods with security status
  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user as IAuthUser | null,
    loading: authState.loading,
    error: authState.error,
    securityStatus,
    login,
    logout,
    verifyMfa,
    validateSession,
    rotateToken
  };
}