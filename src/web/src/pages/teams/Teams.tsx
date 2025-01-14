/**
 * Teams Page Component
 * Implements team management capabilities with Material Design 3.0 principles,
 * real-time updates, and performance optimizations for large team lists.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0

import TeamList from '../../components/teams/TeamList';
import Loading from '../../components/common/Loading';
import { TeamService } from '../../services/team.service';
import { ITeam } from '../../interfaces/team.interface';
import { useTheme as useAppTheme } from '../../hooks/useTheme';
import { BREAKPOINTS } from '../../constants/theme.constants';

/**
 * Props interface for Teams page component
 */
interface TeamsPageProps {
  className?: string;
  onError?: (error: Error) => void;
}

/**
 * State interface for teams data
 */
interface TeamState {
  teams: ITeam[];
  loading: boolean;
  error: Error | null;
  selectedTeamId: string | null;
}

/**
 * Teams page component with real-time updates and performance optimizations
 */
const Teams: React.FC<TeamsPageProps> = React.memo(({ className, onError }) => {
  // Hooks initialization
  const navigate = useNavigate();
  const { theme: appTheme } = useAppTheme();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State management
  const [state, setState] = useState<TeamState>({
    teams: [],
    loading: true,
    error: null,
    selectedTeamId: null
  });

  // Service initialization with memoization
  const teamService = useMemo(() => new TeamService({}), []);

  /**
   * Handles team selection with navigation
   */
  const handleTeamSelect = useCallback((team: ITeam) => {
    setState(prev => ({ ...prev, selectedTeamId: team.id }));
    navigate(`/teams/${team.id}`);
  }, [navigate]);

  /**
   * Handles real-time team updates
   */
  const handleTeamUpdate = useCallback((updatedTeam: ITeam) => {
    setState(prev => ({
      ...prev,
      teams: prev.teams.map(team => 
        team.id === updatedTeam.id ? updatedTeam : team
      )
    }));
  }, []);

  /**
   * Fetches initial team data
   */
  const fetchTeams = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const teams = await teamService.getTeams();
      setState(prev => ({ 
        ...prev, 
        teams,
        loading: false,
        error: null
      }));
    } catch (error) {
      const err = error as Error;
      setState(prev => ({ 
        ...prev, 
        loading: false,
        error: err
      }));
      onError?.(err);
    }
  }, [teamService, onError]);

  /**
   * Sets up real-time subscriptions and initial data fetch
   */
  useEffect(() => {
    fetchTeams();

    return () => {
      // Cleanup subscriptions
      state.teams.forEach(team => {
        teamService.unsubscribeFromTeamUpdates(team.id);
      });
    };
  }, [fetchTeams, teamService]);

  /**
   * Sets up team update subscriptions when teams change
   */
  useEffect(() => {
    state.teams.forEach(team => {
      teamService.subscribeToTeamUpdates(team.id, handleTeamUpdate);
    });
  }, [state.teams, teamService, handleTeamUpdate]);

  /**
   * Error fallback component
   */
  const ErrorFallback = useCallback(({ error, resetErrorBoundary }: any) => (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="50vh"
      p={3}
    >
      <Typography variant="h6" color="error" gutterBottom>
        Error loading teams
      </Typography>
      <Typography variant="body2" color="textSecondary" align="center" mb={2}>
        {error.message}
      </Typography>
      <button onClick={resetErrorBoundary}>
        Try again
      </button>
    </Box>
  ), []);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={fetchTeams}
    >
      <Container
        maxWidth="xl"
        className={className}
        sx={{
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 2, sm: 3, md: 4 },
          minHeight: '100vh',
          backgroundColor: appTheme.palette.background.default
        }}
      >
        <Box mb={4}>
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            component="h1"
            color="textPrimary"
            gutterBottom
          >
            Teams
          </Typography>
          <Typography
            variant="body1"
            color="textSecondary"
            sx={{ maxWidth: 600 }}
          >
            Manage your teams and collaborate with team members in real-time
          </Typography>
        </Box>

        {state.loading ? (
          <Loading
            size="large"
            variant="circular"
            color="primary"
            label="Loading teams..."
            overlay={{
              blur: true,
              opacity: 0.8
            }}
          />
        ) : (
          <TeamList
            teams={state.teams}
            onTeamSelect={handleTeamSelect}
            selectedTeamId={state.selectedTeamId}
            error={state.error}
            loading={state.loading}
          />
        )}
      </Container>
    </ErrorBoundary>
  );
});

Teams.displayName = 'Teams';

export default Teams;