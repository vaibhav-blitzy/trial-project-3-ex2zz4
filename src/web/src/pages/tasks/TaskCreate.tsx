/**
 * @fileoverview Task Creation Page Component
 * Implements Material Design 3.0 principles with WCAG 2.1 Level AA compliance
 * Provides comprehensive task creation with real-time validation and accessibility
 * @version 1.0.0
 */

import React, { useCallback, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Paper, Typography, Alert, CircularProgress } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';

import TaskForm from '../../components/tasks/TaskForm';
import { createTask } from '../../store/tasks/tasks.actions';
import { COLORS, SPACING } from '../../constants/theme.constants';
import { ITask } from '../../interfaces/task.interface';

// Styled container for consistent layout
const StyledContainer = {
  paddingTop: SPACING.scale[6],
  paddingBottom: SPACING.scale[6],
  maxWidth: '800px',
  margin: '0 auto'
};

// Styled paper component for form container
const StyledPaper = {
  padding: SPACING.scale[4],
  backgroundColor: COLORS.light.background.paper,
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

/**
 * Task creation page component with comprehensive validation and accessibility
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 */
const TaskCreate: React.FC = React.memo(() => {
  // Redux hooks
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Local state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get project ID from location state if available
  const projectId = location.state?.projectId;

  /**
   * Handles task creation with validation and error handling
   * @param taskData Form data for task creation
   */
  const handleTaskCreate = useCallback(async (taskData: Omit<ITask, 'id'>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Dispatch task creation action
      const result = await dispatch(createTask({
        ...taskData,
        projectId: projectId || taskData.projectId
      })).unwrap();

      // Show success message using screen reader
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = 'Task created successfully';
      document.body.appendChild(announcement);
      
      // Navigate to task detail page
      navigate(`/tasks/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      
      // Announce error to screen readers
      const errorAnnouncement = document.createElement('div');
      errorAnnouncement.setAttribute('role', 'alert');
      errorAnnouncement.textContent = error || 'An error occurred';
      document.body.appendChild(errorAnnouncement);
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, navigate, projectId]);

  /**
   * Handles cancellation of task creation
   */
  const handleCancel = useCallback(() => {
    // Navigate back to previous page or tasks list
    navigate(-1);
  }, [navigate]);

  // Clean up announcements on unmount
  useEffect(() => {
    return () => {
      document.querySelectorAll('[role="status"], [role="alert"]').forEach(el => {
        el.remove();
      });
    };
  }, []);

  return (
    <ErrorBoundary
      fallback={
        <Container>
          <Alert severity="error" sx={{ mt: 2 }}>
            An error occurred while loading the task creation form.
          </Alert>
        </Container>
      }
      onError={(error) => {
        console.error('Task creation error:', error);
      }}
    >
      <Container sx={StyledContainer}>
        <Paper sx={StyledPaper} elevation={0}>
          {/* Accessible heading */}
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: '2rem',
              fontWeight: 500,
              marginBottom: SPACING.scale[4],
              color: COLORS.light.text.primary
            }}
            tabIndex={0}
          >
            Create New Task
          </Typography>

          {/* Error message with ARIA alert */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ marginBottom: SPACING.scale[4] }}
              role="alert"
            >
              {error}
            </Alert>
          )}

          {/* Loading indicator with ARIA label */}
          {isSubmitting && (
            <CircularProgress
              size={24}
              sx={{ marginBottom: SPACING.scale[4] }}
              aria-label="Creating task..."
            />
          )}

          {/* Task creation form with accessibility support */}
          <TaskForm
            onSubmit={handleTaskCreate}
            onCancel={handleCancel}
            loading={isSubmitting}
            initialData={{
              projectId: projectId || '',
              priority: 'MEDIUM',
              status: 'TODO'
            }}
          />
        </Paper>
      </Container>
    </ErrorBoundary>
  );
});

TaskCreate.displayName = 'TaskCreate';

export default TaskCreate;