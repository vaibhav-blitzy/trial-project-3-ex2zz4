import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { CircularProgress, Box, Typography, useTheme, useMediaQuery } from '@mui/material'; // ^5.0.0
import { useVirtualizer } from '@tanstack/react-virtual'; // ^3.0.0

import TaskCard from './TaskCard';
import { ITask, TaskStatus, TaskPriority, TaskFilter } from '../../interfaces/task.interface';
import { TaskService } from '../../services/task.service';

/**
 * Props interface for TaskList component with enhanced accessibility and filtering
 */
interface TaskListProps {
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  onTaskSelect: (task: ITask) => void;
  pageSize?: number;
  ariaLabel: string;
  virtualScrollHeight?: number;
}

/**
 * TaskList Component
 * A virtualized list of tasks with real-time updates, filtering, and accessibility features
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 */
const TaskList: React.FC<TaskListProps> = React.memo(({
  projectId,
  status,
  priority,
  assigneeId,
  onTaskSelect,
  pageSize = 10,
  ariaLabel,
  virtualScrollHeight = 600
}) => {
  // State management
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // Refs
  const parentRef = useRef<HTMLDivElement>(null);
  const taskCache = useRef(new Map<string, ITask>());

  // Hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Virtual list configuration
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => 100, []), // Estimated row height
    overscan: 5
  });

  // Memoized filter object
  const filter = useMemo((): TaskFilter => ({
    projectId,
    status: status ? [status] : undefined,
    priority: priority ? [priority] : undefined,
    assigneeIds: assigneeId ? [assigneeId] : undefined
  }), [projectId, status, priority, assigneeId]);

  /**
   * Fetches tasks with debouncing and caching
   */
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const taskService = new TaskService();
      const fetchedTasks = await taskService.getTasks(filter);
      setTasks(fetchedTasks);
      
      // Update cache
      fetchedTasks.forEach(task => {
        taskCache.current.set(task.id, task);
      });
      
      setError(null);
    } catch (err) {
      setError('Failed to load tasks. Please try again.');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  /**
   * Handles task selection with keyboard support
   */
  const handleTaskClick = useCallback((task: ITask, event?: React.KeyboardEvent | React.MouseEvent) => {
    if (event && 'key' in event && event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    onTaskSelect(task);
  }, [onTaskSelect]);

  /**
   * Sets up real-time task updates subscription
   */
  useEffect(() => {
    const taskService = new TaskService();
    const subscription = taskService.getTaskUpdates().subscribe(updatedTask => {
      setTasks(currentTasks => {
        const taskIndex = currentTasks.findIndex(t => t.id === updatedTask.id);
        if (taskIndex === -1) return currentTasks;

        const newTasks = [...currentTasks];
        newTasks[taskIndex] = updatedTask;
        return newTasks;
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch tasks on filter change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Loading state
  if (loading && !tasks.length) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height={200}
        role="progressbar"
        aria-label="Loading tasks"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box 
        role="alert" 
        aria-live="polite" 
        p={2} 
        color="error.main"
      >
        <Typography variant="body1">{error}</Typography>
      </Box>
    );
  }

  // Empty state
  if (!tasks.length) {
    return (
      <Box 
        role="status" 
        aria-label="No tasks found" 
        p={2}
      >
        <Typography variant="body1" align="center">
          No tasks available
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={parentRef}
      height={virtualScrollHeight}
      overflow="auto"
      role="list"
      aria-label={ariaLabel}
      sx={{
        scrollBehavior: 'smooth',
        '&:focus': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2
        }
      }}
    >
      <Box
        height={`${rowVirtualizer.getTotalSize()}px`}
        width="100%"
        position="relative"
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const task = tasks[virtualRow.index];
          return (
            <Box
              key={task.id}
              position="absolute"
              top={0}
              left={0}
              width="100%"
              height={virtualRow.size}
              transform={`translateY(${virtualRow.start}px)`}
              p={1}
            >
              <TaskCard
                task={task}
                onClick={(event) => handleTaskClick(task, event)}
                showAssignees={!isMobile}
                maxAssignees={3}
                ariaLabel={`Task: ${task.title}`}
                tabIndex={0}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
});

TaskList.displayName = 'TaskList';

export default TaskList;