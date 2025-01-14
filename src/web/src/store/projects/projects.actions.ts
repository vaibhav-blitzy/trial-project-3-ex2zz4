/**
 * Project Actions Module
 * Implements Redux action creators for project-related operations with real-time updates
 * @version 1.0.0
 */

import { createAction, createAsyncThunk } from '@reduxjs/toolkit'; // ^1.9.0
import { debounce } from 'lodash'; // ^4.17.21
import { ProjectActionTypes } from './projects.types';
import { ProjectService, projectService } from '../../services/project.service';
import { IProject, ICreateProjectRequest, IUpdateProjectRequest } from '../../interfaces/project.interface';
import { ProjectFilters, ProjectState } from './projects.types';
import { ApiResponse, PaginatedResponse } from '../../types/api.types';

// Debounce delay for project updates (500ms)
const UPDATE_DEBOUNCE_DELAY = 500;

/**
 * Async thunk for fetching projects with filtering and pagination
 */
export const fetchProjects = createAsyncThunk<
  PaginatedResponse<IProject>,
  { filters?: ProjectFilters; page?: number; limit?: number }
>(
  ProjectActionTypes.FETCH_PROJECTS,
  async ({ filters, page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await projectService.getAllProjects(page, limit);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue('Failed to fetch projects');
    }
  }
);

/**
 * Async thunk for creating a new project
 */
export const createProject = createAsyncThunk<
  IProject,
  ICreateProjectRequest
>(
  ProjectActionTypes.CREATE_PROJECT,
  async (projectData, { rejectWithValue }) => {
    try {
      const response = await projectService.createProject(projectData);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue('Failed to create project');
    }
  }
);

/**
 * Async thunk for updating a project
 */
export const updateProject = createAsyncThunk<
  IProject,
  { id: string; updates: IUpdateProjectRequest }
>(
  ProjectActionTypes.UPDATE_PROJECT,
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await projectService.updateProject(id, updates);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue('Failed to update project');
    }
  }
);

/**
 * Async thunk for deleting a project
 */
export const deleteProject = createAsyncThunk<
  string,
  string
>(
  ProjectActionTypes.DELETE_PROJECT,
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await projectService.deleteProject(projectId);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return projectId;
    } catch (error) {
      return rejectWithValue('Failed to delete project');
    }
  }
);

/**
 * Async thunk for updating project progress with debouncing
 */
export const updateProjectProgress = createAsyncThunk<
  IProject,
  { projectId: string; progress: number }
>(
  ProjectActionTypes.UPDATE_PROJECT_PROGRESS,
  async ({ projectId, progress }, { rejectWithValue }) => {
    try {
      const debouncedUpdate = debounce(async () => {
        const response = await projectService.updateProjectProgress(projectId, progress);
        if (!response.success) {
          throw new Error(response.error || 'Failed to update progress');
        }
        return response.data;
      }, UPDATE_DEBOUNCE_DELAY);

      return await debouncedUpdate();
    } catch (error) {
      return rejectWithValue('Failed to update project progress');
    }
  }
);

/**
 * Action creator for selecting a project
 */
export const selectProject = createAction<string>(
  ProjectActionTypes.SELECT_PROJECT
);

/**
 * Action creator for setting project filters
 */
export const setProjectFilter = createAction<Partial<ProjectFilters>>(
  ProjectActionTypes.SET_PROJECT_FILTER
);

/**
 * Action creator for handling real-time project updates
 */
export const syncProjectChanges = createAction<{
  projectId: string;
  changes: Partial<IProject>;
}>(ProjectActionTypes.SYNC_PROJECT_CHANGES);

/**
 * Subscribes to real-time project updates
 * @param projectId Project ID to subscribe to
 * @returns Cleanup function
 */
export const subscribeToProjectUpdates = (projectId: string) => (
  dispatch: any
) => {
  return projectService.subscribeToProjectUpdates(projectId, (update) => {
    dispatch(syncProjectChanges({
      projectId: update.projectId,
      changes: update.changes
    }));
  });
};

/**
 * Type definitions for all project actions
 */
export type ProjectActions = 
  | ReturnType<typeof selectProject>
  | ReturnType<typeof setProjectFilter>
  | ReturnType<typeof syncProjectChanges>
  | ReturnType<typeof fetchProjects.pending>
  | ReturnType<typeof fetchProjects.fulfilled>
  | ReturnType<typeof fetchProjects.rejected>
  | ReturnType<typeof createProject.pending>
  | ReturnType<typeof createProject.fulfilled>
  | ReturnType<typeof createProject.rejected>
  | ReturnType<typeof updateProject.pending>
  | ReturnType<typeof updateProject.fulfilled>
  | ReturnType<typeof updateProject.rejected>
  | ReturnType<typeof deleteProject.pending>
  | ReturnType<typeof deleteProject.fulfilled>
  | ReturnType<typeof deleteProject.rejected>
  | ReturnType<typeof updateProjectProgress.pending>
  | ReturnType<typeof updateProjectProgress.fulfilled>
  | ReturnType<typeof updateProjectProgress.rejected>;