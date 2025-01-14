/**
 * @fileoverview Material Design 3.0 compliant team list component with virtual scrolling,
 * real-time updates, and responsive grid layout. Implements WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Grid, Pagination, CircularProgress, Alert } from '@mui/material'; // ^5.0.0
import { useVirtualizer } from '@tanstack/react-virtual'; // ^3.0.0
import { debounce } from 'lodash'; // ^4.17.21

import TeamCard from './TeamCard';
import { ITeam } from '../../interfaces/team.interface';
import { TeamService } from '../../services/team.service';
import { useTheme } from '../../hooks/useTheme';
import { BaseComponentProps } from '../../types/components.types';
import { BREAKPOINTS } from '../../constants/theme.constants';

// Constants for component configuration
const ITEMS_PER_PAGE = 12;
const GRID_SPACING = 2;
const VIEWPORT_BREAKPOINTS = { xs: 1, sm: 2, md: 3, lg: 4, xl: 6 };
const SCROLL_THRESHOLD = 400;
const UPDATE_DEBOUNCE_MS = 150;

/**
 * Interface for team list error handling
 */
interface TeamError {
  message: string;
  code: string;
}

/**
 * Props interface for TeamList component
 */
interface TeamListProps extends BaseComponentProps {
  teams: ITeam[];
  onTeamSelect: (team: ITeam) => void;
  selectedTeamId?: string;
  loading?: boolean;
  error?: TeamError | null;
  pageSize?: number;
}

/**
 * TeamList component displaying a responsive grid of team cards with virtual scrolling
 * and real-time updates. Implements Material Design 3.0 specifications.
 */
const TeamList: React.FC<TeamListProps> = React.memo(({
  teams,
  onTeamSelect,
  selectedTeamId,
  loading = false,
  error = null,
  pageSize = ITEMS_PER_PAGE,
  className,
  style
}) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [teamService] = useState(() => new TeamService({}));

  // Calculate grid columns based on breakpoint
  const columns = useMemo(() => {
    const width = containerRef.current?.offsetWidth || window.innerWidth;
    for (const [breakpoint, value] of Object.entries(VIEWPORT_BREAKPOINTS)) {
      if (width <= BREAKPOINTS.values[breakpoint as keyof typeof BREAKPOINTS.values]) {
        return value;
      }
    }
    return VIEWPORT_BREAKPOINTS.xl;
  }, [containerRef.current?.offsetWidth]);

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: Math.ceil(teams.length / columns),
    getScrollElement: () => containerRef.current,
    estimateSize: () => 300, // Estimated row height
    overscan: 5
  });

  // Memoized pagination calculations
  const paginatedTeams = useMemo(() => {
    const start = (page - 1) * pageSize;
    return teams.slice(start, start + pageSize);
  }, [teams, page, pageSize]);

  // Handle page changes
  const handlePageChange = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
    virtualizer.scrollToIndex(0);
  }, [virtualizer]);

  // Debounced team update handler
  const handleTeamUpdate = useCallback(debounce((updatedTeam: ITeam) => {
    const index = teams.findIndex(team => team.id === updatedTeam.id);
    if (index !== -1) {
      teams[index] = updatedTeam;
    }
  }, UPDATE_DEBOUNCE_MS), [teams]);

  // Setup real-time updates
  useEffect(() => {
    teams.forEach(team => {
      teamService.subscribeToTeamUpdates(team.id, handleTeamUpdate);
    });

    return () => {
      teams.forEach(team => {
        teamService.unsubscribeFromTeamUpdates(team.id);
      });
    };
  }, [teams, teamService, handleTeamUpdate]);

  // Loading state
  if (loading) {
    return (
      <div
        className="team-list__loading"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400
        }}
      >
        <CircularProgress
          size={48}
          aria-label="Loading teams"
          role="progressbar"
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert
        severity="error"
        variant="filled"
        role="alert"
        style={{ margin: theme.spacing(2) }}
      >
        {error.message}
      </Alert>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...style,
        height: '100%',
        overflow: 'auto',
        contain: 'content'
      }}
      role="grid"
      aria-label="Team list"
    >
      <Grid
        container
        spacing={GRID_SPACING}
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowStart = virtualRow.index * columns;
          const rowTeams = paginatedTeams.slice(rowStart, rowStart + columns);

          return (
            <React.Fragment key={virtualRow.index}>
              {rowTeams.map((team) => (
                <Grid
                  item
                  xs={12 / VIEWPORT_BREAKPOINTS.xs}
                  sm={12 / VIEWPORT_BREAKPOINTS.sm}
                  md={12 / VIEWPORT_BREAKPOINTS.md}
                  lg={12 / VIEWPORT_BREAKPOINTS.lg}
                  xl={12 / VIEWPORT_BREAKPOINTS.xl}
                  key={team.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${100 / columns}%`,
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  <TeamCard
                    team={team}
                    onClick={() => onTeamSelect(team)}
                    selected={team.id === selectedTeamId}
                    aria-selected={team.id === selectedTeamId}
                  />
                </Grid>
              ))}
            </React.Fragment>
          );
        })}
      </Grid>

      {teams.length > pageSize && (
        <Pagination
          count={Math.ceil(teams.length / pageSize)}
          page={page}
          onChange={handlePageChange}
          color="primary"
          size="large"
          style={{
            padding: theme.spacing(3),
            display: 'flex',
            justifyContent: 'center'
          }}
          aria-label="Team list pagination"
        />
      )}
    </div>
  );
});

TeamList.displayName = 'TeamList';

export default TeamList;