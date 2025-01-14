import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { useAuth } from '../../src/hooks/useAuth';
import { AuthService } from '../../src/services/auth.service';
import { MFAMethod, UserRole } from '../../src/interfaces/auth.interface';

// Mock Redux
jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: jest.fn((selector) => selector({
    auth: {
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null
    }
  }))
}));

// Mock APM
jest.mock('@elastic/apm-rum-react', () => ({
  useApm: () => ({
    startTransaction: () => ({
      setOutcome: jest.fn(),
      end: jest.fn()
    })
  })
}));

// Mock rate limiter
jest.mock('rate-limiter-flexible', () => ({
  RateLimiter: jest.fn().mockImplementation(() => ({
    consume: jest.fn().mockResolvedValue({ remainingPoints: 4 }),
    delete: jest.fn()
  }))
}));

describe('useAuth hook security features', () => {
  const mockAuthService = {
    login: jest.fn(),
    logout: jest.fn(),
    verifyMfa: jest.fn(),
    validateSession: jest.fn(),
    rotateToken: jest.fn(),
    getInstance: jest.fn()
  };

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    role: UserRole.TEAM_MEMBER,
    permissions: ['read:tasks', 'write:tasks'],
    mfaEnabled: true
  };

  const mockCredentials = {
    email: 'test@example.com',
    password: 'SecurePass123!'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    AuthService.getInstance = jest.fn().mockReturnValue(mockAuthService);
    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      tokens: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 300
      },
      mfaRequired: true
    });
  });

  it('should handle successful login with security monitoring', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login(mockCredentials);
    });

    expect(mockAuthService.login).toHaveBeenCalledWith(mockCredentials);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.securityStatus.rateLimitRemaining).toBe(4);
  });

  it('should handle rate-limited login attempts', async () => {
    const { result } = renderHook(() => useAuth());
    mockAuthService.login.mockRejectedValue({ name: 'RateLimiterError' });

    await act(async () => {
      try {
        await result.current.login(mockCredentials);
      } catch (error) {
        expect(error.name).toBe('RateLimiterError');
      }
    });

    expect(result.current.securityStatus.blockedUntil).toBeDefined();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should handle MFA verification with security monitoring', async () => {
    const { result } = renderHook(() => useAuth());
    const mfaCode = '123456';
    mockAuthService.verifyMfa.mockResolvedValue({ success: true });

    await act(async () => {
      await result.current.verifyMfa(mfaCode);
    });

    expect(mockAuthService.verifyMfa).toHaveBeenCalledWith(mfaCode, MFAMethod.TOTP);
    expect(result.current.error).toBeNull();
  });

  it('should handle secure logout with session cleanup', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should validate session security periodically', async () => {
    const { result } = renderHook(() => useAuth());
    mockAuthService.validateSession.mockResolvedValue(true);

    await act(async () => {
      const isValid = await result.current.validateSession();
      expect(isValid).toBe(true);
    });

    expect(mockAuthService.validateSession).toHaveBeenCalled();
  });

  it('should handle token rotation securely', async () => {
    const { result } = renderHook(() => useAuth());
    mockAuthService.rotateToken.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 300
    });

    await act(async () => {
      await result.current.rotateToken();
    });

    expect(mockAuthService.rotateToken).toHaveBeenCalled();
  });

  it('should handle failed token rotation', async () => {
    const { result } = renderHook(() => useAuth());
    mockAuthService.rotateToken.mockRejectedValue(new Error('Token rotation failed'));

    await act(async () => {
      try {
        await result.current.rotateToken();
      } catch (error) {
        expect(error.message).toBe('Token rotation failed');
      }
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should maintain security status during authentication flow', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login(mockCredentials);
    });

    expect(result.current.securityStatus).toEqual(expect.objectContaining({
      rateLimitRemaining: expect.any(Number),
      lastAttemptTimestamp: expect.any(Number),
      blockedUntil: null
    }));
  });

  it('should handle session timeout', async () => {
    const { result } = renderHook(() => useAuth());
    mockAuthService.validateSession.mockResolvedValue(false);

    await act(async () => {
      const isValid = await result.current.validateSession();
      expect(isValid).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should prevent authentication during rate limit block', async () => {
    const { result } = renderHook(() => useAuth());
    
    // Simulate rate limit block
    await act(async () => {
      try {
        await result.current.login(mockCredentials);
      } catch (error) {
        expect(error.name).toBe('RateLimiterError');
      }
    });

    expect(result.current.securityStatus.blockedUntil).toBeDefined();
    expect(result.current.isAuthenticated).toBe(false);
  });
});