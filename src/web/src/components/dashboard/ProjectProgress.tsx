/**
 * Project Progress Dashboard Component
 * Displays real-time project progress metrics using Material Design 3.0
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Typography, Box, CircularProgress } from '@mui/material'; // ^5.0.0
import { IProject } from '../../interfaces/project.interface';
import ProgressBar from '../../components/common/ProgressBar';
import { projectService } from '../../services/project.service';
import useDebounce from '../../hooks/useDebounce';
import { Size, Variant } from '../../types/common.types';

/**
 * Props interface for ProjectProgress component
 */
interface ProjectProgressProps {
  className?: string;
  style?: React.CSSProperties;
  limit?: number;
  refreshInterval?: number;
  onError?: (error: Error) => void;
}

/**
 * State interface for project progress data
 */
interface ProjectProgressState {
  loading: boolean;
  error: Error | null;
  projects: IProject[];
}

/**
 * Determines progress bar variant based on completion percentage
 */
const getProgressVariant = (progress: number): Variant => {
  if (progress < 33) return Variant.PRIMARY;
  if (progress < 66) return Variant.SECONDARY;
  return Variant.PRIMARY;
};

/**
 * Sorts projects by progress in descending order
 */
const sortProjectsByProgress = (projects: IProject[]): IProject[] => {
  return [...projects].sort((a, b) => b.progress - a.progress);
};

/**
 * ProjectProgress Component
 * Displays real-time project progress with Material Design 3.0 styling
 */
const ProjectProgress: React.FC<ProjectProgressProps> = ({
  className,
  style,
  limit = 5,
  refreshInterval = 30000,
  onError
}) => {
  // State management
  const [state, setState] = useState<ProjectProgressState>({
    loading: true,
    error: null,
    projects: []
  });

  // Debounce project updates to prevent excessive re-renders
  const debouncedProjects = useDebounce(state.projects, 300);

  /**
   * Fetches project data from the service
   */
  const fetchProjects = useCallback(async () => {
    try {
      const response = await projectService.getAllProjects(1, limit);
      if (response.success) {
        setState(prev => ({
          ...prev,
          loading: false,
          projects: response.data.items
        }));
      } else {
        throw new Error(response.error || 'Failed to fetch projects');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error
      }));
      onError?.(error as Error);
    }
  }, [limit, onError]);

  /**
   * Handles real-time project updates
   */
  const handleProjectUpdate = useCallback((projectId: string, progress: number) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(project =>
        project.id === projectId ? { ...project, progress } : project
      )
    }));
  }, []);

  // Setup real-time subscription and polling
  useEffect(() => {
    fetchProjects();

    // Subscribe to real-time updates
    const unsubscribe = projectService.subscribeToProjectUpdates(
      'all',
      (update) => {
        handleProjectUpdate(update.projectId, update.changes.progress || 0);
      }
    );

    // Setup refresh interval
    const intervalId = setInterval(fetchProjects, refreshInterval);

    // Cleanup subscriptions
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [fetchProjects, refreshInterval, handleProjectUpdate]);

  // Memoize sorted projects
  const sortedProjects = useMemo(() => 
    sortProjectsByProgress(debouncedProjects),
    [debouncedProjects]
  );

  // Loading state
  if (state.loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
        className={className}
        style={style}
      >
        <CircularProgress aria-label="Loading projects" />
      </Box>
    );
  }

  // Error state
  if (state.error) {
    return (
      <Box
        className={className}
        style={style}
        role="alert"
        aria-live="polite"
      >
        <Typography color="error" variant="body1">
          {state.error.message}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      className={className}
      style={style}
      aria-label="Project Progress Dashboard"
      role="region"
    >
      <Typography
        variant="h6"
        component="h2"
        gutterBottom
        aria-label="Project Progress"
      >
        Project Progress
      </Typography>

      {sortedProjects.length === 0 ? (
        <Typography
          variant="body1"
          color="textSecondary"
          aria-label="No projects found"
        >
          No active projects found
        </Typography>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {sortedProjects.map((project) => (
            <Box key={project.id}>
              <Typography
                variant="body2"
                color="textSecondary"
                gutterBottom
                aria-label={`Project: ${project.name}`}
              >
                {project.name}
              </Typography>
              <ProgressBar
                value={project.progress}
                variant={getProgressVariant(project.progress)}
                size={Size.MEDIUM}
                label={`${project.name} progress: ${project.progress}%`}
                showValue
                transitionDuration={150}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

// Default props
ProjectProgress.defaultProps = {
  limit: 5,
  refreshInterval: 30000
};

export default ProjectProgress;