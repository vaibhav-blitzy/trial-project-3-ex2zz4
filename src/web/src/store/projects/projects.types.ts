/**
 * @fileoverview Project-related Redux state management types
 * Provides comprehensive type definitions for project state, actions, and error handling
 * @version 1.0.0
 */

import { PayloadAction } from '@reduxjs/toolkit';
import { IProject } from '../../interfaces/project.interface';

/**
 * Enum of all project-related Redux action types
 * Uses namespaced values to prevent action type collisions
 */
export enum ProjectActionTypes {
    FETCH_PROJECTS = '@projects/fetchProjects',
    CREATE_PROJECT = '@projects/createProject',
    UPDATE_PROJECT = '@projects/updateProject',
    DELETE_PROJECT = '@projects/deleteProject',
    SELECT_PROJECT = '@projects/selectProject',
    SET_PROJECT_FILTER = '@projects/setProjectFilter',
    UPDATE_PROJECT_PROGRESS = '@projects/updateProjectProgress'
}

/**
 * Interface for structured error handling in project operations
 * Provides detailed error information for user feedback
 */
export interface ProjectError {
    code: string;
    message: string;
    details: unknown;
}

/**
 * Interface for date range filtering
 * Enables filtering projects by date ranges
 */
export interface DateRange {
    startDate: Date | null;
    endDate: Date | null;
}

/**
 * Interface for project filtering options
 * Provides comprehensive filtering capabilities
 */
export interface ProjectFilters {
    status: string[];
    priority: string[];
    teamIds: string[];
    dateRange: DateRange;
    searchQuery: string;
}

/**
 * Interface for project state metadata
 * Tracks aggregate project statistics
 */
export interface ProjectMetadata {
    totalCount: number;
    activeCount: number;
    completedCount: number;
    lastUpdated: Date;
}

/**
 * Interface defining the shape of the projects Redux state
 * Provides comprehensive state management for projects
 */
export interface ProjectState {
    projects: IProject[];
    selectedProject: IProject | null;
    loading: boolean;
    error: ProjectError | null;
    filters: ProjectFilters;
    metadata: ProjectMetadata;
}

/**
 * Type definitions for project-related Redux actions
 * Ensures type safety for action creators and reducers
 */
export type FetchProjectsAction = PayloadAction<void>;
export type CreateProjectAction = PayloadAction<IProject>;
export type UpdateProjectAction = PayloadAction<Partial<IProject>>;
export type DeleteProjectAction = PayloadAction<string>;
export type SelectProjectAction = PayloadAction<string>;
export type SetProjectFilterAction = PayloadAction<Partial<ProjectFilters>>;
export type UpdateProjectProgressAction = PayloadAction<{
    projectId: string;
    progress: number;
}>;

/**
 * Type for project action responses
 * Handles successful API responses
 */
export interface ProjectActionResponse {
    success: boolean;
    data?: IProject | IProject[];
    metadata?: ProjectMetadata;
}

/**
 * Type for project validation results
 * Provides structured validation feedback
 */
export interface ProjectValidationResult {
    isValid: boolean;
    errors: ProjectError[];
}

/**
 * Default values for project state initialization
 * Provides type-safe default values
 */
export const DEFAULT_PROJECT_STATE: ProjectState = {
    projects: [],
    selectedProject: null,
    loading: false,
    error: null,
    filters: {
        status: [],
        priority: [],
        teamIds: [],
        dateRange: {
            startDate: null,
            endDate: null
        },
        searchQuery: ''
    },
    metadata: {
        totalCount: 0,
        activeCount: 0,
        completedCount: 0,
        lastUpdated: new Date()
    }
};