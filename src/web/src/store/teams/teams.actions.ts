/**
 * Team Management Redux Actions
 * Implements comprehensive team operations with real-time updates,
 * role-based access control, and enhanced error handling
 * @version 1.0.0
 */

import { createAsyncThunk, createAction } from '@reduxjs/toolkit'; // ^1.9.0
import { debounce } from 'lodash'; // ^4.17.21
import { TeamActionTypes } from './teams.types';
import { TeamService } from '../../services/team.service';
import { ITeam, ITeamMember, TeamRole } from '../../interfaces/team.interface';
import { ApiResponse, PaginatedResponse } from '../../types/api.types';

// Initialize TeamService singleton
const teamService = new TeamService(null);

/**
 * Debounced function for handling real-time team updates
 */
const debouncedTeamUpdate = debounce((dispatch, update) => {
    dispatch(handleTeamWebSocketUpdate(update));
}, 300);

/**
 * Fetches teams with pagination and filtering support
 */
export const fetchTeams = createAsyncThunk<
    ApiResponse<PaginatedResponse<ITeam>>,
    { page: number; limit: number; filters?: Record<string, any> }
>(
    TeamActionTypes.FETCH_TEAMS,
    async (params, { rejectWithValue }) => {
        try {
            const teams = await teamService.getTeams();
            return {
                success: true,
                data: {
                    items: teams,
                    total: teams.length,
                    page: params.page,
                    limit: params.limit,
                    totalPages: Math.ceil(teams.length / params.limit),
                    hasNextPage: teams.length > params.page * params.limit,
                    hasPreviousPage: params.page > 1
                },
                error: null,
                statusCode: 200,
                errorDetails: null,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return rejectWithValue({
                success: false,
                error: error.message,
                statusCode: error.code || 500,
                errorDetails: error,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * Creates a new team with role validation
 */
export const createTeam = createAsyncThunk<
    ApiResponse<ITeam>,
    { name: string; description: string; ownerId: string }
>(
    TeamActionTypes.CREATE_TEAM,
    async (teamData, { rejectWithValue }) => {
        try {
            const team = await teamService.createTeam(teamData);
            return {
                success: true,
                data: team,
                error: null,
                statusCode: 201,
                errorDetails: null,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return rejectWithValue({
                success: false,
                error: error.message,
                statusCode: error.code || 500,
                errorDetails: error,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * Updates an existing team with optimistic updates
 */
export const updateTeam = createAsyncThunk<
    ApiResponse<ITeam>,
    { teamId: string; updateData: Partial<ITeam> }
>(
    TeamActionTypes.UPDATE_TEAM,
    async ({ teamId, updateData }, { rejectWithValue }) => {
        try {
            const team = await teamService.updateTeam(teamId, updateData);
            return {
                success: true,
                data: team,
                error: null,
                statusCode: 200,
                errorDetails: null,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return rejectWithValue({
                success: false,
                error: error.message,
                statusCode: error.code || 500,
                errorDetails: error,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * Deletes a team with confirmation and cleanup
 */
export const deleteTeam = createAsyncThunk<
    ApiResponse<boolean>,
    string
>(
    TeamActionTypes.DELETE_TEAM,
    async (teamId, { rejectWithValue }) => {
        try {
            const success = await teamService.deleteTeam(teamId);
            return {
                success: true,
                data: success,
                error: null,
                statusCode: 200,
                errorDetails: null,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return rejectWithValue({
                success: false,
                error: error.message,
                statusCode: error.code || 500,
                errorDetails: error,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * Selects a team for active view/edit
 */
export const selectTeam = createAction<string>(TeamActionTypes.SELECT_TEAM);

/**
 * Handles real-time team updates via WebSocket
 */
export const handleTeamWebSocketUpdate = createAction<{
    type: string;
    data: any;
    timestamp: string;
}>(TeamActionTypes.TEAM_WEBSOCKET_UPDATE);

/**
 * Subscribes to real-time team updates
 */
export const subscribeToTeamUpdates = (teamId: string) => (dispatch: any) => {
    teamService.subscribeToTeamUpdates(teamId, (update: any) => {
        debouncedTeamUpdate(dispatch, update);
    });
};

/**
 * Unsubscribes from team updates
 */
export const unsubscribeFromTeamUpdates = (teamId: string) => () => {
    teamService.unsubscribeFromTeamUpdates(teamId);
};

// Export all team actions
export const teamActions = {
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    selectTeam,
    handleTeamWebSocketUpdate,
    subscribeToTeamUpdates,
    unsubscribeFromTeamUpdates
};