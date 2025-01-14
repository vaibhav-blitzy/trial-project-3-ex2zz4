import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import styled from '@emotion/styled';
import { 
  List,
  ListItem,
  Avatar,
  Typography,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Box
} from '@mui/material';
import { PersonAdd as PersonAddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { IProject, IProjectMember, ProjectRole } from '../../interfaces/project.interface';
import { useTheme } from '../../hooks/useTheme';
import { TRANSITIONS, SPACING, TYPOGRAPHY } from '../../constants/theme.constants';

// Props interface with comprehensive type safety
interface ProjectMembersProps {
  projectId: string;
  members: IProjectMember[];
  onAddMember: (userId: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onUpdateRole: (userId: string, role: ProjectRole) => Promise<void>;
  isLoading?: boolean;
  error?: Error | null;
  ariaLabel?: string;
}

// Styled components with theme-aware styling
const MembersContainer = styled(Box)(({ theme }) => ({
  height: '100%',
  maxHeight: '600px',
  width: '100%',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  overflow: 'hidden',
}));

const VirtualList = styled(List)(({ theme }) => ({
  height: '100%',
  padding: 0,
  margin: 0,
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.divider,
    borderRadius: '4px',
  },
}));

const MemberItem = styled(ListItem)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: SPACING.scale[4],
  borderBottom: `1px solid ${theme.palette.divider}`,
  transition: `background-color ${TRANSITIONS.duration.shortest} ${TRANSITIONS.easing.easeInOut}`,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const MemberInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  marginLeft: SPACING.scale[3],
});

const RoleSelect = styled(Select)(({ theme }) => ({
  marginLeft: 'auto',
  marginRight: SPACING.scale[3],
  minWidth: '120px',
  '& .MuiSelect-select': {
    padding: `${SPACING.scale[1]} ${SPACING.scale[3]}`,
  },
}));

// Main component with performance optimizations
const ProjectMembers: React.FC<ProjectMembersProps> = React.memo(({
  projectId,
  members,
  onAddMember,
  onRemoveMember,
  onUpdateRole,
  isLoading = false,
  error = null,
  ariaLabel = 'Project members list'
}) => {
  const { theme } = useTheme();
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual list configuration for handling large datasets
  const rowVirtualizer = useVirtualizer({
    count: members.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Height of each member row
    overscan: 5, // Number of items to render beyond visible area
  });

  // Memoized role options to prevent unnecessary rerenders
  const roleOptions = useMemo(() => Object.values(ProjectRole), []);

  // Role update handler with error boundary
  const handleRoleChange = useCallback(async (userId: string, newRole: ProjectRole) => {
    try {
      await onUpdateRole(userId, newRole);
    } catch (error) {
      console.error('Failed to update member role:', error);
      // Error handling should be propagated to parent component
    }
  }, [onUpdateRole]);

  // Member removal handler with confirmation
  const handleRemoveMember = useCallback(async (userId: string) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await onRemoveMember(userId);
      } catch (error) {
        console.error('Failed to remove member:', error);
      }
    }
  }, [onRemoveMember]);

  // Keyboard navigation setup
  useEffect(() => {
    const handleKeyNavigation = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = document.activeElement?.getAttribute('data-index');
        if (currentIndex) {
          const nextIndex = e.key === 'ArrowDown' 
            ? Math.min(parseInt(currentIndex) + 1, members.length - 1)
            : Math.max(parseInt(currentIndex) - 1, 0);
          document.querySelector(`[data-index="${nextIndex}"]`)?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyNavigation);
    return () => document.removeEventListener('keydown', handleKeyNavigation);
  }, [members.length]);

  // Error state rendering
  if (error) {
    return (
      <Alert severity="error" sx={{ margin: SPACING.scale[4] }}>
        {error.message}
      </Alert>
    );
  }

  return (
    <MembersContainer ref={parentRef} role="region" aria-label={ariaLabel}>
      {isLoading ? (
        <Box display="flex" justifyContent="center" padding={4}>
          <CircularProgress />
        </Box>
      ) : (
        <VirtualList
          role="list"
          aria-label={ariaLabel}
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const member = members[virtualRow.index];
            return (
              <MemberItem
                key={member.userId}
                data-index={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                role="listitem"
                tabIndex={0}
              >
                <Avatar alt={`Member ${member.userId}`} />
                <MemberInfo>
                  <Typography variant="body1" fontWeight={TYPOGRAPHY.fontWeights.medium}>
                    {member.userId}
                  </Typography>
                </MemberInfo>
                <RoleSelect
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.userId, e.target.value as ProjectRole)}
                  aria-label={`Change role for member ${member.userId}`}
                >
                  {roleOptions.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </RoleSelect>
                <Tooltip title="Remove member">
                  <IconButton
                    onClick={() => handleRemoveMember(member.userId)}
                    aria-label={`Remove member ${member.userId}`}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </MemberItem>
            );
          })}
        </VirtualList>
      )}
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          padding: SPACING.scale[3],
          backgroundColor: theme.palette.background.paper,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Tooltip title="Add new member">
          <IconButton
            onClick={() => onAddMember('')}
            color="primary"
            aria-label="Add new member"
          >
            <PersonAddIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </MembersContainer>
  );
});

ProjectMembers.displayName = 'ProjectMembers';

export default ProjectMembers;