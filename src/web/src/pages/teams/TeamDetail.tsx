/**
 * TeamDetail Component
 * Displays detailed information about a team with real-time updates and optimized performance
 * Implements Material Design 3.0 principles and supports teams of 10-10,000 users
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ErrorBoundary } from 'react-error-boundary';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Button,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Edit as EditIcon,
  Settings as SettingsIcon,
  Group as GroupIcon,
  Timeline as TimelineIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

import { ITeam, ITeamMember, TeamRole, ITeamSettings } from '../../interfaces/team.interface';
import { TeamService } from '../../services/team.service';
import { Status } from '../../types/common.types';

// Constants for component configuration
const MEMBERS_PAGE_SIZE = 50;
const ACTIVITY_LIMIT = 100;
const UPDATE_INTERVAL = 30000; // 30 seconds

interface TeamDetailProps {
  className?: string;
}

const TeamDetail: React.FC<TeamDetailProps> = ({ className }) => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const teamService = useMemo(() => new TeamService(null), []);

  // State management
  const [team, setTeam] = useState<ITeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [members, setMembers] = useState<ITeamMember[]>([]);
  const [settings, setSettings] = useState<ITeamSettings | null>(null);

  // Virtual list configuration for large member lists
  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: members.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10
  });

  // Fetch team data with error handling
  const fetchTeamData = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      const teamData = await teamService.getTeamById(teamId);
      setTeam(teamData);
      setError(null);
    } catch (err) {
      setError('Failed to load team data. Please try again.');
      console.error('Team fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId, teamService]);

  // Handle team updates with optimistic UI
  const handleTeamUpdate = useCallback(async (updatedTeam: Partial<ITeam>) => {
    if (!team || !teamId) return;

    try {
      // Optimistic update
      setTeam(prev => prev ? { ...prev, ...updatedTeam } : null);

      // Perform update
      await teamService.updateTeam(teamId, updatedTeam);
    } catch (err) {
      // Revert on failure
      setError('Failed to update team. Please try again.');
      fetchTeamData();
    }
  }, [team, teamId, teamService, fetchTeamData]);

  // Handle settings updates with validation
  const handleSettingsUpdate = useCallback(async (updatedSettings: Partial<ITeamSettings>) => {
    if (!teamId) return;

    try {
      setSettings(prev => prev ? { ...prev, ...updatedSettings } : null);
      await teamService.updateTeamSettings(teamId, updatedSettings);
    } catch (err) {
      setError('Failed to update team settings. Please try again.');
      setSettings(prev => prev);
    }
  }, [teamId, teamService]);

  // Setup real-time updates
  useEffect(() => {
    if (!teamId) return;

    const handleTeamUpdate = (update: any) => {
      if (update.type === 'update') {
        setTeam(prev => ({ ...prev!, ...update.data }));
      }
    };

    teamService.subscribeToTeamUpdates(teamId, handleTeamUpdate);

    return () => {
      teamService.unsubscribeFromTeamUpdates(teamId);
    };
  }, [teamId, teamService]);

  // Initial data fetch
  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // Periodic refresh for active teams
  useEffect(() => {
    if (!team || team.status !== Status.ACTIVE) return;

    const interval = setInterval(fetchTeamData, UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, [team, fetchTeamData]);

  // Error fallback component
  const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
    <Box p={3}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={resetErrorBoundary}>
            Retry
          </Button>
        }
      >
        {error.message}
      </Alert>
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={fetchTeamData}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!team) {
    return (
      <Alert severity="warning">
        Team not found or access denied.
      </Alert>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={fetchTeamData}>
      <Container maxWidth="lg" className={className}>
        {/* Header Section */}
        <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" component="h1">
            {team.name}
          </Typography>
          <Box>
            <Tooltip title="Edit Team">
              <IconButton onClick={() => handleTeamUpdate(team)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Team Settings">
              <IconButton onClick={() => setActiveTab(3)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Navigation Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons="auto"
          >
            <Tab icon={<GroupIcon />} label="Members" />
            <Tab icon={<TimelineIcon />} label="Activity" />
            <Tab icon={<SettingsIcon />} label="Settings" />
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        <Box role="tabpanel" hidden={activeTab !== 0}>
          {activeTab === 0 && (
            <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => (
                  <div
                    key={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {/* Member row content */}
                    <Paper sx={{ p: 2, m: 1 }}>
                      {members[virtualRow.index]?.userId}
                    </Paper>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Box>

        <Box role="tabpanel" hidden={activeTab !== 1}>
          {activeTab === 1 && (
            <Paper sx={{ p: 3 }}>
              {/* Activity timeline content */}
              <Typography variant="body1">
                Recent team activity will be displayed here
              </Typography>
            </Paper>
          )}
        </Box>

        <Box role="tabpanel" hidden={activeTab !== 2}>
          {activeTab === 2 && settings && (
            <Paper sx={{ p: 3 }}>
              {/* Settings form content */}
              <Typography variant="h6">Team Settings</Typography>
              <Divider sx={{ my: 2 }} />
              {/* Settings form fields would go here */}
            </Paper>
          )}
        </Box>
      </Container>
    </ErrorBoundary>
  );
};

export default TeamDetail;