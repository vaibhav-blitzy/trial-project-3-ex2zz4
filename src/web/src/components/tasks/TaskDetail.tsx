import React, { useState, useEffect, useCallback, useRef } from 'react'; // ^18.0.0
import { useParams, useNavigate } from 'react-router-dom'; // ^6.0.0
import {
  Card,
  Typography,
  Button,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Stack,
  Box,
  IconButton,
  Grid
} from '@mui/material'; // ^5.0.0

import { ITask, TaskStatus, TaskPriority } from '../../interfaces/task.interface';
import { useTasks } from '../../hooks/useTasks';
import { useWebSocket } from '../../hooks/useWebSocket';

/**
 * Props interface for TaskDetail component
 */
interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
  onError: (error: Error) => void;
}

/**
 * TaskDetail component for displaying and managing detailed task information
 * Implements real-time updates, optimistic UI, and comprehensive error handling
 */
const TaskDetail: React.FC<TaskDetailProps> = React.memo(({ taskId, onClose, onError }) => {
  // State management
  const [task, setTask] = useState<ITask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Hooks
  const navigate = useNavigate();
  const { updateTask, deleteTask } = useTasks();
  const { subscribe } = useWebSocket();

  // Refs for tracking mounted state and optimistic updates
  const isMounted = useRef(true);
  const optimisticTimeout = useRef<NodeJS.Timeout>();

  // Fetch task data and setup real-time updates
  useEffect(() => {
    const fetchTaskData = async () => {
      try {
        setIsLoading(true);
        const response = await updateTask({ id: taskId });
        if (isMounted.current) {
          setTask(response);
          setError(null);
        }
      } catch (err) {
        if (isMounted.current) {
          setError('Failed to load task details');
          onError(err as Error);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    fetchTaskData();

    // Subscribe to real-time updates
    const unsubscribe = subscribe<ITask>('task.update', (updatedTask) => {
      if (updatedTask.id === taskId && isMounted.current) {
        setTask(updatedTask);
      }
    });

    return () => {
      isMounted.current = false;
      unsubscribe();
      if (optimisticTimeout.current) {
        clearTimeout(optimisticTimeout.current);
      }
    };
  }, [taskId, updateTask, subscribe, onError]);

  /**
   * Handles task status updates with optimistic UI
   */
  const handleStatusChange = useCallback(async (newStatus: TaskStatus) => {
    if (!task) return;

    const originalTask = { ...task };
    
    try {
      // Optimistic update
      setTask(prevTask => prevTask ? { ...prevTask, status: newStatus } : null);
      setIsSaving(true);

      const updatedTask = await updateTask({
        id: task.id,
        updates: { status: newStatus }
      });

      if (isMounted.current) {
        setTask(updatedTask);
        setError(null);
      }
    } catch (err) {
      // Revert optimistic update on error
      if (isMounted.current) {
        setTask(originalTask);
        setError('Failed to update task status');
        onError(err as Error);
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  }, [task, updateTask, onError]);

  /**
   * Handles task priority updates with optimistic UI
   */
  const handlePriorityChange = useCallback(async (newPriority: TaskPriority) => {
    if (!task) return;

    const originalTask = { ...task };
    
    try {
      // Optimistic update
      setTask(prevTask => prevTask ? { ...prevTask, priority: newPriority } : null);
      setIsSaving(true);

      const updatedTask = await updateTask({
        id: task.id,
        updates: { priority: newPriority }
      });

      if (isMounted.current) {
        setTask(updatedTask);
        setError(null);
      }
    } catch (err) {
      // Revert optimistic update on error
      if (isMounted.current) {
        setTask(originalTask);
        setError('Failed to update task priority');
        onError(err as Error);
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  }, [task, updateTask, onError]);

  /**
   * Handles task deletion with confirmation
   */
  const handleDelete = useCallback(async () => {
    if (!task || !window.confirm('Are you sure you want to delete this task?')) return;

    try {
      setIsSaving(true);
      await deleteTask(task.id);
      onClose();
      navigate('/tasks');
    } catch (err) {
      setError('Failed to delete task');
      onError(err as Error);
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  }, [task, deleteTask, onClose, navigate, onError]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" onClose={() => setError(null)}>
        {error}
      </Alert>
    );
  }

  if (!task) {
    return (
      <Alert severity="warning">
        Task not found
      </Alert>
    );
  }

  return (
    <Card elevation={2} sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" component="h2">
            {task.title}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="primary"
              onClick={onClose}
              disabled={isSaving}
            >
              Close
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDelete}
              disabled={isSaving}
            >
              Delete
            </Button>
          </Stack>
        </Box>

        <Divider />

        {/* Status and Priority */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Status
            </Typography>
            <Stack direction="row" spacing={1}>
              {Object.values(TaskStatus).map((status) => (
                <Chip
                  key={status}
                  label={status}
                  color={status === task.status ? 'primary' : 'default'}
                  onClick={() => handleStatusChange(status)}
                  disabled={isSaving}
                />
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Priority
            </Typography>
            <Stack direction="row" spacing={1}>
              {Object.values(TaskPriority).map((priority) => (
                <Chip
                  key={priority}
                  label={priority}
                  color={priority === task.priority ? 'secondary' : 'default'}
                  onClick={() => handlePriorityChange(priority)}
                  disabled={isSaving}
                />
              ))}
            </Stack>
          </Grid>
        </Grid>

        {/* Description */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Description
          </Typography>
          <Typography variant="body1">
            {task.description}
          </Typography>
        </Box>

        {/* Assignees */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Assignees
          </Typography>
          <Stack direction="row" spacing={1}>
            {task.assigneeIds.map((assigneeId) => (
              <Chip
                key={assigneeId}
                avatar={<Avatar>{assigneeId[0]}</Avatar>}
                label={assigneeId}
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>

        {/* Due Date */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Due Date
          </Typography>
          <Typography>
            {new Date(task.dueDate).toLocaleDateString()}
          </Typography>
        </Box>

        {/* Loading Overlay */}
        {isSaving && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bgcolor="rgba(255, 255, 255, 0.7)"
            zIndex={1}
          >
            <CircularProgress />
          </Box>
        )}
      </Stack>
    </Card>
  );
});

TaskDetail.displayName = 'TaskDetail';

export default TaskDetail;