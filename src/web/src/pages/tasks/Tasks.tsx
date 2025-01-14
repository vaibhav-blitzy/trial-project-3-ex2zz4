import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Box, Tabs, Tab, Typography, Container, Skeleton } from '@mui/material'; // ^5.0.0
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'; // ^6.0.0
import { debounce } from 'lodash'; // ^4.17.21
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0

import TaskList from '../../components/tasks/TaskList';
import TaskBoard from '../../components/tasks/TaskBoard';
import useWebSocket from '../../hooks/useWebSocket';
import { TaskStatus, TaskPriority, ITask } from '../../interfaces/task.interface';

// Lazy loaded components
const TaskFilters = lazy(() => import('../../components/tasks/TaskFilters'));
const CreateTaskDialog = lazy(() => import('../../components/tasks/CreateTaskDialog'));

interface TasksPageProps {
  projectId?: string;
  wsEndpoint: string;
}

interface TaskViewState {
  view: 'list' | 'board';
  filters: {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    assigneeId?: string;
    searchTerm?: string;
  };
  lastUpdate: Date;
}

const Tasks: React.FC<TasksPageProps> = ({ projectId, wsEndpoint }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State management
  const [viewState, setViewState] = useState<TaskViewState>({
    view: (searchParams.get('view') as 'list' | 'board') || 'list',
    filters: {
      status: searchParams.getAll('status') as TaskStatus[],
      priority: searchParams.getAll('priority') as TaskPriority[],
      assigneeId: searchParams.get('assignee') || undefined,
      searchTerm: searchParams.get('search') || undefined
    },
    lastUpdate: new Date()
  });
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket setup for real-time updates
  const { subscribe, isConnected } = useWebSocket(wsEndpoint, {
    autoReconnect: true,
    maxRetries: 5,
    heartbeatInterval: 30000
  });

  // Handle view change with URL sync
  const handleViewChange = useCallback((newView: 'list' | 'board') => {
    setViewState(prev => ({ ...prev, view: newView }));
    setSearchParams(prev => {
      prev.set('view', newView);
      return prev;
    });
  }, [setSearchParams]);

  // Handle filter changes with debouncing
  const handleFilterChange = useCallback(
    debounce((filters: TaskViewState['filters']) => {
      setViewState(prev => ({ ...prev, filters }));
      
      // Update URL params
      setSearchParams(prev => {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            prev.delete(key);
            value.forEach(v => prev.append(key, v));
          } else if (value) {
            prev.set(key, value);
          } else {
            prev.delete(key);
          }
        });
        return prev;
      });
    }, 300),
    [setSearchParams]
  );

  // Handle WebSocket task updates
  const handleTaskUpdate = useCallback((updatedTask: ITask) => {
    setViewState(prev => ({
      ...prev,
      lastUpdate: new Date()
    }));
  }, []);

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe<ITask>('task.update', handleTaskUpdate);
    return () => unsubscribe();
  }, [isConnected, subscribe, handleTaskUpdate]);

  // Error fallback component
  const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
    <Box 
      role="alert" 
      p={3} 
      textAlign="center"
      aria-live="polite"
    >
      <Typography variant="h6" color="error" gutterBottom>
        Something went wrong
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        {error.message}
      </Typography>
      <button onClick={resetErrorBoundary}>Try again</button>
    </Box>
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Container maxWidth="xl">
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Tasks {projectId && '- Project View'}
          </Typography>
          
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Tabs 
              value={viewState.view}
              onChange={(_, newValue) => handleViewChange(newValue)}
              aria-label="Task view options"
            >
              <Tab 
                label="List View" 
                value="list"
                aria-controls="task-list-view"
                id="task-list-tab"
              />
              <Tab 
                label="Board View" 
                value="board"
                aria-controls="task-board-view"
                id="task-board-tab"
              />
            </Tabs>

            <button
              onClick={() => setCreateDialogOpen(true)}
              aria-label="Create new task"
            >
              Create Task
            </button>
          </Box>

          <Suspense fallback={<Skeleton height={100} />}>
            <TaskFilters
              filters={viewState.filters}
              onChange={handleFilterChange}
              projectId={projectId}
            />
          </Suspense>
        </Box>

        <Box role="region" aria-label={`Task ${viewState.view} view`}>
          {loading ? (
            <Box py={4}>
              <Skeleton height={400} />
            </Box>
          ) : error ? (
            <Box 
              role="alert" 
              p={3} 
              textAlign="center"
              aria-live="polite"
            >
              <Typography color="error">{error}</Typography>
            </Box>
          ) : (
            viewState.view === 'list' ? (
              <TaskList
                projectId={projectId}
                status={viewState.filters.status?.[0]}
                priority={viewState.filters.priority?.[0]}
                assigneeId={viewState.filters.assigneeId}
                onTaskSelect={(task) => navigate(`/tasks/${task.id}`)}
                ariaLabel="Task list view"
              />
            ) : (
              <TaskBoard
                projectId={projectId}
                onTaskClick={(taskId) => navigate(`/tasks/${taskId}`)}
                onStatusChange={(taskId, newStatus) => {
                  // Handle status change through API
                }}
                virtualizeThreshold={20}
              />
            )
          )}
        </Box>

        <Suspense fallback={null}>
          <CreateTaskDialog
            open={isCreateDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
            projectId={projectId}
          />
        </Suspense>
      </Container>
    </ErrorBoundary>
  );
};

export default Tasks;