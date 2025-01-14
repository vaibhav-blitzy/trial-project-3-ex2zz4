/**
 * Theme Constants
 * Implements Material Design 3.0 principles with comprehensive theming support
 * Version: 1.0.0
 */

/**
 * Available theme modes with system preference detection support
 */
export enum THEME_MODES {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

/**
 * Color system following Material Design 3.0 with 60-30-10 rule
 * All colors meet WCAG 2.1 Level AA contrast requirements (minimum 4.5:1)
 */
export const COLORS = {
  light: {
    primary: {
      main: '#1976d2',    // Primary 60%
      light: '#42a5f5',
      dark: '#1565c0',
      contrast: '#ffffff'
    },
    secondary: {
      main: '#9c27b0',    // Secondary 30%
      light: '#ba68c8',
      dark: '#7b1fa2',
      contrast: '#ffffff'
    },
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
      elevated: '#ffffff'
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)'
    }
  },
  dark: {
    primary: {
      main: '#90caf9',    // Primary 60%
      light: '#e3f2fd',
      dark: '#42a5f5',
      contrast: '#000000'
    },
    secondary: {
      main: '#ce93d8',    // Secondary 30%
      light: '#f3e5f5',
      dark: '#ab47bc',
      contrast: '#000000'
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
      elevated: '#2c2c2c'
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.6)',
      disabled: 'rgba(255, 255, 255, 0.38)'
    }
  }
};

/**
 * Typography system with fluid scaling and consistent vertical rhythm
 */
export const TYPOGRAPHY = {
  fontFamilies: {
    primary: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif',
    monospace: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace'
  },
  fontSizes: {
    xs: 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
    sm: 'clamp(0.875rem, 0.825rem + 0.25vw, 1rem)',
    base: 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)',
    lg: 'clamp(1.125rem, 1.075rem + 0.25vw, 1.25rem)',
    xl: 'clamp(1.25rem, 1.2rem + 0.25vw, 1.5rem)',
    '2xl': 'clamp(1.5rem, 1.45rem + 0.25vw, 1.875rem)',
    '3xl': 'clamp(1.875rem, 1.825rem + 0.25vw, 2.25rem)',
    '4xl': 'clamp(2.25rem, 2.2rem + 0.25vw, 3rem)'
  },
  fontWeights: {
    light: 300,
    regular: 400,
    medium: 500,
    bold: 700
  },
  lineHeights: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2
  }
};

/**
 * 8px-based spacing system for consistent component and layout spacing
 */
export const SPACING = {
  base: 8,
  scale: {
    '0': '0',
    '1': '4px',
    '2': '8px',
    '3': '12px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
    '8': '32px',
    '10': '40px',
    '12': '48px',
    '16': '64px',
    '20': '80px',
    '24': '96px'
  },
  layout: {
    gutter: '24px',
    container: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px'
    }
  }
};

/**
 * GPU-optimized transitions following Material Design motion principles
 */
export const TRANSITIONS = {
  duration: {
    shortest: '150ms',
    shorter: '200ms',
    short: '250ms',
    standard: '300ms',
    complex: '375ms',
    enteringScreen: '225ms',
    leavingScreen: '195ms'
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)'
  },
  properties: {
    transform: 'transform',
    opacity: 'opacity',
    background: 'background-color',
    color: 'color',
    shadow: 'box-shadow'
  }
};

/**
 * Responsive breakpoints with utility functions
 */
export const BREAKPOINTS = {
  values: {
    xs: 320,
    sm: 768,
    md: 1024,
    lg: 1440,
    xl: 1920
  },
  up: (breakpoint: keyof typeof BREAKPOINTS.values) => 
    `@media (min-width: ${BREAKPOINTS.values[breakpoint]}px)`,
  down: (breakpoint: keyof typeof BREAKPOINTS.values) => 
    `@media (max-width: ${BREAKPOINTS.values[breakpoint] - 0.02}px)`
};