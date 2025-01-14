/**
 * Enhanced Authentication Service
 * Version: 1.0.0
 * Implements comprehensive user authentication with multi-factor authentication,
 * device tracking, and progressive security checks.
 */

import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { authenticator } from 'otplib'; // v12.0.1
import { Redis } from 'ioredis'; // v5.0.0
import { Auth0Client } from 'auth0'; // v3.0.0
import { SecurityService } from '@security/core'; // v1.0.0

import { User } from '../models/user.model';
import { TokenService } from './token.service';
import { Logger, SecurityEventType, SecuritySeverity } from '../../../shared/utils/logger.util';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import {
  IAuthCredentials,
  IAuthResponse,
  IDeviceInfo,
  IMFACredentials,
  UserRole
} from '../../../shared/interfaces/auth.interface';

// Security-related constants
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_BLOCK_DURATION = 900; // 15 minutes
const DEVICE_TRUST_DURATION = 30 * 24 * 60 * 60; // 30 days
const SESSION_PREFIX = 'session:';
const DEVICE_PREFIX = 'device:';
const MFA_PREFIX = 'mfa:';

@Injectable()
export class AuthService {
  private readonly logger: Logger;

  constructor(
    private readonly userRepository: Repository<User>,
    private readonly tokenService: TokenService,
    private readonly securityService: SecurityService,
    private readonly redisClient: Redis,
    private readonly auth0Client: Auth0Client
  ) {
    this.logger = Logger.getInstance('AuthService', {
      enableConsole: true,
      enableFile: true
    });
  }

  /**
   * Enhanced login with progressive security checks
   */
  public async login(
    credentials: IAuthCredentials,
    deviceInfo: IDeviceInfo
  ): Promise<IAuthResponse> {
    try {
      // Check rate limits and suspicious activity
      await this.validateLoginAttempt(credentials.email, deviceInfo);

      // Retrieve user with security-sensitive fields
      const user = await this.userRepository.findOne({
        where: { email: credentials.email },
        select: ['id', 'email', 'password', 'role', 'mfaEnabled', 'mfaSecret', 'failedLoginAttempts']
      });

      if (!user) {
        await this.handleFailedLogin(credentials.email, deviceInfo);
        throw new Error(ErrorCodes.INVALID_CREDENTIALS.toString());
      }

      // Validate password
      const isValidPassword = await user.comparePassword(credentials.password);
      if (!isValidPassword) {
        await this.handleFailedLogin(credentials.email, deviceInfo);
        throw new Error(ErrorCodes.INVALID_CREDENTIALS.toString());
      }

      // Reset failed login attempts on successful password validation
      if (user.failedLoginAttempts > 0) {
        user.failedLoginAttempts = 0;
        await this.userRepository.save(user);
      }

      // Check device trust status
      const deviceTrusted = await this.validateDevice(user.id, deviceInfo);

      // Generate authentication tokens
      const tokens = await this.tokenService.generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role,
        deviceId: deviceInfo.deviceId
      });

      // Create session record
      await this.createSession(user.id, tokens.accessToken, deviceInfo);

      // Log successful authentication
      await this.logger.security('User authenticated successfully', {
        eventType: SecurityEventType.AUTH_SUCCESS,
        severity: SecuritySeverity.INFO,
        userId: user.id,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent
      });

      return {
        user: user.toAuthUser(),
        tokens,
        mfaRequired: user.mfaEnabled && !deviceTrusted,
        sessionId: tokens.accessToken
      };
    } catch (error) {
      this.logger.error('Login failed', {
        error,
        code: ErrorCodes.INVALID_CREDENTIALS
      });
      throw error;
    }
  }

  /**
   * Verify MFA token and complete authentication
   */
  public async verifyMFA(credentials: IMFACredentials): Promise<IAuthResponse> {
    try {
      const user = await this.userRepository.findOneOrFail({
        where: { id: credentials.userId }
      });

      const isValid = await user.verifyMfaToken(credentials.code);
      if (!isValid) {
        throw new Error(ErrorCodes.INVALID_CREDENTIALS.toString());
      }

      // Generate new tokens after MFA verification
      const tokens = await this.tokenService.generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role,
        mfaVerified: true
      });

      return {
        user: user.toAuthUser(),
        tokens,
        mfaRequired: false,
        sessionId: tokens.accessToken
      };
    } catch (error) {
      this.logger.error('MFA verification failed', {
        error,
        code: ErrorCodes.INVALID_CREDENTIALS
      });
      throw error;
    }
  }

  /**
   * Refresh authentication tokens
   */
  public async refreshToken(refreshToken: string, deviceInfo: IDeviceInfo): Promise<IAuthResponse> {
    try {
      const decoded = await this.tokenService.verifyToken(refreshToken, 'refresh');
      const user = await this.userRepository.findOneOrFail({
        where: { id: decoded.sub }
      });

      // Validate device association
      const isValidDevice = await this.validateDevice(user.id, deviceInfo);
      if (!isValidDevice) {
        throw new Error(ErrorCodes.RESOURCE_ACCESS_DENIED.toString());
      }

      const tokens = await this.tokenService.refreshTokens(refreshToken);

      return {
        user: user.toAuthUser(),
        tokens,
        mfaRequired: false,
        sessionId: tokens.accessToken
      };
    } catch (error) {
      this.logger.error('Token refresh failed', {
        error,
        code: ErrorCodes.TOKEN_EXPIRED
      });
      throw error;
    }
  }

  /**
   * Validate login attempts and rate limiting
   */
  private async validateLoginAttempt(email: string, deviceInfo: IDeviceInfo): Promise<void> {
    const attempts = await this.redisClient.incr(`login:attempts:${email}`);
    if (attempts > LOGIN_ATTEMPT_LIMIT) {
      await this.logger.security('Login attempts exceeded', {
        eventType: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.HIGH,
        resourceType: 'user',
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent
      });
      throw new Error('Too many login attempts');
    }
    await this.redisClient.expire(`login:attempts:${email}`, LOGIN_BLOCK_DURATION);
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(email: string, deviceInfo: IDeviceInfo): Promise<void> {
    await this.logger.security('Failed login attempt', {
      eventType: SecurityEventType.AUTH_FAILURE,
      severity: SecuritySeverity.MEDIUM,
      resourceType: 'user',
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent
    });
  }

  /**
   * Validate and track device trust status
   */
  private async validateDevice(userId: string, deviceInfo: IDeviceInfo): Promise<boolean> {
    const deviceKey = `${DEVICE_PREFIX}${userId}:${deviceInfo.deviceId}`;
    const trusted = await this.redisClient.get(deviceKey);
    
    if (trusted) {
      await this.redisClient.expire(deviceKey, DEVICE_TRUST_DURATION);
      return true;
    }
    return false;
  }

  /**
   * Create and store session information
   */
  private async createSession(
    userId: string,
    sessionId: string,
    deviceInfo: IDeviceInfo
  ): Promise<void> {
    const sessionKey = `${SESSION_PREFIX}${userId}:${sessionId}`;
    await this.redisClient.hmset(sessionKey, {
      deviceId: deviceInfo.deviceId,
      userAgent: deviceInfo.userAgent,
      ipAddress: deviceInfo.ipAddress,
      createdAt: new Date().toISOString()
    });
    await this.redisClient.expire(sessionKey, DEVICE_TRUST_DURATION);
  }
}