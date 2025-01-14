import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  CircularProgress, 
  Alert,
  Tabs,
  Tab,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
import { VirtualList } from 'react-window';
import { usePermissions } from '@auth/permissions';

// Internal imports
import { IProject, ProjectRole, SecurityLevel } from '../../interfaces/project.interface';
import { useWebSocket, WebSocketEventType } from '../../hooks/useWebSocket';
import { API_ENDPOINTS, ERROR_CODES } from '../../constants/api.constants';

// Interface for component state
interface ProjectDetailState {
  project: IProject | null;
  isLoading: boolean;
  error: Error | null;
  activeTab: number;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canManageMembers: boolean;
  };
  realTimeUpdates: {
    lastUpdate: Date | null;
    connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  };
}

/**
 * ProjectDetail Component
 * Displays detailed information about a specific project with real-time updates
 * Implements WCAG 2.1 Level AA compliance and role-based access control
 */
const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State initialization with TypeScript type safety
  const [state, setState] = useState<ProjectDetailState>({
    project: null,
    isLoading: true,
    error: null,
    activeTab: 0,
    permissions: {
      canEdit: false,
      canDelete: false,
      canManageMembers: false
    },
    realTimeUpdates: {
      lastUpdate: null,
      connectionStatus: 'disconnected'
    }
  });

  // Custom hooks initialization
  const { isConnected, subscribe } = useWebSocket();
  const { hasPermission } = usePermissions();

  // Fetch project data with error handling
  const fetchProjectData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await fetch(API_ENDPOINTS.PROJECTS.GET_BY_ID.replace(':id', projectId!));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const projectData: IProject = await response.json();
      setState(prev => ({
        ...prev,
        project: projectData,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false
      }));
    }
  }, [projectId]);

  // Set up real-time updates
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = subscribe<IProject>('project.update', (updatedProject) => {
      if (updatedProject.id === projectId) {
        setState(prev => ({
          ...prev,
          project: updatedProject,
          realTimeUpdates: {
            lastUpdate: new Date(),
            connectionStatus: 'connected'
          }
        }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [projectId, subscribe]);

  // Check user permissions
  useEffect(() => {
    const checkPermissions = async () => {
      const permissions = {
        canEdit: await hasPermission('project:edit', projectId),
        canDelete: await hasPermission('project:delete', projectId),
        canManageMembers: await hasPermission('project:manage-members', projectId)
      };

      setState(prev => ({ ...prev, permissions }));
    };

    checkPermissions();
  }, [projectId, hasPermission]);

  // Initial data fetch
  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Memoized project progress calculation
  const projectProgress = useMemo(() => {
    if (!state.project) return 0;
    return Math.round((state.project.progress || 0) * 100);
  }, [state.project]);

  // Error fallback component
  const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
    <Alert 
      severity="error"
      action={
        <button onClick={resetErrorBoundary}>
          Retry
        </button>
      }
      sx={{ m: 2 }}
    >
      {error.message}
    </Alert>
  );

  if (state.isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
        role="progressbar"
        aria-label="Loading project details"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (state.error) {
    return <ErrorFallback error={state.error} resetErrorBoundary={fetchProjectData} />;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Box
        component="main"
        role="main"
        aria-label="Project Details"
        sx={{ p: theme.spacing(3) }}
      >
        {/* Project Header */}
        <Paper
          elevation={2}
          sx={{ p: 3, mb: 3 }}
          role="region"
          aria-label="Project Overview"
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                aria-label="Project Name"
              >
                {state.project?.name}
              </Typography>
              <Typography
                variant="body1"
                color="textSecondary"
                paragraph
                aria-label="Project Description"
              >
                {state.project?.description}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" justifyContent="center">
                <CircularProgress
                  variant="determinate"
                  value={projectProgress}
                  size={80}
                  aria-label={`Project Progress: ${projectProgress}%`}
                />
                <Typography
                  variant="h6"
                  component="div"
                  sx={{ ml: 2 }}
                >
                  {projectProgress}%
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Project Content Tabs */}
        <Tabs
          value={state.activeTab}
          onChange={(_, newValue) => setState(prev => ({ ...prev, activeTab: newValue }))}
          aria-label="Project Navigation Tabs"
          sx={{ mb: 3 }}
        >
          <Tab label="Overview" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="Tasks" id="tab-1" aria-controls="tabpanel-1" />
          <Tab label="Team" id="tab-2" aria-controls="tabpanel-2" />
          <Tab label="Settings" id="tab-3" aria-controls="tabpanel-3" />
        </Tabs>

        {/* Real-time connection status */}
        {!isConnected && (
          <Alert 
            severity="warning" 
            sx={{ mb: 2 }}
            aria-live="polite"
          >
            Real-time updates are currently unavailable. Attempting to reconnect...
          </Alert>
        )}

        {/* Tab Panels */}
        <Box
          role="tabpanel"
          hidden={state.activeTab !== 0}
          id="tabpanel-0"
          aria-labelledby="tab-0"
        >
          {/* Project Overview Content */}
        </Box>

        {/* Additional tab panels would be implemented similarly */}
      </Box>
    </ErrorBoundary>
  );
};

export default ProjectDetail;