/**
 * @fileoverview Projects reducer implementing comprehensive state management
 * Uses Redux Toolkit for type-safe CRUD operations with optimistic updates
 * @version 1.0.0
 */

import { createReducer, PayloadAction } from '@reduxjs/toolkit';
import { 
    ProjectState, 
    ProjectActionTypes,
    ProjectError,
    ProjectFilters,
    ProjectMetadata,
    DEFAULT_PROJECT_STATE
} from './projects.types';
import { IProject } from '../../interfaces/project.interface';
import { LoadingState } from '../../types/common.types';

/**
 * Initial state for projects reducer
 * Uses type-safe default values from projects.types
 */
const initialState: ProjectState = {
    ...DEFAULT_PROJECT_STATE
};

/**
 * Enhanced projects reducer with comprehensive state management
 * Implements optimistic updates and proper error handling
 */
export const projectsReducer = createReducer(initialState, (builder) => {
    builder
        // Fetch Projects Handlers
        .addCase(`${ProjectActionTypes.FETCH_PROJECTS}/pending`, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(`${ProjectActionTypes.FETCH_PROJECTS}/fulfilled`, (state, action: PayloadAction<{ projects: IProject[], metadata: ProjectMetadata }>) => {
            state.loading = false;
            state.projects = action.payload.projects;
            state.metadata = action.payload.metadata;
            state.error = null;
        })
        .addCase(`${ProjectActionTypes.FETCH_PROJECTS}/rejected`, (state, action: PayloadAction<ProjectError>) => {
            state.loading = false;
            state.error = action.payload;
        })

        // Create Project Handlers
        .addCase(`${ProjectActionTypes.CREATE_PROJECT}/pending`, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(`${ProjectActionTypes.CREATE_PROJECT}/fulfilled`, (state, action: PayloadAction<IProject>) => {
            state.loading = false;
            state.projects = [...state.projects, action.payload];
            state.metadata = {
                ...state.metadata,
                totalCount: state.metadata.totalCount + 1,
                activeCount: state.metadata.activeCount + 1,
                lastUpdated: new Date()
            };
            state.error = null;
        })
        .addCase(`${ProjectActionTypes.CREATE_PROJECT}/rejected`, (state, action: PayloadAction<ProjectError>) => {
            state.loading = false;
            state.error = action.payload;
        })

        // Update Project Handlers
        .addCase(`${ProjectActionTypes.UPDATE_PROJECT}/pending`, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(`${ProjectActionTypes.UPDATE_PROJECT}/fulfilled`, (state, action: PayloadAction<IProject>) => {
            state.loading = false;
            state.projects = state.projects.map(project => 
                project.id === action.payload.id ? action.payload : project
            );
            state.metadata = {
                ...state.metadata,
                lastUpdated: new Date()
            };
            if (state.selectedProject?.id === action.payload.id) {
                state.selectedProject = action.payload;
            }
            state.error = null;
        })
        .addCase(`${ProjectActionTypes.UPDATE_PROJECT}/rejected`, (state, action: PayloadAction<ProjectError>) => {
            state.loading = false;
            state.error = action.payload;
        })

        // Delete Project Handlers
        .addCase(`${ProjectActionTypes.DELETE_PROJECT}/pending`, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(`${ProjectActionTypes.DELETE_PROJECT}/fulfilled`, (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.projects = state.projects.filter(project => project.id !== action.payload);
            state.metadata = {
                ...state.metadata,
                totalCount: state.metadata.totalCount - 1,
                activeCount: state.metadata.activeCount - 1,
                lastUpdated: new Date()
            };
            if (state.selectedProject?.id === action.payload) {
                state.selectedProject = null;
            }
            state.error = null;
        })
        .addCase(`${ProjectActionTypes.DELETE_PROJECT}/rejected`, (state, action: PayloadAction<ProjectError>) => {
            state.loading = false;
            state.error = action.payload;
        })

        // Select Project Handler
        .addCase(ProjectActionTypes.SELECT_PROJECT, (state, action: PayloadAction<string>) => {
            const selectedProject = state.projects.find(project => project.id === action.payload);
            state.selectedProject = selectedProject || null;
        })

        // Set Filters Handler
        .addCase(ProjectActionTypes.SET_PROJECT_FILTER, (state, action: PayloadAction<Partial<ProjectFilters>>) => {
            state.filters = {
                ...state.filters,
                ...action.payload
            };
        })

        // Update Project Progress Handler
        .addCase(ProjectActionTypes.UPDATE_PROJECT_PROGRESS, (state, action: PayloadAction<{ projectId: string, progress: number }>) => {
            const { projectId, progress } = action.payload;
            state.projects = state.projects.map(project => 
                project.id === projectId 
                    ? { ...project, progress: Math.min(Math.max(progress, 0), 100) }
                    : project
            );
            if (state.selectedProject?.id === projectId) {
                state.selectedProject = {
                    ...state.selectedProject,
                    progress: Math.min(Math.max(progress, 0), 100)
                };
            }
            state.metadata = {
                ...state.metadata,
                lastUpdated: new Date()
            };
        });
});

export default projectsReducer;