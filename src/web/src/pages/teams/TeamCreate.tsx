/**
 * @fileoverview Team Creation Page Component
 * Implements Material Design 3.0 with enhanced real-time collaboration,
 * accessibility features, and comprehensive error handling
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ^6.0.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import { Container, Paper, Typography, Alert, Snackbar } from '@mui/material'; // ^5.0.0
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0

import TeamForm from '../../components/teams/TeamForm';
import { TeamService } from '../../services/team.service';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTheme } from '../../hooks/useTheme';
import { ITeam } from '../../interfaces/team.interface';
import { COLORS, SPACING, TRANSITIONS } from '../../constants/theme.constants';

// Styled components with Material Design 3.0 principles
const StyledContainer = styled(Container)(({ theme }) => ({
  padding: SPACING.scale[6],
  marginTop: SPACING.scale[8],
  marginBottom: SPACING.scale[8],
  '@media (max-width: 768px)': {
    padding: SPACING.scale[4],
    marginTop: SPACING.scale[4],
  },
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: SPACING.scale[6],
  backgroundColor: theme.palette.mode === 'dark' 
    ? COLORS.dark.background.paper 
    : COLORS.light.background.paper,
  borderRadius: '8px',
  transition: `all ${TRANSITIONS.duration.standard} ${TRANSITIONS.easing.easeInOut}`,
  boxShadow: theme.shadows[2],
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}));

const ErrorFallback = styled('div')(({ theme }) => ({
  padding: SPACING.scale[4],
  color: theme.palette.error.main,
  backgroundColor: theme.palette.error.light,
  borderRadius: '4px',
  marginBottom: SPACING.scale[4],
}));

/**
 * Team creation page component with real-time collaboration
 * and accessibility features
 */
const TeamCreate: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Initialize WebSocket for real-time collaboration
  const { subscribe, disconnect } = useWebSocket();

  // Subscribe to real-time team updates
  useEffect(() => {
    const unsubscribe = subscribe<ITeam>('team.update', (updatedTeam) => {
      setNotification(`Team "${updatedTeam.name}" has been updated`);
    });

    return () => {
      unsubscribe();
      disconnect();
    };
  }, [subscribe, disconnect]);

  /**
   * Handles team creation with retry logic and real-time updates
   * @param teamData - Team creation data
   */
  const handleSubmit = useCallback(async (teamData: ITeam) => {
    setIsLoading(true);
    setError(null);

    try {
      const createdTeam = await TeamService.createTeam(teamData);
      
      // Show success notification
      setNotification(`Team "${createdTeam.name}" created successfully`);
      
      // Navigate to team detail page after short delay
      setTimeout(() => {
        navigate(`/teams/${createdTeam.id}`);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to create team. Please try again.';
      
      setError(errorMessage);
      
      // Log error for monitoring
      console.error('Team creation error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  /**
   * Handles cancellation and navigation
   */
  const handleCancel = useCallback(() => {
    navigate('/teams');
  }, [navigate]);

  return (
    <ErrorBoundary
      FallbackComponent={({ error }) => (
        <ErrorFallback role="alert">
          <Typography variant="h6">Error Creating Team</Typography>
          <Typography>{error.message}</Typography>
        </ErrorFallback>
      )}
    >
      <StyledContainer maxWidth="md">
        <StyledPaper elevation={0}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ mb: 4 }}
          >
            Create New Team
          </Typography>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <TeamForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
            theme={theme.palette.mode}
          />
        </StyledPaper>

        <Snackbar
          open={!!notification}
          autoHideDuration={6000}
          onClose={() => setNotification(null)}
          message={notification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </StyledContainer>
    </ErrorBoundary>
  );
});

TeamCreate.displayName = 'TeamCreate';

export default TeamCreate;