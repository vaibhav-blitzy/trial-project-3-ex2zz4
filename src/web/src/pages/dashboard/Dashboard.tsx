/**
 * @fileoverview Material Design 3.0 Dashboard Component
 * Implements real-time task analytics with WebSocket updates and accessibility support
 * @version 1.0.0
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Grid, Container, Skeleton } from '@mui/material'; // ^5.0.0
import MetricsCard from '../../components/dashboard/MetricsCard';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTheme } from '../../hooks/useTheme';
import { TRANSITIONS } from '../../constants/theme.constants';

/**
 * Interface for dashboard metrics with real-time update support
 */
interface DashboardMetrics {
  totalTasks: number;
  completedTasks: number;
  activeProjects: number;
  teamMembers: number;
  tasksTrend: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
  };
  completionRate: number;
  projectProgress: number;
  teamActivity: number;
}

/**
 * Custom hook for managing dashboard metrics state and updates
 */
const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { subscribe, isConnected } = useWebSocket();

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeTask = subscribe<{ type: string; data: Partial<DashboardMetrics> }>(
      'task.update',
      ({ data }) => {
        setMetrics(prev => prev ? { ...prev, ...data } : null);
      }
    );

    return () => {
      unsubscribeTask();
    };
  }, [isConnected, subscribe]);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialMetrics = async () => {
      try {
        // Simulated initial data - replace with actual API call
        const initialMetrics: DashboardMetrics = {
          totalTasks: 150,
          completedTasks: 95,
          activeProjects: 12,
          teamMembers: 25,
          tasksTrend: {
            direction: 'up',
            percentage: 15
          },
          completionRate: 63,
          projectProgress: 78,
          teamActivity: 85
        };

        setMetrics(initialMetrics);
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchInitialMetrics();
  }, []);

  return { metrics, loading, error };
};

/**
 * Dashboard component implementing Material Design 3.0 principles
 * with real-time updates and accessibility support
 */
const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const { metrics, loading, error } = useDashboardMetrics();

  // Memoized completion rate calculation
  const completionRate = useMemo(() => {
    if (!metrics) return 0;
    return (metrics.completedTasks / metrics.totalTasks) * 100;
  }, [metrics]);

  // Loading state renderer
  const renderSkeleton = useCallback(() => (
    <Grid container spacing={3}>
      {[...Array(4)].map((_, index) => (
        <Grid item xs={12} md={6} lg={3} key={index}>
          <Skeleton
            variant="rectangular"
            height={160}
            sx={{ borderRadius: theme.shape.borderRadius }}
          />
        </Grid>
      ))}
    </Grid>
  ), [theme.shape.borderRadius]);

  // Error state renderer
  if (error) {
    return (
      <Container>
        <MetricsCard
          title="Error Loading Dashboard"
          value={0}
          target={100}
          variant="error"
          trend="down"
          ariaLabel="Dashboard error state"
        />
      </Container>
    );
  }

  return (
    <Container
      maxWidth="xl"
      sx={{
        py: 4,
        transition: `all ${TRANSITIONS.duration.standard}ms ${TRANSITIONS.easing.easeInOut}`
      }}
    >
      {loading || !metrics ? (
        renderSkeleton()
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={3}>
            <MetricsCard
              title="Total Tasks"
              value={metrics.totalTasks}
              target={200}
              trend={metrics.tasksTrend.direction}
              variant="primary"
              showProgress
              ariaLabel={`Total tasks: ${metrics.totalTasks}`}
            />
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <MetricsCard
              title="Completion Rate"
              value={completionRate}
              target={100}
              unit="%"
              trend={completionRate >= 75 ? 'up' : completionRate >= 50 ? 'neutral' : 'down'}
              variant={completionRate >= 75 ? 'success' : completionRate >= 50 ? 'warning' : 'error'}
              showProgress
              ariaLabel={`Task completion rate: ${Math.round(completionRate)}%`}
            />
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <MetricsCard
              title="Active Projects"
              value={metrics.activeProjects}
              target={15}
              trend={metrics.activeProjects > 10 ? 'up' : 'neutral'}
              variant="primary"
              showProgress
              ariaLabel={`Active projects: ${metrics.activeProjects}`}
            />
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <MetricsCard
              title="Team Activity"
              value={metrics.teamActivity}
              target={100}
              unit="%"
              trend={metrics.teamActivity >= 80 ? 'up' : metrics.teamActivity >= 60 ? 'neutral' : 'down'}
              variant={metrics.teamActivity >= 80 ? 'success' : 'warning'}
              showProgress
              ariaLabel={`Team activity level: ${metrics.teamActivity}%`}
            />
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default Dashboard;