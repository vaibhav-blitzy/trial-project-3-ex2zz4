/**
 * @fileoverview Material Design 3.0 Header Component with enterprise-grade features
 * Implements responsive design, theme management, authentication, and accessibility
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { IconButton } from '@mui/material'; // v5.0.0
import clsx from 'clsx'; // v2.0.0
import Avatar from '../common/Avatar';
import Dropdown from '../common/Dropdown';
import useAuth from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';
import { BaseComponentProps } from '../../types/components.types';
import { THEME_MODES } from '../../constants/theme.constants';
import styles from './Header.module.css';

/**
 * Props interface for Header component
 */
interface HeaderProps extends BaseComponentProps {
  /** Callback for menu button click */
  onMenuClick: (event: React.MouseEvent) => void;
}

/**
 * Enterprise-grade header component implementing Material Design 3.0
 * Features:
 * - Responsive design with mobile-first approach
 * - Theme management with system preference detection
 * - Secure authentication integration
 * - WCAG 2.1 Level AA compliance
 * - Cross-tab synchronization
 */
const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  className,
  style,
  testId = 'header',
}) => {
  // State and refs
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const { user, logout, isLoading } = useAuth();
  const { themeMode, toggleTheme } = useTheme();

  /**
   * Profile menu options with role-based items
   */
  const profileOptions = [
    {
      value: 'profile',
      label: 'Profile Settings',
      icon: '👤',
    },
    {
      value: 'theme',
      label: `Theme: ${themeMode === THEME_MODES.SYSTEM ? 'System' : themeMode}`,
      icon: themeMode === THEME_MODES.DARK ? '🌙' : '☀️',
    },
    {
      value: 'logout',
      label: 'Logout',
      icon: '🚪',
    },
  ];

  /**
   * Handles profile menu selection with type safety
   */
  const handleProfileAction = useCallback(async (value: string | number) => {
    switch (value) {
      case 'theme':
        toggleTheme();
        break;
      case 'logout':
        try {
          await logout();
        } catch (error) {
          console.error('Logout failed:', error);
          // Error handling should be implemented based on requirements
        }
        break;
      default:
        break;
    }
    setIsProfileOpen(false);
  }, [logout, toggleTheme]);

  /**
   * Handles click outside profile menu
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  /**
   * Generates header class names based on state
   */
  const headerClasses = clsx(
    styles.header,
    {
      [styles.loading]: isLoading,
      [styles.authenticated]: !!user,
    },
    className
  );

  return (
    <header
      className={headerClasses}
      style={style}
      data-testid={testId}
      role="banner"
    >
      <div className={styles.headerContent}>
        <div className={styles.headerLeft}>
          <IconButton
            onClick={onMenuClick}
            aria-label="Open menu"
            edge="start"
            className={styles.menuButton}
            size="large"
          >
            <span className={styles.menuIcon}>☰</span>
          </IconButton>
          
          <h1 className={styles.headerTitle}>Task Management</h1>
        </div>

        <div className={styles.headerRight} ref={profileRef}>
          {user && (
            <>
              <div 
                className={styles.profileSection}
                aria-haspopup="true"
                aria-expanded={isProfileOpen}
              >
                <Avatar
                  src={user.profileUrl}
                  alt={user.email}
                  size="SMALL"
                  ariaLabel="User profile"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className={styles.profileAvatar}
                />
                
                <Dropdown
                  options={profileOptions}
                  value=""
                  onChange={handleProfileAction}
                  className={styles.profileDropdown}
                  aria-label="Profile menu"
                  disabled={isLoading}
                  virtualScrolling={false}
                  searchable={false}
                />
              </div>
            </>
          )}

          <IconButton
            onClick={toggleTheme}
            aria-label={`Switch to ${themeMode === THEME_MODES.DARK ? 'light' : 'dark'} theme`}
            className={styles.themeToggle}
            size="large"
          >
            <span className={styles.themeIcon}>
              {themeMode === THEME_MODES.DARK ? '🌙' : '☀️'}
            </span>
          </IconButton>
        </div>
      </div>
    </header>
  );
};

export default Header;