/**
 * @fileoverview Redux reducer for team management with real-time and optimistic updates
 * Supports teams of 10-10,000 users with comprehensive error handling and state management
 * @version 1.0.0
 */

import { createReducer, PayloadAction } from '@reduxjs/toolkit';
import { 
    TeamState, 
    TeamActionTypes,
    TeamError,
    FetchTeamsPayload,
    CreateTeamPayload,
    UpdateTeamPayload,
    TeamMemberPayload
} from './teams.types';
import { ITeam } from '../../interfaces/team.interface';

/**
 * Initial state for teams reducer with type safety
 */
const initialState: TeamState = {
    teams: [],
    selectedTeam: null,
    loading: false,
    error: null,
    lastUpdated: 0
};

/**
 * Teams reducer with enhanced error handling and optimistic updates
 */
export const teamsReducer = createReducer(initialState, (builder) => {
    builder
        // Fetch Teams Actions
        .addCase(TeamActionTypes.FETCH_TEAMS + '/pending', (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(TeamActionTypes.FETCH_TEAMS + '/fulfilled', (state, action: PayloadAction<ITeam[]>) => {
            state.teams = action.payload;
            state.loading = false;
            state.error = null;
            state.lastUpdated = Date.now();
        })
        .addCase(TeamActionTypes.FETCH_TEAMS + '/rejected', (state, action: PayloadAction<TeamError>) => {
            state.loading = false;
            state.error = action.payload;
            state.lastUpdated = Date.now();
        })

        // Create Team Actions with Optimistic Update
        .addCase(TeamActionTypes.CREATE_TEAM + '/pending', (state, action: PayloadAction<CreateTeamPayload>) => {
            const optimisticTeam: ITeam = {
                ...action.payload.teamData,
                id: `temp_${Date.now()}`,
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            } as ITeam;
            state.teams = [...state.teams, optimisticTeam];
            state.lastUpdated = Date.now();
        })
        .addCase(TeamActionTypes.CREATE_TEAM + '/fulfilled', (state, action: PayloadAction<ITeam>) => {
            state.teams = state.teams.map(team => 
                team.id.startsWith('temp_') ? action.payload : team
            );
            state.lastUpdated = Date.now();
        })
        .addCase(TeamActionTypes.CREATE_TEAM + '/rejected', (state, action: PayloadAction<TeamError>) => {
            state.teams = state.teams.filter(team => !team.id.startsWith('temp_'));
            state.error = action.payload;
            state.lastUpdated = Date.now();
        })

        // Update Team Actions with Conflict Resolution
        .addCase(TeamActionTypes.UPDATE_TEAM + '/pending', (state, action: PayloadAction<UpdateTeamPayload>) => {
            const { teamId, teamData } = action.payload;
            state.teams = state.teams.map(team => 
                team.id === teamId ? { ...team, ...teamData, updatedAt: new Date().toISOString() } : team
            );
            state.lastUpdated = Date.now();
        })
        .addCase(TeamActionTypes.UPDATE_TEAM + '/fulfilled', (state, action: PayloadAction<ITeam>) => {
            state.teams = state.teams.map(team =>
                team.id === action.payload.id ? action.payload : team
            );
            if (state.selectedTeam?.id === action.payload.id) {
                state.selectedTeam = action.payload;
            }
            state.lastUpdated = Date.now();
        })
        .addCase(TeamActionTypes.UPDATE_TEAM + '/rejected', (state, action: PayloadAction<TeamError>) => {
            state.error = action.payload;
            // Trigger re-fetch to resolve conflicts
            state.loading = true;
            state.lastUpdated = Date.now();
        })

        // Delete Team Actions with Optimistic Update
        .addCase(TeamActionTypes.DELETE_TEAM + '/pending', (state, action: PayloadAction<string>) => {
            state.teams = state.teams.map(team =>
                team.id === action.payload ? { ...team, status: 'DELETED' } : team
            );
            if (state.selectedTeam?.id === action.payload) {
                state.selectedTeam = null;
            }
            state.lastUpdated = Date.now();
        })
        .addCase(TeamActionTypes.DELETE_TEAM + '/fulfilled', (state, action: PayloadAction<string>) => {
            state.teams = state.teams.filter(team => team.id !== action.payload);
            state.lastUpdated = Date.now();
        })
        .addCase(TeamActionTypes.DELETE_TEAM + '/rejected', (state, action: PayloadAction<TeamError>) => {
            state.teams = state.teams.map(team =>
                team.id === action.payload ? { ...team, status: 'ACTIVE' } : team
            );
            state.error = action.payload;
            state.lastUpdated = Date.now();
        })

        // Team Selection
        .addCase(TeamActionTypes.SELECT_TEAM, (state, action: PayloadAction<string>) => {
            const selectedTeam = state.teams.find(team => team.id === action.payload);
            if (selectedTeam && selectedTeam.status === 'ACTIVE') {
                state.selectedTeam = selectedTeam;
                state.lastUpdated = Date.now();
            }
        })

        // Team Member Management with Optimistic Updates
        .addCase(TeamActionTypes.ADD_MEMBER + '/pending', (state, action: PayloadAction<TeamMemberPayload>) => {
            const { teamId, userId, role } = action.payload;
            state.teams = state.teams.map(team => {
                if (team.id === teamId) {
                    return {
                        ...team,
                        memberIds: [...team.memberIds, userId],
                        updatedAt: new Date().toISOString()
                    };
                }
                return team;
            });
            state.lastUpdated = Date.now();
        })
        .addCase(TeamActionTypes.REMOVE_MEMBER + '/pending', (state, action: PayloadAction<TeamMemberPayload>) => {
            const { teamId, userId } = action.payload;
            state.teams = state.teams.map(team => {
                if (team.id === teamId) {
                    return {
                        ...team,
                        memberIds: team.memberIds.filter(id => id !== userId),
                        updatedAt: new Date().toISOString()
                    };
                }
                return team;
            });
            state.lastUpdated = Date.now();
        })

        // Cross-Tab Synchronization
        .addCase(TeamActionTypes.SYNC_TEAMS, (state, action: PayloadAction<ITeam[]>) => {
            if (action.payload.length > 0) {
                state.teams = action.payload;
                // Re-select current team if it still exists
                if (state.selectedTeam) {
                    state.selectedTeam = action.payload.find(team => 
                        team.id === state.selectedTeam?.id
                    ) || null;
                }
                state.lastUpdated = Date.now();
            }
        });
});

export default teamsReducer;