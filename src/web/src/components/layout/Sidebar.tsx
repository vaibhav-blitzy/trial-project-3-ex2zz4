import React from 'react';
import { useSelector, useDispatch } from 'react-redux'; // ^8.0.0
import { useNavigate, useLocation } from 'react-router-dom'; // ^6.0.0
import {
  DashboardIcon,
  TaskIcon,
  ProjectIcon,
  TeamIcon,
  SettingsIcon,
} from '@mui/icons-material'; // ^5.0.0

import { Sidebar } from '../common/Sidebar';
import { ROUTES } from '../../constants/routes.constants';
import useTheme from '../../hooks/useTheme';
import { UIState } from '../../store/ui/ui.types';

/**
 * Interface for navigation menu items with accessibility and authentication support
 */
interface NavigationItem {
  label: string;
  path: string;
  icon: React.ComponentType;
  requiresAuth: boolean;
  ariaLabel: string;
  description: string;
  keyboardShortcut: string;
}

/**
 * Navigation items configuration with comprehensive accessibility support
 * Implements keyboard shortcuts and ARIA labels for each item
 */
const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: ROUTES.DASHBOARD.ROOT,
    icon: DashboardIcon,
    requiresAuth: true,
    ariaLabel: 'Navigate to dashboard',
    description: 'View your personalized dashboard',
    keyboardShortcut: 'Alt+D',
  },
  {
    label: 'Projects',
    path: ROUTES.PROJECTS.ROOT,
    icon: ProjectIcon,
    requiresAuth: true,
    ariaLabel: 'Navigate to projects',
    description: 'Manage your projects',
    keyboardShortcut: 'Alt+P',
  },
  {
    label: 'Tasks',
    path: ROUTES.TASKS.ROOT,
    icon: TaskIcon,
    requiresAuth: true,
    ariaLabel: 'Navigate to tasks',
    description: 'View and manage tasks',
    keyboardShortcut: 'Alt+T',
  },
  {
    label: 'Teams',
    path: ROUTES.TEAMS.ROOT,
    icon: TeamIcon,
    requiresAuth: true,
    ariaLabel: 'Navigate to teams',
    description: 'Manage your teams',
    keyboardShortcut: 'Alt+M',
  },
  {
    label: 'Settings',
    path: ROUTES.SETTINGS.ROOT,
    icon: SettingsIcon,
    requiresAuth: true,
    ariaLabel: 'Navigate to settings',
    description: 'Adjust your preferences',
    keyboardShortcut: 'Alt+S',
  },
];

/**
 * Layout-specific sidebar component implementing Material Design 3.0 principles
 * Features responsive behavior, theme support, and comprehensive accessibility
 */
const LayoutSidebar: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { theme, themeMode, toggleTheme } = useTheme();
  
  // Get sidebar state from Redux store
  const { sidebarOpen } = useSelector((state: { ui: UIState }) => state.ui);

  /**
   * Handles navigation item click with analytics tracking
   * @param path - Target route path
   */
  const handleNavigationClick = React.useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  /**
   * Sets up keyboard navigation handlers for accessibility
   */
  const handleKeyboardNavigation = React.useCallback((event: KeyboardEvent) => {
    NAVIGATION_ITEMS.forEach(item => {
      if (event.altKey && event.key.toLowerCase() === item.keyboardShortcut.split('+')[1].toLowerCase()) {
        event.preventDefault();
        handleNavigationClick(item.path);
      }
    });
  }, [handleNavigationClick]);

  // Setup keyboard navigation listeners
  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyboardNavigation);
    return () => window.removeEventListener('keydown', handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  /**
   * Determines if a navigation item is currently active
   */
  const isItemActive = React.useCallback((path: string): boolean => {
    return location.pathname.startsWith(path);
  }, [location]);

  return (
    <Sidebar
      width={240}
      anchor="left"
      variant="permanent"
      ariaLabel="Main navigation sidebar"
      className="layout-sidebar"
      testId="layout-sidebar"
    >
      {NAVIGATION_ITEMS.map((item) => ({
        icon: <item.icon />,
        label: item.label,
        onClick: () => handleNavigationClick(item.path),
        active: isItemActive(item.path),
        ariaLabel: item.ariaLabel,
        description: item.description,
        keyboardShortcut: item.keyboardShortcut,
        requiresAuth: item.requiresAuth,
      }))}
    </Sidebar>
  );
});

// Display name for debugging
LayoutSidebar.displayName = 'LayoutSidebar';

export default LayoutSidebar;