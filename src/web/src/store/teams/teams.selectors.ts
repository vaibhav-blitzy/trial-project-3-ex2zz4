/**
 * Teams Redux Selectors
 * Implements memoized selectors for accessing and computing derived team state data
 * with performance optimization, error handling, and type safety.
 * @version 1.0.0
 */

import { createSelector } from '@reduxjs/toolkit'; // ^1.9.0
import { RootState } from '../index';
import { ITeam } from '../../interfaces/team.interface';

/**
 * Base selector to get the teams slice from root state
 * Implements type-safe state access with error handling
 */
export const selectTeamsState = (state: RootState) => {
  if (!state.teams) {
    console.error('Teams state is not initialized');
    return {
      teams: [],
      selectedTeam: null,
      loading: false,
      error: 'Teams state not initialized',
      filters: {},
      metadata: {
        totalCount: 0,
        activeCount: 0,
        lastUpdated: null
      }
    };
  }
  return state.teams;
};

/**
 * Memoized selector to get array of all teams
 * Optimizes performance through result caching
 */
export const selectAllTeams = createSelector(
  [selectTeamsState],
  (teamsState) => {
    try {
      return teamsState.teams;
    } catch (error) {
      console.error('Error selecting teams:', error);
      return [];
    }
  }
);

/**
 * Memoized selector to get currently selected team
 * Implements null safety and error handling
 */
export const selectSelectedTeam = createSelector(
  [selectTeamsState],
  (teamsState) => {
    try {
      return teamsState.selectedTeam;
    } catch (error) {
      console.error('Error selecting current team:', error);
      return null;
    }
  }
);

/**
 * Memoized selector factory to get team by ID
 * Creates reusable selector with proper dependency tracking
 */
export const selectTeamById = (teamId: string) => 
  createSelector(
    [selectAllTeams],
    (teams) => {
      try {
        return teams.find(team => team.id === teamId);
      } catch (error) {
        console.error(`Error selecting team by ID ${teamId}:`, error);
        return undefined;
      }
    }
  );

/**
 * Memoized selector to get teams loading state
 * Provides type-safe access to loading indicator
 */
export const selectTeamLoading = createSelector(
  [selectTeamsState],
  (teamsState) => {
    try {
      return teamsState.loading;
    } catch (error) {
      console.error('Error selecting teams loading state:', error);
      return false;
    }
  }
);

/**
 * Memoized selector to get teams error state
 * Implements proper error handling and type safety
 */
export const selectTeamError = createSelector(
  [selectTeamsState],
  (teamsState) => {
    try {
      return teamsState.error;
    } catch (error) {
      console.error('Error selecting teams error state:', error);
      return 'Error accessing teams state';
    }
  }
);

/**
 * Memoized selector to get active teams count
 * Computes derived state with performance optimization
 */
export const selectActiveTeamsCount = createSelector(
  [selectAllTeams],
  (teams) => {
    try {
      return teams.filter(team => team.status === 'ACTIVE').length;
    } catch (error) {
      console.error('Error computing active teams count:', error);
      return 0;
    }
  }
);

/**
 * Memoized selector to get teams by member ID
 * Creates reusable selector for member-specific team filtering
 */
export const selectTeamsByMemberId = (memberId: string) =>
  createSelector(
    [selectAllTeams],
    (teams) => {
      try {
        return teams.filter(team => team.memberIds.includes(memberId));
      } catch (error) {
        console.error(`Error selecting teams for member ${memberId}:`, error);
        return [];
      }
    }
  );

/**
 * Memoized selector to get teams metadata
 * Provides access to aggregate team statistics
 */
export const selectTeamsMetadata = createSelector(
  [selectTeamsState],
  (teamsState) => {
    try {
      return teamsState.metadata;
    } catch (error) {
      console.error('Error selecting teams metadata:', error);
      return {
        totalCount: 0,
        activeCount: 0,
        lastUpdated: null
      };
    }
  }
);