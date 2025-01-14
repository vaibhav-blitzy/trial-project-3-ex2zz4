/**
 * @fileoverview Project creation page component implementing Material Design 3.0
 * Provides comprehensive project creation with validation, accessibility, and analytics
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, Box, CircularProgress } from '@mui/material';
import { track } from '@analytics/react';

import ProjectForm from '../../components/projects/ProjectForm';
import { ProjectService } from '../../services/project.service';
import { useNotification } from '../../hooks/useNotification';
import type { IProject } from '../../interfaces/project.interface';

/**
 * Interface for component state management
 */
interface ProjectCreateState {
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Project creation page component with comprehensive validation and feedback
 */
const ProjectCreate: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<ProjectCreateState>({
    isLoading: false,
    isSubmitting: false,
    error: null
  });

  // Initialize notification hook for user feedback
  const { showSuccess, showError } = useNotification();

  /**
   * Handles project creation with validation and error handling
   */
  const handleCreateProject = useCallback(async (projectData: IProject) => {
    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      // Track project creation attempt
      track('project_create_attempt', {
        teamId: projectData.teamId,
        priority: projectData.priority
      });

      // Create project using service
      const response = await ProjectService.createProject(projectData);

      if (response.success) {
        showSuccess('Project created successfully');
        
        // Track successful creation
        track('project_create_success', {
          projectId: response.data.id,
          teamId: projectData.teamId
        });

        // Navigate to project details
        navigate(`/projects/${response.data.id}`);
      } else {
        throw new Error(response.error || 'Failed to create project');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      setState(prev => ({ ...prev, error: errorMessage }));
      showError(errorMessage);

      // Track failed creation
      track('project_create_error', {
        error: errorMessage,
        teamId: projectData.teamId
      });
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [navigate, showSuccess, showError]);

  /**
   * Handles cancellation of project creation
   */
  const handleCancel = useCallback(() => {
    track('project_create_cancel');
    navigate('/projects');
  }, [navigate]);

  return (
    <Container maxWidth="md">
      <Box
        component="main"
        role="main"
        aria-label="Create new project"
        sx={{ py: 4 }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 3,
            borderRadius: 2,
            backgroundColor: 'background.paper'
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ mb: 4 }}
            align="center"
          >
            Create New Project
          </Typography>

          {state.isLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress
                size={40}
                aria-label="Loading project form"
              />
            </Box>
          ) : (
            <ProjectForm
              onSubmit={handleCreateProject}
              onCancel={handleCancel}
              isLoading={state.isSubmitting}
              autoFocus
              data-testid="project-create-form"
            />
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ProjectCreate;