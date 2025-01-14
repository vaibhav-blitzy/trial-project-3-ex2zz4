import React, { useCallback, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  useMediaQuery, 
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Tooltip,
  Box
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as TasksIcon,
  Group as TeamsIcon,
  Folder as ProjectsIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';

import { ROUTES } from '../../constants/routes.constants';
import { useAuth } from '../../hooks/useAuth';

// Styled components with GPU acceleration and accessibility
const NavigationContainer = styled.nav`
  height: 100%;
  transition: width 150ms cubic-bezier(0.4, 0, 0.2, 1);
  will-change: width;
  overflow-x: hidden;
  
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const SkipLink = styled.a`
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
  
  &:focus {
    position: fixed;
    top: 16px;
    left: 16px;
    width: auto;
    height: auto;
    padding: 16px;
    background: ${props => props.theme.palette.background.paper};
    z-index: 9999;
    outline: 3px solid ${props => props.theme.palette.primary.main};
  }
`;

// Custom hook for keyboard navigation
const useNavigationKeyboard = () => {
  const [focusIndex, setFocusIndex] = useState<number>(-1);
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocusIndex(prev => Math.min(prev + 1, 4));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusIndex(prev => Math.max(prev - 1, 0));
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { focusIndex };
};

// Navigation items with ARIA labels and keyboard support
const navigationItems = [
  { 
    path: ROUTES.DASHBOARD.ROOT, 
    label: 'Dashboard', 
    icon: DashboardIcon,
    ariaLabel: 'Navigate to dashboard'
  },
  { 
    path: ROUTES.TASKS.ROOT, 
    label: 'Tasks', 
    icon: TasksIcon,
    ariaLabel: 'Navigate to tasks'
  },
  { 
    path: ROUTES.PROJECTS.ROOT, 
    label: 'Projects', 
    icon: ProjectsIcon,
    ariaLabel: 'Navigate to projects'
  },
  { 
    path: ROUTES.TEAMS.ROOT, 
    label: 'Teams', 
    icon: TeamsIcon,
    ariaLabel: 'Navigate to teams'
  },
  { 
    path: ROUTES.SETTINGS.ROOT, 
    label: 'Settings', 
    icon: SettingsIcon,
    ariaLabel: 'Navigate to settings'
  }
];

const Navigation: React.FC = React.memo(() => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const { isAuthenticated, validateSession } = useAuth();
  const { focusIndex } = useNavigationKeyboard();
  
  const [isOpen, setIsOpen] = useState(!isMobile);
  
  // Validate session on mount and route change
  useEffect(() => {
    if (isAuthenticated) {
      validateSession();
    }
  }, [isAuthenticated, validateSession, location.pathname]);

  // Handle drawer state based on screen size
  useEffect(() => {
    setIsOpen(!isMobile);
  }, [isMobile]);

  const handleDrawerToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const getDrawerWidth = useCallback(() => {
    if (isMobile) return '100%';
    if (isTablet) return '64px';
    return isOpen ? '240px' : '64px';
  }, [isMobile, isTablet, isOpen]);

  return (
    <>
      <SkipLink href="#main-content">
        Skip to main content
      </SkipLink>
      
      {isMobile && (
        <IconButton
          onClick={handleDrawerToggle}
          edge="start"
          aria-label="Toggle navigation menu"
          sx={{ ml: 2, mt: 2 }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isOpen}
        onClose={isMobile ? handleDrawerToggle : undefined}
        sx={{
          width: getDrawerWidth(),
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: getDrawerWidth(),
            boxSizing: 'border-box',
            overflowX: 'hidden'
          }
        }}
      >
        <NavigationContainer role="navigation" aria-label="Main navigation">
          {!isMobile && (
            <IconButton
              onClick={handleDrawerToggle}
              aria-label={isOpen ? 'Collapse navigation' : 'Expand navigation'}
              sx={{ ml: 1, my: 1 }}
            >
              <ChevronLeftIcon sx={{ transform: isOpen ? 'none' : 'rotate(180deg)' }} />
            </IconButton>
          )}

          <Divider />

          <List>
            {navigationItems.map((item, index) => (
              <ListItem
                key={item.path}
                button
                component={Link}
                to={item.path}
                selected={location.pathname.startsWith(item.path)}
                aria-label={item.ariaLabel}
                tabIndex={focusIndex === index ? 0 : -1}
                sx={{
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  px: 2,
                  py: 1.5
                }}
              >
                <Tooltip
                  title={!isOpen ? item.label : ''}
                  placement="right"
                  arrow
                >
                  <ListItemIcon sx={{ minWidth: isOpen ? 40 : 'auto' }}>
                    <item.icon />
                  </ListItemIcon>
                </Tooltip>
                {isOpen && <ListItemText primary={item.label} />}
              </ListItem>
            ))}
          </List>
        </NavigationContainer>
      </Drawer>
    </>
  );
});

Navigation.displayName = 'Navigation';

export default Navigation;