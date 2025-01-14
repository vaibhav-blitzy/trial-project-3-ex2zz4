/**
 * Project Redux Selectors
 * Implements memoized selectors for accessing and deriving project-related state
 * with comprehensive filtering capabilities and type safety.
 * @version 1.0.0
 */

import { createSelector } from '@reduxjs/toolkit'; // ^1.9.0
import { RootState } from '../index';
import { IProject } from '../../interfaces/project.interface';
import { ProjectState, ProjectFilters } from './projects.types';

/**
 * Base selector to access the projects slice of the Redux state
 * @param state Root Redux state
 * @returns Projects state slice
 */
export const selectProjectsState = (state: RootState): ProjectState => state.projects;

/**
 * Memoized selector to get all projects
 */
export const selectAllProjects = createSelector(
  [selectProjectsState],
  (projectsState): IProject[] => projectsState.projects
);

/**
 * Memoized selector to get currently selected project
 */
export const selectSelectedProject = createSelector(
  [selectProjectsState],
  (projectsState): IProject | null => projectsState.selectedProject
);

/**
 * Memoized selector to get projects loading state
 */
export const selectProjectsLoading = createSelector(
  [selectProjectsState],
  (projectsState): boolean => projectsState.loading
);

/**
 * Memoized selector to get projects error state
 */
export const selectProjectsError = createSelector(
  [selectProjectsState],
  (projectsState): string | null => projectsState.error
);

/**
 * Memoized selector to get current project filters
 */
export const selectProjectFilters = createSelector(
  [selectProjectsState],
  (projectsState): ProjectFilters => projectsState.filters
);

/**
 * Memoized selector to get project metadata
 */
export const selectProjectMetadata = createSelector(
  [selectProjectsState],
  (projectsState) => projectsState.metadata
);

/**
 * Factory selector to get a project by ID
 * @param projectId Project identifier
 */
export const selectProjectById = (projectId: string) => createSelector(
  [selectAllProjects],
  (projects): IProject | undefined => 
    projects.find(project => project.id === projectId)
);

/**
 * Memoized selector to get active projects
 */
export const selectActiveProjects = createSelector(
  [selectAllProjects],
  (projects): IProject[] =>
    projects.filter(project => project.status === 'ACTIVE')
);

/**
 * Memoized selector to get projects by team
 * @param teamId Team identifier
 */
export const selectProjectsByTeam = (teamId: string) => createSelector(
  [selectAllProjects],
  (projects): IProject[] =>
    projects.filter(project => project.teamId === teamId)
);

/**
 * Memoized selector to get projects by priority
 * @param priority Project priority level
 */
export const selectProjectsByPriority = (priority: string) => createSelector(
  [selectAllProjects],
  (projects): IProject[] =>
    projects.filter(project => project.priority === priority)
);

/**
 * Memoized selector to get projects sorted by progress
 */
export const selectProjectsSortedByProgress = createSelector(
  [selectAllProjects],
  (projects): IProject[] =>
    [...projects].sort((a, b) => b.progress - a.progress)
);

/**
 * Memoized selector to get filtered projects based on current filters
 */
export const selectFilteredProjects = createSelector(
  [selectAllProjects, selectProjectFilters],
  (projects, filters): IProject[] => {
    return projects.filter(project => {
      // Apply status filter
      if (filters.status.length && !filters.status.includes(project.status)) {
        return false;
      }

      // Apply priority filter
      if (filters.priority.length && !filters.priority.includes(project.priority)) {
        return false;
      }

      // Apply team filter
      if (filters.teamIds.length && !filters.teamIds.includes(project.teamId)) {
        return false;
      }

      // Apply date range filter
      if (filters.dateRange.startDate && filters.dateRange.endDate) {
        const projectDate = new Date(project.startDate);
        const startDate = new Date(filters.dateRange.startDate);
        const endDate = new Date(filters.dateRange.endDate);
        
        if (projectDate < startDate || projectDate > endDate) {
          return false;
        }
      }

      // Apply search query filter
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        return project.name.toLowerCase().includes(searchLower) ||
               project.description.toLowerCase().includes(searchLower);
      }

      return true;
    });
  }
);

/**
 * Memoized selector to get project statistics
 */
export const selectProjectStatistics = createSelector(
  [selectAllProjects],
  (projects) => ({
    total: projects.length,
    active: projects.filter(p => p.status === 'ACTIVE').length,
    completed: projects.filter(p => p.status === 'COMPLETED').length,
    averageProgress: projects.reduce((acc, p) => acc + p.progress, 0) / projects.length || 0
  })
);