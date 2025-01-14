import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  CircularProgress,
  Skeleton,
  Alert,
  Typography,
  Paper,
  Grid,
  Divider,
  Chip,
  IconButton,
  TextField,
  Button
} from '@mui/material';
import { 
  ITask, 
  TaskStatus, 
  TaskPriority, 
  ITaskUpdate 
} from '../../interfaces/task.interface';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTaskStore } from '@store/task';
import { formatDate, debounce } from '../../utils/helpers';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import TaskStatusSelect from '../../components/TaskStatusSelect';
import TaskPrioritySelect from '../../components/TaskPrioritySelect';
import TaskAssignees from '../../components/TaskAssignees';
import TaskComments from '../../components/TaskComments';
import TaskAttachments from '../../components/TaskAttachments';
import TaskActivity from '../../components/TaskActivity';

/**
 * Custom hook for managing task data with real-time updates
 * @param taskId - Task identifier
 */
const useTaskData = (taskId: string) => {
  const [task, setTask] = useState<ITask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { getTask, updateTask } = useTaskStore();
  const { subscribe } = useWebSocket();

  // Fetch initial task data
  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true);
        const taskData = await getTask(taskId);
        setTask(taskData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, getTask]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!taskId) return;

    const unsubscribe = subscribe<ITaskUpdate>('task.update', (update) => {
      if (update.taskId === taskId) {
        setTask((prevTask) => ({
          ...prevTask!,
          ...update.changes
        }));
      }
    });

    return () => unsubscribe();
  }, [taskId, subscribe]);

  // Optimistic update handler
  const handleUpdate = useCallback(async (updates: Partial<ITask>) => {
    if (!task) return;

    // Optimistic update
    const previousTask = { ...task };
    setTask((prevTask) => ({
      ...prevTask!,
      ...updates
    }));

    try {
      await updateTask(taskId, updates);
    } catch (err) {
      // Revert on error
      setTask(previousTask);
      setError(err as Error);
    }
  }, [task, taskId, updateTask]);

  return { task, loading, error, handleUpdate };
};

/**
 * Task Detail Page Component
 * Displays comprehensive task information with real-time updates
 */
const TaskDetailPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { task, loading, error, handleUpdate } = useTaskData(taskId!);

  // Debounced update handlers
  const debouncedTitleUpdate = useMemo(
    () => debounce((title: string) => handleUpdate({ title }), 500),
    [handleUpdate]
  );

  const debouncedDescriptionUpdate = useMemo(
    () => debounce((description: string) => handleUpdate({ description }), 500),
    [handleUpdate]
  );

  if (loading) {
    return (
      <Container>
        <Box sx={{ py: 4 }}>
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="text" sx={{ mt: 2 }} />
          <Skeleton variant="text" />
          <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert 
          severity="error" 
          sx={{ mt: 4 }}
          action={
            <Button color="inherit" onClick={() => navigate('/tasks')}>
              Back to Tasks
            </Button>
          }
        >
          {error.message}
        </Alert>
      </Container>
    );
  }

  if (!task) {
    return (
      <Container>
        <Alert severity="warning" sx={{ mt: 4 }}>
          Task not found
        </Alert>
      </Container>
    );
  }

  return (
    <ErrorBoundary>
      <Container>
        <Box sx={{ py: 4 }}>
          <Paper elevation={0} sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Task Header */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  variant="standard"
                  defaultValue={task.title}
                  onChange={(e) => debouncedTitleUpdate(e.target.value)}
                  inputProps={{
                    'aria-label': 'Task title',
                    style: { fontSize: '1.5rem', fontWeight: 500 }
                  }}
                />
              </Grid>

              {/* Task Status and Priority */}
              <Grid item xs={12} sm={6}>
                <TaskStatusSelect
                  value={task.status}
                  onChange={(status) => handleUpdate({ status })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TaskPrioritySelect
                  value={task.priority}
                  onChange={(priority) => handleUpdate({ priority })}
                />
              </Grid>

              {/* Task Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  defaultValue={task.description}
                  onChange={(e) => debouncedDescriptionUpdate(e.target.value)}
                  placeholder="Add task description..."
                  aria-label="Task description"
                />
              </Grid>

              {/* Task Metadata */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`Due: ${formatDate(task.dueDate)}`}
                    color={new Date(task.dueDate) < new Date() ? 'error' : 'default'}
                  />
                  <Chip label={`Project: ${task.projectId}`} />
                  {task.tags.map((tag) => (
                    <Chip key={tag} label={tag} onDelete={() => {
                      handleUpdate({ tags: task.tags.filter(t => t !== tag) });
                    }} />
                  ))}
                </Box>
              </Grid>

              {/* Task Assignees */}
              <Grid item xs={12}>
                <TaskAssignees
                  assigneeIds={task.assigneeIds}
                  onAssigneesChange={(assigneeIds) => handleUpdate({ assigneeIds })}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Task Attachments */}
              <Grid item xs={12}>
                <TaskAttachments
                  taskId={task.id}
                  attachmentIds={task.attachmentIds}
                  onAttachmentsChange={(attachmentIds) => handleUpdate({ attachmentIds })}
                />
              </Grid>

              {/* Task Comments */}
              <Grid item xs={12}>
                <TaskComments taskId={task.id} />
              </Grid>

              {/* Task Activity */}
              <Grid item xs={12}>
                <TaskActivity taskId={task.id} />
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Container>
    </ErrorBoundary>
  );
};

export default TaskDetailPage;