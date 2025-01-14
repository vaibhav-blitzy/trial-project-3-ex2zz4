/**
 * Enhanced JWT Token Service
 * Version: 1.0.0
 * Implements secure token management with RS256 signing, token blacklisting,
 * refresh token rotation, and Redis-based session management.
 */

import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken'; // v9.0.0
import { jwtConfig } from '../config/jwt.config';
import { IAuthTokens } from '../../../../shared/interfaces/auth.interface';
import { RedisConnection } from '../../../../shared/utils/redis.util';
import { ErrorCodes } from '../../../../shared/constants/error-codes';

// Token-related constants
const BLACKLIST_PREFIX = 'token:blacklist:';
const REFRESH_PREFIX = 'token:refresh:';
const TOKEN_CLEANUP_INTERVAL = 3600000; // 1 hour
const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh'
} as const;

@Injectable()
export class TokenService {
  private readonly blacklistPrefix: string;
  private readonly tokenCleanupInterval: NodeJS.Timeout;

  constructor(private readonly redisConnection: RedisConnection) {
    this.blacklistPrefix = BLACKLIST_PREFIX;
    this.setupTokenCleanup();
  }

  /**
   * Generates secure access and refresh tokens using RS256 signing
   */
  public async generateTokens(payload: Record<string, any>): Promise<IAuthTokens> {
    try {
      // Sanitize payload to prevent token bloat
      const sanitizedPayload = this.sanitizePayload(payload);

      // Generate access token with RS256 signing
      const accessToken = jwt.sign(
        { ...sanitizedPayload, type: TOKEN_TYPES.ACCESS },
        jwtConfig.privateKey,
        {
          algorithm: jwtConfig.algorithm,
          expiresIn: jwtConfig.accessToken.expiresIn,
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience
        }
      );

      // Generate refresh token with unique identifier
      const refreshToken = jwt.sign(
        { ...sanitizedPayload, type: TOKEN_TYPES.REFRESH },
        jwtConfig.privateKey,
        {
          algorithm: jwtConfig.algorithm,
          expiresIn: jwtConfig.refreshToken.expiresIn,
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience
        }
      );

      // Store refresh token in Redis with TTL
      const decoded = jwt.decode(refreshToken) as jwt.JwtPayload;
      await this.redisConnection.set(
        `${REFRESH_PREFIX}${decoded.jti}`,
        JSON.stringify({ userId: payload.sub, refreshToken }),
        { ttl: Math.floor((decoded.exp! - decoded.iat!) * 1000) }
      );

      return {
        accessToken,
        refreshToken,
        expiresIn: Math.floor((decoded.exp! - decoded.iat!) * 1000),
        tokenType: 'Bearer',
        issuedAt: decoded.iat! * 1000
      };
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Verifies token authenticity and checks blacklist
   */
  public async verifyToken(token: string, type: 'access' | 'refresh'): Promise<any> {
    try {
      // Check token format
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token format');
      }

      // Verify token hasn't been blacklisted
      const isBlacklisted = await this.redisConnection.exists(
        `${this.blacklistPrefix}${token}`
      );
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      // Verify token signature and claims
      const decoded = jwt.verify(token, jwtConfig.publicKey, {
        algorithms: [jwtConfig.algorithm],
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      }) as jwt.JwtPayload;

      // Verify token type
      if (decoded.type !== type) {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Revokes token by adding to blacklist with TTL
   */
  public async revokeToken(token: string): Promise<void> {
    try {
      // Decode token without verification to get expiration
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      if (!decoded || !decoded.exp) {
        throw new Error('Invalid token format');
      }

      // Calculate remaining TTL
      const now = Math.floor(Date.now() / 1000);
      const ttl = Math.max(0, decoded.exp - now);

      // Add to blacklist with TTL
      await this.redisConnection.set(
        `${this.blacklistPrefix}${token}`,
        'revoked',
        { ttl: ttl * 1000 }
      );

      // If refresh token, remove from active refresh tokens
      if (decoded.type === TOKEN_TYPES.REFRESH) {
        await this.redisConnection.delete(`${REFRESH_PREFIX}${decoded.jti}`);
      }
    } catch (error) {
      throw new Error(`Token revocation failed: ${error.message}`);
    }
  }

  /**
   * Refreshes token pair with enhanced security checks
   */
  public async refreshTokens(refreshToken: string): Promise<IAuthTokens> {
    try {
      // Verify refresh token
      const decoded = await this.verifyToken(refreshToken, TOKEN_TYPES.REFRESH);

      // Check if refresh token exists in Redis
      const storedToken = await this.redisConnection.get(
        `${REFRESH_PREFIX}${decoded.jti}`
      );
      if (!storedToken) {
        throw new Error('Refresh token has been revoked');
      }

      // Generate new token pair
      const newTokens = await this.generateTokens({
        sub: decoded.sub,
        roles: decoded.roles
      });

      // Revoke old refresh token
      await this.revokeToken(refreshToken);

      return newTokens;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Sanitizes payload to prevent token bloat
   */
  private sanitizePayload(payload: Record<string, any>): Record<string, any> {
    const allowedFields = ['sub', 'roles', 'permissions'];
    return Object.keys(payload).reduce((acc, key) => {
      if (allowedFields.includes(key)) {
        acc[key] = payload[key];
      }
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Sets up periodic cleanup of expired blacklisted tokens
   */
  private setupTokenCleanup(): void {
    this.tokenCleanupInterval = setInterval(async () => {
      try {
        const pattern = `${this.blacklistPrefix}*`;
        const keys = await this.redisConnection.keys(pattern);
        for (const key of keys) {
          const ttl = await this.redisConnection.ttl(key);
          if (ttl <= 0) {
            await this.redisConnection.delete(key);
          }
        }
      } catch (error) {
        console.error('Token cleanup failed:', error);
      }
    }, TOKEN_CLEANUP_INTERVAL);
  }
}