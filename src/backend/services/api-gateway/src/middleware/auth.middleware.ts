/**
 * Enhanced Authentication Middleware
 * Version: 1.0.0
 * Implements secure JWT token validation, role-based authorization,
 * audit logging, and enhanced security controls.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { StatusCodes } from 'http-status-codes';
import { IAuthUser } from '../../../shared/interfaces/auth.interface';
import { TokenService } from '../../auth-service/src/services/token.service';
import { Logger, SecurityEventType, SecuritySeverity } from '../../../shared/utils/logger.util';
import { ErrorCodes, getErrorMessage } from '../../../shared/constants/error-codes';

// Constants for security configurations
const AUTH_HEADER = 'Authorization';
const TOKEN_TYPE = 'Bearer';
const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60; // 15 minutes
const RATE_LIMIT_POINTS = 10;
const RATE_LIMIT_DURATION = 60; // 1 minute

// Interface for authenticated request with security context
interface AuthenticatedRequest extends Request {
  user?: IAuthUser;
  securityContext?: {
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    lastActivity: Date;
  };
}

// Interface for role hierarchy
interface RoleHierarchy {
  [key: string]: string[];
}

// Role hierarchy definition
const ROLE_HIERARCHY: RoleHierarchy = {
  'ADMIN': ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'GUEST'],
  'PROJECT_MANAGER': ['PROJECT_MANAGER', 'TEAM_MEMBER', 'GUEST'],
  'TEAM_MEMBER': ['TEAM_MEMBER', 'GUEST'],
  'GUEST': ['GUEST']
};

// Initialize services
const logger = Logger.getInstance('AuthMiddleware', {
  enableConsole: true,
  enableFile: true
});

const tokenService = new TokenService(null); // Redis connection will be injected

// Rate limiter configuration
const rateLimiter = new RateLimiterRedis({
  points: RATE_LIMIT_POINTS,
  duration: RATE_LIMIT_DURATION,
  blockDuration: BLOCK_DURATION,
  storeClient: null, // Redis client will be injected
  keyPrefix: 'rl:auth'
});

/**
 * Enhanced authentication middleware
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract and validate authorization header
    const authHeader = req.headers[AUTH_HEADER.toLowerCase()];
    if (!authHeader || typeof authHeader !== 'string') {
      throw new Error('Missing or invalid authorization header');
    }

    // Validate token format
    const [tokenType, token] = authHeader.split(' ');
    if (tokenType !== TOKEN_TYPE || !token) {
      throw new Error('Invalid token format');
    }

    // Apply rate limiting
    try {
      await rateLimiter.consume(req.ip);
    } catch (error) {
      logger.security('Rate limit exceeded', {
        eventType: SecurityEventType.ACCESS_DENIED,
        severity: SecuritySeverity.MEDIUM,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        error: 'Too many authentication attempts'
      });
      return;
    }

    // Verify token
    const decoded = await tokenService.verifyToken(token, 'access');
    if (!decoded) {
      throw new Error('Invalid token');
    }

    // Check token blacklist
    const isBlacklisted = await tokenService.checkBlacklist(token);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    // Create security context
    const securityContext = {
      sessionId: decoded.jti,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'unknown',
      lastActivity: new Date()
    };

    // Attach user and security context to request
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      permissions: decoded.permissions,
      email: decoded.email,
      mfaEnabled: decoded.mfaEnabled,
      lastLogin: new Date(decoded.iat * 1000),
      securityLevel: decoded.securityLevel
    };
    req.securityContext = securityContext;

    // Log successful authentication
    logger.security('Authentication successful', {
      eventType: SecurityEventType.AUTH_SUCCESS,
      severity: SecuritySeverity.LOW,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    next();
  } catch (error) {
    // Log authentication failure
    logger.security('Authentication failed', {
      eventType: SecurityEventType.AUTH_FAILURE,
      severity: SecuritySeverity.HIGH,
      error: error.message,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(StatusCodes.UNAUTHORIZED).json({
      error: getErrorMessage(ErrorCodes.INVALID_CREDENTIALS),
      code: ErrorCodes.INVALID_CREDENTIALS
    });
  }
};

/**
 * Enhanced authorization middleware factory
 */
export const authorize = (
  requiredRoles: string[] = [],
  requiredPermissions: string[] = []
): RequestHandler => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify role-based access
      if (requiredRoles.length > 0) {
        const allowedRoles = ROLE_HIERARCHY[user.role] || [];
        const hasRole = requiredRoles.some(role => allowedRoles.includes(role));
        if (!hasRole) {
          throw new Error('Insufficient role privileges');
        }
      }

      // Verify permissions
      if (requiredPermissions.length > 0) {
        const hasPermissions = requiredPermissions.every(
          permission => user.permissions.includes(permission)
        );
        if (!hasPermissions) {
          throw new Error('Insufficient permissions');
        }
      }

      // Log successful authorization
      logger.security('Authorization successful', {
        eventType: SecurityEventType.ACCESS_DENIED,
        severity: SecuritySeverity.LOW,
        userId: user.id,
        resourceType: req.baseUrl,
        action: req.method,
        outcome: 'success'
      });

      next();
    } catch (error) {
      // Log authorization failure
      logger.security('Authorization failed', {
        eventType: SecurityEventType.ACCESS_DENIED,
        severity: SecuritySeverity.HIGH,
        error: error.message,
        userId: req.user?.id,
        resourceType: req.baseUrl,
        action: req.method,
        outcome: 'failure'
      });

      res.status(StatusCodes.FORBIDDEN).json({
        error: getErrorMessage(ErrorCodes.INSUFFICIENT_PERMISSIONS),
        code: ErrorCodes.INSUFFICIENT_PERMISSIONS
      });
    }
  };
};