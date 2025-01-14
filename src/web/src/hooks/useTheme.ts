import { useEffect, useCallback } from 'react'; // v18.x
import { Theme } from '@mui/material'; // ^5.0.0
import { THEME_MODES } from '../constants/theme.constants';
import { getTheme } from '../config/theme.config';
import useLocalStorage from './useLocalStorage';

// Constants for theme management
const THEME_STORAGE_KEY = 'theme-mode';
const SYSTEM_DARK_THEME_QUERY = '(prefers-color-scheme: dark)';
const THEME_TRANSITION_DURATION = 150;

/**
 * Type definitions for theme hook return values
 */
interface UseThemeReturn {
  theme: Theme;
  themeMode: THEME_MODES;
  setThemeMode: (mode: THEME_MODES) => void;
  toggleTheme: () => void;
}

/**
 * Custom hook for comprehensive theme management with system preference detection,
 * persistence, and smooth transitions.
 * 
 * Features:
 * - System theme detection with real-time updates
 * - Persistent theme preference storage
 * - Cross-tab synchronization
 * - Smooth theme transitions (150ms)
 * - Type-safe theme management
 * 
 * @returns {UseThemeReturn} Theme object and control functions
 */
export const useTheme = (): UseThemeReturn => {
  // Initialize theme mode from localStorage with persistence
  const [themeMode, setThemeMode] = useLocalStorage<THEME_MODES>(
    THEME_STORAGE_KEY,
    THEME_MODES.SYSTEM
  );

  /**
   * Memoized function to get system theme preference
   * with browser compatibility handling
   */
  const getSystemTheme = useCallback((): THEME_MODES => {
    if (!window.matchMedia) {
      return THEME_MODES.LIGHT; // Fallback for older browsers
    }
    return window.matchMedia(SYSTEM_DARK_THEME_QUERY).matches
      ? THEME_MODES.DARK
      : THEME_MODES.LIGHT;
  }, []);

  /**
   * Effect to handle system theme preference changes
   * with cleanup and performance optimization
   */
  useEffect(() => {
    if (themeMode !== THEME_MODES.SYSTEM) return;

    const mediaQuery = window.matchMedia(SYSTEM_DARK_THEME_QUERY);
    const handleChange = (e: MediaQueryListEvent): void => {
      // Apply transition class before theme change
      document.documentElement.style.transition = `background-color ${THEME_TRANSITION_DURATION}ms ease-in-out`;
      setThemeMode(e.matches ? THEME_MODES.DARK : THEME_MODES.LIGHT);
      
      // Remove transition after it completes
      setTimeout(() => {
        document.documentElement.style.transition = '';
      }, THEME_TRANSITION_DURATION);
    };

    // Add listener with compatibility check
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Cleanup function
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback cleanup
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [themeMode, setThemeMode]);

  /**
   * Memoized theme toggle function with smooth transition
   */
  const toggleTheme = useCallback((): void => {
    // Apply transition before theme change
    document.documentElement.style.transition = `background-color ${THEME_TRANSITION_DURATION}ms ease-in-out`;
    
    setThemeMode((prevMode) => {
      if (prevMode === THEME_MODES.SYSTEM) {
        return getSystemTheme() === THEME_MODES.LIGHT ? THEME_MODES.DARK : THEME_MODES.LIGHT;
      }
      return prevMode === THEME_MODES.LIGHT ? THEME_MODES.DARK : THEME_MODES.LIGHT;
    });

    // Remove transition after it completes
    setTimeout(() => {
      document.documentElement.style.transition = '';
    }, THEME_TRANSITION_DURATION);
  }, [setThemeMode, getSystemTheme]);

  // Get current theme based on mode with system preference handling
  const currentTheme = useCallback((): Theme => {
    if (themeMode === THEME_MODES.SYSTEM) {
      return getTheme(getSystemTheme());
    }
    return getTheme(themeMode);
  }, [themeMode, getSystemTheme]);

  // Return theme object and control functions
  return {
    theme: currentTheme(),
    themeMode,
    setThemeMode,
    toggleTheme,
  };
};

export default useTheme;