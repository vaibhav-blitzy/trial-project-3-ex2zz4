/**
 * @fileoverview Team Members management component with virtualized list support
 * Implements Material Design 3.0 components and real-time WebSocket updates
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FixedSizeList as VirtualList } from 'react-window';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress,
  Alert,
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

import Avatar from '../common/Avatar';
import { useWebSocket } from '../../hooks/useWebSocket';
import { API_ENDPOINTS } from '../../constants/api.constants';
import { Size } from '../../types/common.types';

/**
 * Team member interface with role-based access control
 */
interface ITeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'away';
  lastActive: string;
}

/**
 * Team roles with associated permissions
 */
enum TeamRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST'
}

/**
 * Virtual list configuration options
 */
interface VirtualListOptions {
  itemHeight: number;
  overscanCount: number;
  initialScrollOffset?: number;
}

/**
 * Component props with enhanced type safety
 */
interface TeamMembersProps {
  teamId: string;
  members: ITeamMember[];
  virtualizedOptions?: VirtualListOptions;
  onMemberAdd?: (userId: string, role: TeamRole) => Promise<void>;
  onMemberRemove?: (userId: string) => Promise<void>;
  onRoleChange?: (userId: string, newRole: TeamRole) => Promise<void>;
  onError?: (error: Error) => void;
}

/**
 * TeamMembers component for managing team members with real-time updates
 */
const TeamMembers: React.FC<TeamMembersProps> = ({
  teamId,
  members,
  virtualizedOptions = { itemHeight: 72, overscanCount: 5 },
  onMemberAdd,
  onMemberRemove,
  onRoleChange,
  onError
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [localMembers, setLocalMembers] = useState<ITeamMember[]>(members);
  const [selectedMember, setSelectedMember] = useState<ITeamMember | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const listRef = useRef<HTMLDivElement>(null);
  const listHeight = useMemo(() => Math.min(window.innerHeight * 0.7, 600), []);

  // WebSocket connection for real-time updates
  const { subscribe } = useWebSocket(API_ENDPOINTS.TEAMS.BASE);

  /**
   * Handles member menu opening
   */
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, member: ITeamMember) => {
    event.stopPropagation();
    setSelectedMember(member);
    setAnchorEl(event.currentTarget);
  }, []);

  /**
   * Handles member menu closing
   */
  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedMember(null);
  }, []);

  /**
   * Handles role change for a team member
   */
  const handleRoleChange = useCallback(async (newRole: TeamRole) => {
    if (!selectedMember || !onRoleChange) return;
    
    setLoading(true);
    try {
      await onRoleChange(selectedMember.id, newRole);
      setLocalMembers(prev => 
        prev.map(member => 
          member.id === selectedMember.id ? { ...member, role: newRole } : member
        )
      );
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onError?.(error);
    } finally {
      setLoading(false);
      handleMenuClose();
    }
  }, [selectedMember, onRoleChange, onError]);

  /**
   * Handles member removal from team
   */
  const handleRemoveMember = useCallback(async () => {
    if (!selectedMember || !onMemberRemove) return;
    
    setLoading(true);
    try {
      await onMemberRemove(selectedMember.id);
      setLocalMembers(prev => prev.filter(member => member.id !== selectedMember.id));
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onError?.(error);
    } finally {
      setLoading(false);
      handleMenuClose();
    }
  }, [selectedMember, onMemberRemove, onError]);

  /**
   * Renders individual team member row
   */
  const MemberRow = useCallback(({ index, style }: { index: number, style: React.CSSProperties }) => {
    const member = localMembers[index];
    
    return (
      <Box
        style={style}
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          '&:hover': {
            backgroundColor: theme.palette.action.hover
          }
        }}
        role="listitem"
        aria-label={`Team member ${member.name}`}
      >
        <Avatar
          src={member.avatarUrl}
          alt={member.name}
          size={Size.MEDIUM}
          ariaLabel={`${member.name}'s avatar`}
          colorScheme={theme.palette.primary.main}
        />
        <Box sx={{ ml: 2, flexGrow: 1 }}>
          <Typography variant="subtitle1">{member.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {member.role.toLowerCase()}
          </Typography>
        </Box>
        <Tooltip title="Member options">
          <IconButton
            onClick={(e) => handleMenuOpen(e, member)}
            aria-label={`Options for ${member.name}`}
          >
            <MoreVertIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }, [localMembers, theme, handleMenuOpen]);

  // Subscribe to real-time member updates
  useEffect(() => {
    const unsubscribe = subscribe<ITeamMember>('team.member.update', (updatedMember) => {
      setLocalMembers(prev => 
        prev.map(member => 
          member.id === updatedMember.id ? { ...member, ...updatedMember } : member
        )
      );
    });

    return () => unsubscribe();
  }, [subscribe]);

  return (
    <Paper 
      elevation={2}
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      role="region"
      aria-label="Team members list"
    >
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ margin: 2 }}
        >
          {error}
        </Alert>
      )}

      <Box
        ref={listRef}
        sx={{
          flex: 1,
          position: 'relative',
          '& .virtual-list': {
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': {
              width: '6px'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.divider
            }
          }
        }}
      >
        <VirtualList
          height={listHeight}
          width="100%"
          itemCount={localMembers.length}
          itemSize={virtualizedOptions.itemHeight}
          overscanCount={virtualizedOptions.overscanCount}
          className="virtual-list"
        >
          {MemberRow}
        </VirtualList>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {Object.values(TeamRole).map((role) => (
          <MenuItem
            key={role}
            onClick={() => handleRoleChange(role)}
            disabled={loading || selectedMember?.role === role}
          >
            <EditIcon sx={{ mr: 1 }} />
            Change role to {role.toLowerCase()}
          </MenuItem>
        ))}
        <MenuItem
          onClick={handleRemoveMember}
          disabled={loading}
          sx={{ color: theme.palette.error.main }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Remove from team
        </MenuItem>
      </Menu>

      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)'
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Paper>
  );
};

export default TeamMembers;