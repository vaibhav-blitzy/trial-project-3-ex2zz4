/**
 * Task Edit Page Component
 * Provides comprehensive task editing interface with real-time collaboration,
 * accessibility features, and error handling.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  Snackbar 
} from '@mui/material';

import TaskForm from '../../components/tasks/TaskForm';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTasks } from '../../hooks/useTasks';
import { ITask } from '../../interfaces/task.interface';
import { COLORS, SPACING } from '../../constants/theme.constants';

interface TaskEditState {
  task: ITask | null;
  loading: boolean;
  saving: boolean;
  activeEditors: string[];
  error: Error | null;
}

/**
 * Task Edit page component with real-time collaboration support
 */
const TaskEdit: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { updateTask } = useTasks();
  const { subscribe } = useWebSocket();

  // Component state
  const [state, setState] = useState<TaskEditState>({
    task: null,
    loading: true,
    saving: false,
    activeEditors: [],
    error: null
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Fetch task data on mount
  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}`);
        const data = await response.json();
        setState(prev => ({ ...prev, task: data, loading: false }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error as Error, 
          loading: false 
        }));
      }
    };

    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  // Handle real-time collaboration
  useEffect(() => {
    if (!taskId) return;

    const unsubscribePresence = subscribe<{ userId: string; active: boolean }>(
      'user.presence',
      ({ userId, active }) => {
        setState(prev => ({
          ...prev,
          activeEditors: active
            ? [...prev.activeEditors, userId]
            : prev.activeEditors.filter(id => id !== userId)
        }));
      }
    );

    const unsubscribeUpdates = subscribe<ITask>(
      'task.update',
      (updatedTask) => {
        if (updatedTask.id === taskId) {
          setState(prev => ({ ...prev, task: updatedTask }));
          setSnackbar({
            open: true,
            message: 'Task was updated by another user',
            severity: 'info'
          });
        }
      }
    );

    return () => {
      unsubscribePresence();
      unsubscribeUpdates();
    };
  }, [taskId, subscribe]);

  // Handle task update
  const handleTaskUpdate = useCallback(async (updatedTask: ITask) => {
    setState(prev => ({ ...prev, saving: true }));

    try {
      // Optimistic update
      setState(prev => ({ ...prev, task: updatedTask }));

      // Broadcast update intention
      const wsMessage = {
        type: 'task.updating',
        payload: { taskId, userId: 'current-user' }
      };
      // WebSocket send implementation here

      // Perform update
      await updateTask({ id: taskId!, updates: updatedTask });

      setSnackbar({
        open: true,
        message: 'Task updated successfully',
        severity: 'success'
      });

      // Navigate back after successful update
      navigate(`/tasks/${taskId}`);
    } catch (error) {
      // Revert optimistic update
      setState(prev => ({ 
        ...prev, 
        error: error as Error,
        task: prev.task // Revert to previous state
      }));

      setSnackbar({
        open: true,
        message: 'Failed to update task',
        severity: 'error'
      });
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  }, [taskId, updateTask, navigate]);

  // Handle form cancellation
  const handleCancel = useCallback(() => {
    navigate(`/tasks/${taskId}`);
  }, [taskId, navigate]);

  // Memoized active editors list
  const activeEditorsList = useMemo(() => {
    if (state.activeEditors.length === 0) return null;

    return (
      <Box sx={{ mb: SPACING.scale[3] }}>
        <Typography variant="subtitle2" color="textSecondary">
          {state.activeEditors.length} active editor(s)
        </Typography>
      </Box>
    );
  }, [state.activeEditors]);

  // Handle snackbar close
  const handleSnackbarClose = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  if (state.loading) {
    return (
      <Container sx={{ py: SPACING.scale[4] }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress aria-label="Loading task data" />
        </Box>
      </Container>
    );
  }

  if (state.error) {
    return (
      <Container sx={{ py: SPACING.scale[4] }}>
        <Alert 
          severity="error"
          aria-live="polite"
          sx={{ mb: SPACING.scale[3] }}
        >
          {state.error.message}
        </Alert>
      </Container>
    );
  }

  if (!state.task) {
    return (
      <Container sx={{ py: SPACING.scale[4] }}>
        <Alert 
          severity="error"
          aria-live="polite"
        >
          Task not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container 
      sx={{ py: SPACING.scale[4] }}
      role="main"
      aria-label="Edit Task"
    >
      <Typography 
        variant="h4" 
        component="h1"
        sx={{ mb: SPACING.scale[4] }}
      >
        Edit Task
      </Typography>

      {activeEditorsList}

      <TaskForm
        initialData={state.task}
        onSubmit={handleTaskUpdate}
        onCancel={handleCancel}
        disabled={state.saving}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          elevation={6}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TaskEdit;