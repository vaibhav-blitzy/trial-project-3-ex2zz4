/**
 * Enhanced Authentication Controller
 * Version: 1.0.0
 * Implements secure endpoints for user authentication with comprehensive security features
 * including MFA, device tracking, and session management.
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  UseInterceptors
} from '@nestjs/common'; // ^9.0.0
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity
} from '@nestjs/swagger'; // ^6.0.0
import { Response, Request } from 'express'; // ^4.18.0
import { RateLimit } from '@nestjs/throttler'; // ^4.0.0

import { AuthService } from '../services/auth.service';
import {
  IAuthCredentials,
  IAuthResponse,
  IMFACredentials,
  IDeviceInfo
} from '../../../shared/interfaces/auth.interface';
import {
  loginSchema,
  registrationSchema,
  mfaVerificationSchema
} from '../validators/auth.validator';
import { LoggingInterceptor } from '../../../shared/interceptors/logging.interceptor';
import { ThrottlerGuard } from '../../../shared/guards/throttler.guard';
import { SecurityEventType, SecuritySeverity } from '../../../shared/utils/logger.util';
import { ErrorCodes } from '../../../shared/constants/error-codes';

@Controller('auth')
@ApiTags('Authentication')
@UseInterceptors(LoggingInterceptor)
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Enhanced login endpoint with security features
   */
  @Post('login')
  @ApiOperation({ summary: 'Secure user login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  @RateLimit({ points: 5, duration: 60 })
  async login(
    @Body() credentials: IAuthCredentials,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    try {
      // Enhance credentials with device information
      const deviceInfo: IDeviceInfo = {
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip,
        deviceId: req.headers['x-device-id'] as string,
        fingerprint: req.headers['x-device-fingerprint'] as string
      };

      // Validate login credentials
      const { error } = loginSchema.validate({ ...credentials, deviceInfo });
      if (error) {
        res.status(HttpStatus.BAD_REQUEST).json({
          code: ErrorCodes.INVALID_INPUT_FORMAT,
          message: error.details[0].message
        });
        return;
      }

      // Attempt authentication
      const authResponse = await this.authService.login(credentials, deviceInfo);

      // Set secure authentication cookies
      this.setAuthCookies(res, authResponse.tokens);

      res.status(HttpStatus.OK).json(authResponse);
    } catch (error) {
      this.handleAuthError(error, res);
    }
  }

  /**
   * User registration with enhanced security
   */
  @Post('register')
  @ApiOperation({ summary: 'Secure user registration' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @RateLimit({ points: 3, duration: 3600 })
  async register(
    @Body() registrationData: IAuthCredentials,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    try {
      const deviceInfo: IDeviceInfo = {
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip,
        deviceId: req.headers['x-device-id'] as string,
        fingerprint: req.headers['x-device-fingerprint'] as string
      };

      // Validate registration data
      const { error } = registrationSchema.validate({ ...registrationData, deviceInfo });
      if (error) {
        res.status(HttpStatus.BAD_REQUEST).json({
          code: ErrorCodes.INVALID_INPUT_FORMAT,
          message: error.details[0].message
        });
        return;
      }

      const authResponse = await this.authService.register(registrationData, deviceInfo);
      this.setAuthCookies(res, authResponse.tokens);

      res.status(HttpStatus.CREATED).json(authResponse);
    } catch (error) {
      this.handleAuthError(error, res);
    }
  }

  /**
   * MFA verification endpoint
   */
  @Post('verify-mfa')
  @ApiOperation({ summary: 'Verify MFA token' })
  @ApiResponse({ status: 200, description: 'MFA verification successful' })
  @ApiResponse({ status: 401, description: 'Invalid MFA token' })
  @RateLimit({ points: 3, duration: 300 })
  async verifyMFA(
    @Body() mfaCredentials: IMFACredentials,
    @Res() res: Response
  ): Promise<void> {
    try {
      const { error } = mfaVerificationSchema.validate(mfaCredentials);
      if (error) {
        res.status(HttpStatus.BAD_REQUEST).json({
          code: ErrorCodes.INVALID_INPUT_FORMAT,
          message: error.details[0].message
        });
        return;
      }

      const authResponse = await this.authService.verifyMFA(mfaCredentials);
      this.setAuthCookies(res, authResponse.tokens);

      res.status(HttpStatus.OK).json(authResponse);
    } catch (error) {
      this.handleAuthError(error, res);
    }
  }

  /**
   * Token refresh endpoint
   */
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh authentication tokens' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiSecurity('refresh_token')
  async refreshToken(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    try {
      const refreshToken = req.cookies['refresh_token'];
      if (!refreshToken) {
        res.status(HttpStatus.UNAUTHORIZED).json({
          code: ErrorCodes.TOKEN_EXPIRED,
          message: 'Refresh token is required'
        });
        return;
      }

      const deviceInfo: IDeviceInfo = {
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip,
        deviceId: req.headers['x-device-id'] as string,
        fingerprint: req.headers['x-device-fingerprint'] as string
      };

      const authResponse = await this.authService.refreshToken(refreshToken, deviceInfo);
      this.setAuthCookies(res, authResponse.tokens);

      res.status(HttpStatus.OK).json(authResponse);
    } catch (error) {
      this.handleAuthError(error, res);
    }
  }

  /**
   * Logout endpoint
   */
  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    try {
      const accessToken = req.cookies['access_token'];
      if (accessToken) {
        await this.authService.logout(accessToken);
      }

      this.clearAuthCookies(res);
      res.status(HttpStatus.OK).json({ message: 'Logout successful' });
    } catch (error) {
      this.handleAuthError(error, res);
    }
  }

  /**
   * Set secure authentication cookies
   */
  private setAuthCookies(res: Response, tokens: IAuthResponse['tokens']): void {
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 900000 // 15 minutes
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 604800000 // 7 days
    });
  }

  /**
   * Clear authentication cookies
   */
  private clearAuthCookies(res: Response): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any, res: Response): void {
    const errorCode = error.code || ErrorCodes.SYSTEM_ERROR;
    const statusCode = this.getHttpStatusCode(errorCode);

    res.status(statusCode).json({
      code: errorCode,
      message: error.message || 'Authentication failed'
    });
  }

  /**
   * Map error codes to HTTP status codes
   */
  private getHttpStatusCode(errorCode: ErrorCodes): number {
    switch (errorCode) {
      case ErrorCodes.INVALID_CREDENTIALS:
        return HttpStatus.UNAUTHORIZED;
      case ErrorCodes.TOKEN_EXPIRED:
        return HttpStatus.UNAUTHORIZED;
      case ErrorCodes.INVALID_INPUT_FORMAT:
        return HttpStatus.BAD_REQUEST;
      case ErrorCodes.RESOURCE_ACCESS_DENIED:
        return HttpStatus.FORBIDDEN;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }
}