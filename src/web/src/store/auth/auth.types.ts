/**
 * Redux Authentication Types
 * Version: 1.0.0
 * 
 * Defines comprehensive TypeScript types and interfaces for Redux authentication state management,
 * including support for MFA, token management, and role-based access control.
 * 
 * @packageDocumentation
 */

import { Action } from '@reduxjs/toolkit'; // v1.9.5
import { IAuthUser, IAuthTokens } from '../../interfaces/auth.interface';

/**
 * Enum defining all possible authentication action types
 * Includes comprehensive flow for login, logout, token refresh, and MFA
 */
export enum AuthActionTypes {
  LOGIN_REQUEST = '@auth/LOGIN_REQUEST',
  LOGIN_SUCCESS = '@auth/LOGIN_SUCCESS',
  LOGIN_FAILURE = '@auth/LOGIN_FAILURE',
  LOGOUT = '@auth/LOGOUT',
  REFRESH_TOKEN = '@auth/REFRESH_TOKEN',
  MFA_REQUIRED = '@auth/MFA_REQUIRED',
  MFA_VERIFY = '@auth/MFA_VERIFY',
  MFA_SUCCESS = '@auth/MFA_SUCCESS',
  MFA_FAILURE = '@auth/MFA_FAILURE'
}

/**
 * Interface defining the shape of the authentication state in Redux store
 * Includes comprehensive state management for authentication flow including MFA
 */
export interface IAuthState {
  user: IAuthUser | null;
  tokens: IAuthTokens | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  mfaRequired: boolean;
  mfaType: 'TOTP' | 'SMS' | null;
  mfaToken: string | null;
  tokenExpiration: number | null;
}

/**
 * Interface for login credentials payload
 */
export interface ILoginCredentials {
  email: string;
  password: string;
}

/**
 * Interface for MFA verification payload
 */
export interface IMFAVerifyPayload {
  code: string;
  mfaToken: string;
}

/**
 * Action Interfaces
 * Define type-safe interfaces for all authentication actions
 */
export interface ILoginRequestAction extends Action<AuthActionTypes.LOGIN_REQUEST> {
  payload: ILoginCredentials;
}

export interface ILoginSuccessAction extends Action<AuthActionTypes.LOGIN_SUCCESS> {
  payload: {
    user: IAuthUser;
    tokens: IAuthTokens;
  };
}

export interface ILoginFailureAction extends Action<AuthActionTypes.LOGIN_FAILURE> {
  payload: string;
}

export interface ILogoutAction extends Action<AuthActionTypes.LOGOUT> {
  // No payload needed
}

export interface IRefreshTokenAction extends Action<AuthActionTypes.REFRESH_TOKEN> {
  payload: IAuthTokens;
}

export interface IMFARequiredAction extends Action<AuthActionTypes.MFA_REQUIRED> {
  payload: {
    mfaType: 'TOTP' | 'SMS';
    mfaToken: string;
  };
}

export interface IMFAVerifyAction extends Action<AuthActionTypes.MFA_VERIFY> {
  payload: IMFAVerifyPayload;
}

export interface IMFASuccessAction extends Action<AuthActionTypes.MFA_SUCCESS> {
  payload: {
    user: IAuthUser;
    tokens: IAuthTokens;
  };
}

export interface IMFAFailureAction extends Action<AuthActionTypes.MFA_FAILURE> {
  payload: string;
}

/**
 * Union type of all possible authentication actions
 * Used for type-safe action handling in reducers
 */
export type AuthAction =
  | ILoginRequestAction
  | ILoginSuccessAction
  | ILoginFailureAction
  | ILogoutAction
  | IRefreshTokenAction
  | IMFARequiredAction
  | IMFAVerifyAction
  | IMFASuccessAction
  | IMFAFailureAction;