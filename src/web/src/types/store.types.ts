/**
 * @fileoverview Global Redux Store Type Definitions
 * Provides comprehensive TypeScript types and interfaces for the global Redux store state,
 * ensuring strict type safety and immutability across the entire application state tree.
 * @version 1.0.0
 */

import { ThunkAction, ThunkDispatch } from '@reduxjs/toolkit'; // v1.9.0
import { Action } from 'redux'; // v4.2.0
import { AuthState } from '../store/auth/auth.types';
import { ProjectState } from '../store/projects/projects.types';
import { TaskState } from '../store/tasks/tasks.types';

/**
 * Root state interface defining the complete Redux store state tree
 * Implements strict immutability and null checks for all state slices
 */
export interface RootState {
  readonly auth: Readonly<AuthState>;
  readonly projects: Readonly<ProjectState>;
  readonly tasks: Readonly<TaskState>;
}

/**
 * Type definition for Redux Thunk actions with comprehensive error handling
 * Enables type-safe async operations with proper return type inference
 * 
 * @template ReturnType - The expected return type of the thunk action
 * @param dispatch - Strongly typed dispatch function
 * @param getState - Function to access the current state tree
 * @param extraArgument - Optional extra argument passed to the thunk
 * @returns Promise of the specified return type
 */
export type AppThunk<ReturnType = void> = ThunkAction<
  Promise<ReturnType>,
  RootState,
  unknown,
  Action<string>
>;

/**
 * Type-safe dispatch function supporting both synchronous and asynchronous actions
 * Provides proper type inference for dispatched actions and thunks
 * 
 * @template State - The complete state tree type
 * @template ExtraThunkArg - Optional extra argument type for thunks
 * @template BasicAction - Base action type extending Action
 */
export type AppDispatch = ThunkDispatch<RootState, unknown, Action<string>>;