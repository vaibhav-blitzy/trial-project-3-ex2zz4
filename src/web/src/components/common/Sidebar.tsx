import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  useMediaQuery,
} from '@mui/material';
import { styled } from '@mui/material/styles';

import { BaseComponentProps } from '../../types/components.types';
import useTheme from '../../hooks/useTheme';
import { UIState } from '../../store/ui/ui.types';

// Constants for responsive behavior and animations
const DRAWER_WIDTH = 240;
const MOBILE_BREAKPOINT = 768;
const TRANSITION_DURATION = 150;

/**
 * Props interface for the Sidebar component
 * Extends BaseComponentProps for consistent component structure
 */
interface SidebarProps extends BaseComponentProps {
  /** Width of the sidebar in pixels or CSS units */
  width?: number | string;
  /** Position of the sidebar */
  anchor?: 'left' | 'right';
  /** Display variant of the sidebar */
  variant?: 'permanent' | 'persistent' | 'temporary';
  /** Callback function when sidebar is closed */
  onClose?: () => void;
  /** Accessible label for the sidebar */
  ariaLabel?: string;
  /** Duration of transition animations */
  transitionDuration?: number;
}

/**
 * Styled Drawer component with theme-aware transitions
 * Implements Material Design 3.0 elevation and transitions
 */
const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  '& .MuiDrawer-paper': {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: TRANSITION_DURATION,
    }),
  },
  '& .MuiListItem-root': {
    marginBottom: theme.spacing(0.5),
    borderRadius: theme.shape.borderRadius,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  '& .MuiListItemIcon-root': {
    minWidth: 40,
    color: theme.palette.text.secondary,
  },
}));

/**
 * Sidebar component implementing Material Design 3.0 principles
 * Features responsive behavior, theme support, and accessibility
 */
const Sidebar: React.FC<SidebarProps> = React.memo(({
  width = DRAWER_WIDTH,
  anchor = 'left',
  variant = 'permanent',
  onClose,
  ariaLabel = 'Main navigation',
  transitionDuration = TRANSITION_DURATION,
  className,
  style,
  id,
  testId,
}) => {
  // Theme and responsive hooks
  const { theme, themeMode } = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Redux state management
  const dispatch = useDispatch();
  const { sidebarOpen } = useSelector((state: { ui: UIState }) => state.ui);

  // Handle sidebar close event
  const handleClose = React.useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);

  // Determine effective variant based on screen size
  const effectiveVariant = isMobile ? 'temporary' : variant;

  return (
    <StyledDrawer
      variant={effectiveVariant}
      anchor={anchor}
      open={sidebarOpen}
      onClose={handleClose}
      className={className}
      style={style}
      id={id}
      data-testid={testId}
      aria-label={ariaLabel}
      role="navigation"
      transitionDuration={transitionDuration}
      PaperProps={{
        elevation: 2,
        onKeyDown: handleKeyDown,
        sx: {
          width: width,
          overflowX: 'hidden',
          backgroundColor: theme.palette.background.paper,
          transition: theme.transitions.create(['background-color'], {
            duration: TRANSITION_DURATION,
          }),
        },
      }}
    >
      <List
        aria-label="Navigation menu"
        role="menu"
        sx={{
          padding: theme.spacing(2),
          '& > *': {
            marginBottom: theme.spacing(0.5),
          },
        }}
      >
        {/* Navigation items would be rendered here */}
        {/* This is a placeholder for actual navigation items */}
        <ListItem
          button
          role="menuitem"
          aria-label="Dashboard"
          sx={{
            borderRadius: theme.shape.borderRadius,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <ListItemIcon>
            {/* Icon would go here */}
          </ListItemIcon>
          <ListItemText
            primary="Dashboard"
            primaryTypographyProps={{
              variant: 'body2',
              color: theme.palette.text.primary,
            }}
          />
        </ListItem>
      </List>
    </StyledDrawer>
  );
});

// Display name for debugging
Sidebar.displayName = 'Sidebar';

export default Sidebar;