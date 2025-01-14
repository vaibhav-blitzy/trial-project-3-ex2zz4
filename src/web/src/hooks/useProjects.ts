/**
 * Custom React hook for comprehensive project management
 * Provides CRUD operations, real-time updates, optimistic updates,
 * caching, and error handling with Redux integration
 * @version 1.0.0
 */

import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from '../../store';
import { 
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  selectProject,
  subscribeToProjectUpdates
} from '../../store/projects/projects.actions';
import {
  selectAllProjects,
  selectSelectedProject,
  selectProjectsLoading,
  selectProjectsError
} from '../../store/projects/projects.selectors';
import { IProject } from '../../interfaces/project.interface';

/**
 * Hook for managing projects with optimized performance and error handling
 */
export const useProjects = () => {
  const dispatch = useDispatch();
  
  // Select project state using memoized selectors
  const projects = useSelector(selectAllProjects);
  const selectedProject = useSelector(selectSelectedProject);
  const loading = useSelector(selectProjectsLoading);
  const error = useSelector(selectProjectsError);

  // Refs for cleanup and subscription tracking
  const subscriptionRefs = useRef<{ [key: string]: () => void }>({});
  const isMounted = useRef(true);

  /**
   * Fetches all projects with error handling and caching
   */
  const fetchAllProjects = useCallback(async () => {
    try {
      await dispatch(fetchProjects({ page: 1, limit: 10 })).unwrap();
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, [dispatch]);

  /**
   * Creates a new project with optimistic update
   */
  const handleCreateProject = useCallback(async (projectData: Omit<IProject, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    try {
      const result = await dispatch(createProject(projectData)).unwrap();
      // Subscribe to real-time updates for the new project
      subscribeToProjectUpdates(result.id)(dispatch);
      return result;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Updates a project with optimistic update and real-time sync
   */
  const handleUpdateProject = useCallback(async (
    projectId: string,
    updates: Partial<IProject>
  ) => {
    try {
      const result = await dispatch(updateProject({ id: projectId, updates })).unwrap();
      return result;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Deletes a project with optimistic removal
   */
  const handleDeleteProject = useCallback(async (projectId: string) => {
    try {
      await dispatch(deleteProject(projectId)).unwrap();
      // Clean up subscriptions
      if (subscriptionRefs.current[projectId]) {
        subscriptionRefs.current[projectId]();
        delete subscriptionRefs.current[projectId];
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Selects a project for detailed view
   */
  const handleSelectProject = useCallback((projectId: string | null) => {
    if (projectId) {
      dispatch(selectProject(projectId));
    }
  }, [dispatch]);

  /**
   * Set up real-time updates and cleanup on mount/unmount
   */
  useEffect(() => {
    // Subscribe to real-time updates for all projects
    projects.forEach(project => {
      if (!subscriptionRefs.current[project.id]) {
        subscriptionRefs.current[project.id] = subscribeToProjectUpdates(project.id)(dispatch);
      }
    });

    // Cleanup function
    return () => {
      isMounted.current = false;
      // Unsubscribe from all project updates
      Object.values(subscriptionRefs.current).forEach(unsubscribe => unsubscribe());
      subscriptionRefs.current = {};
    };
  }, [dispatch, projects]);

  return {
    // State
    projects,
    selectedProject,
    loading,
    error,

    // Actions
    fetchAllProjects,
    handleCreateProject,
    handleUpdateProject,
    handleDeleteProject,
    handleSelectProject
  };
};

export default useProjects;