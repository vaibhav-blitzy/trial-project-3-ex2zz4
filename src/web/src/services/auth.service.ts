/**
 * Authentication Service
 * Version: 1.0.0
 * 
 * Enterprise-grade authentication service implementing secure user authentication,
 * token management, session handling, and authorization with enhanced security features.
 * 
 * @package TaskManagement
 * @module AuthService
 */

import jwtDecode from 'jwt-decode'; // v3.1.2
import { AES, enc } from 'crypto-js'; // v4.1.1
import {
  ILoginCredentials,
  IAuthResponse,
  IAuthTokens,
  IAuthUser,
  MFAMethod
} from '../interfaces/auth.interface';

/**
 * Security configuration constants for authentication service
 */
const AUTH_SECURITY_CONFIG = {
  TOKEN_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAX_RETRY_ATTEMPTS: 3,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  TOKEN_ROTATION_INTERVAL: 15 * 60 * 1000, // 15 minutes
  ENCRYPTION_KEY: process.env.REACT_APP_TOKEN_ENCRYPTION_KEY || 'default-key'
} as const;

/**
 * Authentication API endpoints
 */
const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  VERIFY_MFA: '/auth/verify-mfa',
  VALIDATE_SESSION: '/auth/validate-session'
} as const;

/**
 * Enhanced authentication service with robust security features and monitoring
 */
export class AuthService {
  private currentAccessToken: string | null = null;
  private currentRefreshToken: string | null = null;
  private refreshTokenTimeout?: NodeJS.Timeout;
  private sessionTimeout?: NodeJS.Timeout;
  private isTokenRefreshing: boolean = false;
  private tokenRefreshPromise: Promise<IAuthTokens> | null = null;

  constructor(private apiService: any) {
    this.initializeTokenRefresh();
    this.setupSessionMonitoring();
  }

  /**
   * Authenticates user with enhanced security measures
   * @param credentials User login credentials
   * @returns Authentication response with tokens and security context
   */
  public async login(credentials: ILoginCredentials): Promise<IAuthResponse> {
    try {
      this.validateCredentials(credentials);

      const encryptedCredentials = this.encryptSensitiveData(credentials);
      
      const response = await this.executeWithRetry<IAuthResponse>(
        () => this.apiService.post(AUTH_ENDPOINTS.LOGIN, encryptedCredentials),
        AUTH_SECURITY_CONFIG.MAX_RETRY_ATTEMPTS
      );

      if (response.tokens) {
        this.validateTokens(response.tokens);
        this.setupSecureSession(response.tokens);
      }

      return response;
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  /**
   * Securely refreshes authentication tokens
   * @returns New secure tokens
   */
  public async refreshToken(): Promise<IAuthTokens> {
    if (this.isTokenRefreshing) {
      return this.tokenRefreshPromise!;
    }

    try {
      this.isTokenRefreshing = true;
      this.tokenRefreshPromise = this.executeTokenRefresh();
      const tokens = await this.tokenRefreshPromise;
      return tokens;
    } finally {
      this.isTokenRefreshing = false;
      this.tokenRefreshPromise = null;
    }
  }

  /**
   * Logs out user and cleans up session
   */
  public async logout(): Promise<void> {
    try {
      await this.apiService.post(AUTH_ENDPOINTS.LOGOUT);
    } finally {
      this.cleanupSession();
    }
  }

  /**
   * Verifies MFA code during authentication
   * @param code MFA verification code
   * @param method MFA method used
   */
  public async verifyMFA(code: string, method: MFAMethod): Promise<IAuthResponse> {
    const payload = {
      code,
      method,
      token: this.currentAccessToken
    };

    const response = await this.apiService.post(AUTH_ENDPOINTS.VERIFY_MFA, payload);
    this.setupSecureSession(response.tokens);
    return response;
  }

  /**
   * Gets current authenticated user
   * @returns Current user or null if not authenticated
   */
  public getCurrentUser(): IAuthUser | null {
    if (!this.currentAccessToken) return null;
    try {
      const decoded = jwtDecode<{ user: IAuthUser }>(this.currentAccessToken);
      return decoded.user;
    } catch {
      return null;
    }
  }

  /**
   * Checks if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.currentAccessToken && !this.isTokenExpired(this.currentAccessToken);
  }

  /**
   * Validates user credentials
   */
  private validateCredentials(credentials: ILoginCredentials): void {
    if (!credentials.email || !credentials.password) {
      throw new Error('Invalid credentials provided');
    }
  }

  /**
   * Encrypts sensitive data before transmission
   */
  private encryptSensitiveData(data: any): any {
    return {
      ...data,
      password: AES.encrypt(
        data.password,
        AUTH_SECURITY_CONFIG.ENCRYPTION_KEY
      ).toString()
    };
  }

  /**
   * Executes API calls with retry mechanism
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.executeWithRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Validates received tokens
   */
  private validateTokens(tokens: IAuthTokens): void {
    if (!tokens.accessToken || !tokens.refreshToken) {
      throw new Error('Invalid tokens received');
    }
    try {
      jwtDecode(tokens.accessToken);
      jwtDecode(tokens.refreshToken);
    } catch {
      throw new Error('Invalid token format');
    }
  }

  /**
   * Sets up secure session with token rotation
   */
  private setupSecureSession(tokens: IAuthTokens): void {
    this.currentAccessToken = tokens.accessToken;
    this.currentRefreshToken = tokens.refreshToken;

    this.setupTokenRefreshTimer();
    this.setupSessionTimeout();
  }

  /**
   * Initializes token refresh mechanism
   */
  private initializeTokenRefresh(): void {
    if (this.currentAccessToken) {
      this.setupTokenRefreshTimer();
    }
  }

  /**
   * Sets up token refresh timer
   */
  private setupTokenRefreshTimer(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }

    this.refreshTokenTimeout = setTimeout(
      () => this.refreshToken(),
      AUTH_SECURITY_CONFIG.TOKEN_REFRESH_INTERVAL
    );
  }

  /**
   * Sets up session monitoring
   */
  private setupSessionMonitoring(): void {
    window.addEventListener('storage', this.handleStorageChange);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Executes token refresh
   */
  private async executeTokenRefresh(): Promise<IAuthTokens> {
    if (!this.currentRefreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.apiService.post(AUTH_ENDPOINTS.REFRESH, {
      refreshToken: this.currentRefreshToken
    });

    this.setupSecureSession(response.tokens);
    return response.tokens;
  }

  /**
   * Handles authentication errors
   */
  private handleAuthError(error: any): void {
    if (error.response?.status === 401) {
      this.cleanupSession();
    }
    console.error('Authentication error:', error);
  }

  /**
   * Cleans up session data
   */
  private cleanupSession(): void {
    this.currentAccessToken = null;
    this.currentRefreshToken = null;
    
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
  }

  /**
   * Checks if token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode<{ exp: number }>(token);
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  /**
   * Handles storage changes for multi-tab synchronization
   */
  private handleStorageChange = (event: StorageEvent): void => {
    if (event.key === 'logout') {
      this.cleanupSession();
    }
  };

  /**
   * Handles visibility changes for session validation
   */
  private handleVisibilityChange = async (): Promise<void> => {
    if (document.visibilityState === 'visible' && this.currentAccessToken) {
      try {
        await this.apiService.post(AUTH_ENDPOINTS.VALIDATE_SESSION);
      } catch {
        this.cleanupSession();
      }
    }
  };

  /**
   * Sets up session timeout
   */
  private setupSessionTimeout(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    this.sessionTimeout = setTimeout(
      () => this.cleanupSession(),
      AUTH_SECURITY_CONFIG.SESSION_TIMEOUT
    );
  }
}