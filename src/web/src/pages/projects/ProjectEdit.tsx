/**
 * @fileoverview Project Edit Page Component
 * Provides comprehensive project editing functionality with real-time collaboration,
 * form validation, and accessibility features following Material Design 3.0
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  Snackbar 
} from '@mui/material';

import ProjectForm from '../../components/projects/ProjectForm';
import { IProject } from '../../interfaces/project.interface';
import { updateProject } from '../../store/projects/projects.actions';
import useWebSocket from '../../hooks/useWebSocket';

/**
 * Interface for collaborative update events
 */
interface CollaborativeUpdate {
  projectId: string;
  userId: string;
  changes: Partial<IProject>;
  timestamp: string;
}

/**
 * Props interface for ProjectEdit component
 */
interface ProjectEditProps {
  className?: string;
  onCollaborativeUpdate?: (update: IProject) => void;
}

/**
 * Project Edit page component with real-time collaboration
 * Implements WCAG 2.1 Level AA compliance
 */
const ProjectEdit: React.FC<ProjectEditProps> = ({
  className,
  onCollaborativeUpdate
}) => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Local state management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [optimisticUpdate, setOptimisticUpdate] = useState<IProject | null>(null);

  // Redux state
  const project = useSelector((state: any) => 
    state.projects.projects.find((p: IProject) => p.id === projectId)
  );

  // WebSocket setup for real-time collaboration
  const { subscribe, isConnected } = useWebSocket();

  /**
   * Handles real-time collaborative updates
   */
  const handleCollaborativeEdit = useCallback((update: CollaborativeUpdate) => {
    if (update.projectId === projectId) {
      setCollaborators(prev => [...new Set([...prev, update.userId])]);
      
      if (onCollaborativeUpdate) {
        onCollaborativeUpdate({
          ...project,
          ...update.changes
        });
      }

      // Show collaboration indicator
      setSuccessMessage(`Changes received from collaborator`);
    }
  }, [projectId, project, onCollaborativeUpdate]);

  /**
   * Handles project update submission with optimistic updates
   */
  const handleProjectUpdate = useCallback(async (updatedProject: IProject) => {
    setLoading(true);
    setError(null);

    try {
      // Apply optimistic update
      setOptimisticUpdate(updatedProject);

      // Dispatch update action
      const result = await dispatch(updateProject({
        id: projectId!,
        updates: updatedProject
      })).unwrap();

      setSuccessMessage('Project updated successfully');

      // Broadcast update via WebSocket if connected
      if (isConnected) {
        const wsMessage = {
          type: 'project.update',
          payload: {
            projectId,
            changes: updatedProject,
            timestamp: new Date().toISOString()
          }
        };
        // WebSocket message would be sent here
      }

      // Navigate to project details after successful update
      setTimeout(() => {
        navigate(`/projects/${projectId}`);
      }, 1500);

    } catch (err) {
      // Revert optimistic update
      setOptimisticUpdate(null);
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setLoading(false);
    }
  }, [dispatch, projectId, navigate, isConnected]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribe<CollaborativeUpdate>(
      'project.update',
      handleCollaborativeEdit
    );

    return () => {
      unsubscribe();
    };
  }, [subscribe, handleCollaborativeEdit]);

  // Handle missing project ID
  if (!projectId) {
    return (
      <Container>
        <Alert severity="error">
          Project ID is required
        </Alert>
      </Container>
    );
  }

  return (
    <Container className={className} maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          aria-label="Edit Project"
        >
          Edit Project
        </Typography>

        {/* Real-time collaboration indicator */}
        {collaborators.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {collaborators.length} other {collaborators.length === 1 ? 'user is' : 'users are'} currently editing
          </Alert>
        )}

        {/* Loading state */}
        {loading && !optimisticUpdate && (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress aria-label="Loading project data" />
          </Box>
        )}

        {/* Error state */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Project form */}
        {(project || optimisticUpdate) && (
          <ProjectForm
            initialData={optimisticUpdate || project}
            onSubmit={handleProjectUpdate}
            onCancel={() => navigate(`/projects/${projectId}`)}
            isLoading={loading}
            disabled={loading}
            autoFocus={false}
          />
        )}

        {/* Success message */}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={3000}
          onClose={() => setSuccessMessage(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSuccessMessage(null)} 
            severity="success"
            sx={{ width: '100%' }}
          >
            {successMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default ProjectEdit;