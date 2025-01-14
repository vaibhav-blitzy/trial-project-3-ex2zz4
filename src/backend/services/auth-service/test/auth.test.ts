import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'; // v29.0.0
import { Repository } from 'typeorm'; // v0.3.x
import { Redis } from 'ioredis'; // v5.0.0
import { AuthService } from '../src/services/auth.service';
import { TokenService } from '../src/services/token.service';
import { User } from '../src/models/user.model';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { SecurityEventType, SecuritySeverity } from '../../../shared/utils/logger.util';
import { UserRole, IAuthResponse, IDeviceInfo } from '../../../shared/interfaces/auth.interface';

// Mock implementations
jest.mock('ioredis');
jest.mock('../src/services/token.service');
jest.mock('../../../shared/utils/logger.util');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<Repository<User>>;
  let mockTokenService: jest.Mocked<TokenService>;
  let mockRedisClient: jest.Mocked<Redis>;
  let mockSecurityService: any;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    password: '$argon2id$v=19$m=65536,t=3,p=4$hash',
    role: UserRole.TEAM_MEMBER,
    mfaEnabled: true,
    mfaSecret: 'encrypted-mfa-secret',
    failedLoginAttempts: 0,
    comparePassword: jest.fn(),
    verifyMfaToken: jest.fn(),
    toAuthUser: jest.fn()
  };

  const mockDeviceInfo: IDeviceInfo = {
    deviceId: 'test-device-id',
    userAgent: 'test-user-agent',
    ipAddress: '127.0.0.1'
  };

  beforeEach(() => {
    // Reset all mocks
    mockUserRepository = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn(),
      update: jest.fn()
    } as any;

    mockTokenService = {
      generateTokens: jest.fn(),
      verifyToken: jest.fn(),
      refreshTokens: jest.fn(),
      blacklistToken: jest.fn()
    } as any;

    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      hmset: jest.fn(),
      exists: jest.fn(),
      del: jest.fn()
    } as any;

    mockSecurityService = {
      validateRequest: jest.fn(),
      trackSecurityEvent: jest.fn()
    };

    authService = new AuthService(
      mockUserRepository as any,
      mockTokenService,
      mockSecurityService,
      mockRedisClient,
      {} as any
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const mockCredentials = {
      email: 'test@example.com',
      password: 'Test123!@#',
      clientId: 'test-client'
    };

    it('should successfully authenticate user with valid credentials', async () => {
      // Setup mocks
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer'
      });
      mockRedisClient.get.mockResolvedValue('trusted');

      const result = await authService.login(mockCredentials, mockDeviceInfo);

      expect(result).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.mfaRequired).toBe(true);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockCredentials.email },
        select: ['id', 'email', 'password', 'role', 'mfaEnabled', 'mfaSecret', 'failedLoginAttempts']
      });
    });

    it('should handle invalid credentials correctly', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(false);
      mockRedisClient.incr.mockResolvedValue(1);

      await expect(authService.login(mockCredentials, mockDeviceInfo))
        .rejects.toThrow(ErrorCodes.INVALID_CREDENTIALS.toString());

      expect(mockRedisClient.incr).toHaveBeenCalled();
    });

    it('should enforce rate limiting after multiple failed attempts', async () => {
      mockRedisClient.incr.mockResolvedValue(6);

      await expect(authService.login(mockCredentials, mockDeviceInfo))
        .rejects.toThrow('Too many login attempts');

      expect(mockRedisClient.expire).toHaveBeenCalled();
    });
  });

  describe('verifyMFA', () => {
    const mockMfaCredentials = {
      userId: 'test-user-id',
      code: '123456',
      method: 'TOTP'
    };

    it('should verify MFA token successfully', async () => {
      mockUserRepository.findOneOrFail.mockResolvedValue(mockUser);
      mockUser.verifyMfaToken.mockResolvedValue(true);
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer'
      });

      const result = await authService.verifyMFA(mockMfaCredentials);

      expect(result).toBeDefined();
      expect(result.mfaRequired).toBe(false);
      expect(mockUser.verifyMfaToken).toHaveBeenCalledWith(mockMfaCredentials.code);
    });

    it('should handle invalid MFA token', async () => {
      mockUserRepository.findOneOrFail.mockResolvedValue(mockUser);
      mockUser.verifyMfaToken.mockResolvedValue(false);

      await expect(authService.verifyMFA(mockMfaCredentials))
        .rejects.toThrow(ErrorCodes.INVALID_CREDENTIALS.toString());
    });
  });

  describe('refreshToken', () => {
    const mockRefreshToken = 'valid-refresh-token';

    it('should refresh tokens successfully', async () => {
      mockTokenService.verifyToken.mockResolvedValue({ sub: 'test-user-id' });
      mockUserRepository.findOneOrFail.mockResolvedValue(mockUser);
      mockRedisClient.get.mockResolvedValue('trusted');
      mockTokenService.refreshTokens.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer'
      });

      const result = await authService.refreshToken(mockRefreshToken, mockDeviceInfo);

      expect(result).toBeDefined();
      expect(result.tokens.accessToken).toBe('new-access-token');
      expect(mockTokenService.verifyToken).toHaveBeenCalledWith(mockRefreshToken, 'refresh');
    });

    it('should handle invalid refresh token', async () => {
      mockTokenService.verifyToken.mockRejectedValue(new Error('Invalid token'));

      await expect(authService.refreshToken(mockRefreshToken, mockDeviceInfo))
        .rejects.toThrow();
    });
  });

  describe('Device Trust Management', () => {
    it('should validate trusted device correctly', async () => {
      mockRedisClient.get.mockResolvedValue('trusted');
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer'
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Test123!@#',
        clientId: 'test-client'
      }, mockDeviceInfo);

      expect(result.mfaRequired).toBe(true);
      expect(mockRedisClient.get).toHaveBeenCalled();
      expect(mockRedisClient.expire).toHaveBeenCalled();
    });

    it('should handle untrusted device appropriately', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer'
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Test123!@#',
        clientId: 'test-client'
      }, mockDeviceInfo);

      expect(result.mfaRequired).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should create and store session information', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer'
      });

      await authService.login({
        email: 'test@example.com',
        password: 'Test123!@#',
        clientId: 'test-client'
      }, mockDeviceInfo);

      expect(mockRedisClient.hmset).toHaveBeenCalled();
      expect(mockRedisClient.expire).toHaveBeenCalled();
    });

    it('should handle session cleanup on logout', async () => {
      const mockSessionId = 'mock-session-id';
      mockRedisClient.del.mockResolvedValue(1);

      await authService.logout(mockUser.id, mockSessionId);

      expect(mockRedisClient.del).toHaveBeenCalled();
    });
  });
});