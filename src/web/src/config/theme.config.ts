import { createTheme, ThemeOptions } from '@mui/material';
import { THEME_MODES, COLORS, TYPOGRAPHY, SPACING, TRANSITIONS, BREAKPOINTS } from '../constants/theme.constants';

/**
 * Base theme configuration implementing Material Design 3.0 principles
 * Ensures WCAG 2.1 Level AA compliance and follows 60-30-10 color rule
 */
const baseThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: TYPOGRAPHY.fontFamilies.primary,
    fontSize: 16, // Base size for rem calculations
    fontWeightLight: TYPOGRAPHY.fontWeights.light,
    fontWeightRegular: TYPOGRAPHY.fontWeights.regular,
    fontWeightMedium: TYPOGRAPHY.fontWeights.medium,
    fontWeightBold: TYPOGRAPHY.fontWeights.bold,
    h1: {
      fontSize: TYPOGRAPHY.fontSizes['4xl'],
      lineHeight: TYPOGRAPHY.lineHeights.tight,
      fontWeight: TYPOGRAPHY.fontWeights.bold,
    },
    h2: {
      fontSize: TYPOGRAPHY.fontSizes['3xl'],
      lineHeight: TYPOGRAPHY.lineHeights.tight,
      fontWeight: TYPOGRAPHY.fontWeights.bold,
    },
    h3: {
      fontSize: TYPOGRAPHY.fontSizes['2xl'],
      lineHeight: TYPOGRAPHY.lineHeights.snug,
      fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    h4: {
      fontSize: TYPOGRAPHY.fontSizes.xl,
      lineHeight: TYPOGRAPHY.lineHeights.snug,
      fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    h5: {
      fontSize: TYPOGRAPHY.fontSizes.lg,
      lineHeight: TYPOGRAPHY.lineHeights.normal,
      fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    h6: {
      fontSize: TYPOGRAPHY.fontSizes.base,
      lineHeight: TYPOGRAPHY.lineHeights.normal,
      fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    body1: {
      fontSize: TYPOGRAPHY.fontSizes.base,
      lineHeight: TYPOGRAPHY.lineHeights.relaxed,
    },
    body2: {
      fontSize: TYPOGRAPHY.fontSizes.sm,
      lineHeight: TYPOGRAPHY.lineHeights.relaxed,
    },
    button: {
      fontSize: TYPOGRAPHY.fontSizes.sm,
      fontWeight: TYPOGRAPHY.fontWeights.medium,
      textTransform: 'none',
    },
  },
  breakpoints: {
    values: BREAKPOINTS.values,
  },
  spacing: (factor: number) => `${SPACING.base * factor}px`,
  shape: {
    borderRadius: 8,
  },
  transitions: {
    duration: {
      shortest: parseInt(TRANSITIONS.duration.shortest),
      shorter: parseInt(TRANSITIONS.duration.shorter),
      short: parseInt(TRANSITIONS.duration.short),
      standard: parseInt(TRANSITIONS.duration.standard),
      complex: parseInt(TRANSITIONS.duration.complex),
      enteringScreen: parseInt(TRANSITIONS.duration.enteringScreen),
      leavingScreen: parseInt(TRANSITIONS.duration.leavingScreen),
    },
    easing: TRANSITIONS.easing,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollBehavior: 'smooth',
          fontFeatureSettings: '"kern" 1',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      },
    },
    MuiFocusRing: {
      defaultProps: {
        color: 'primary',
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: TYPOGRAPHY.fontWeights.medium,
        },
      },
    },
  },
};

/**
 * Light theme configuration
 * Implements 60-30-10 color rule with WCAG 2.1 AA compliant contrast ratios
 */
export const lightTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    mode: 'light',
    primary: COLORS.light.primary,
    secondary: COLORS.light.secondary,
    background: COLORS.light.background,
    text: COLORS.light.text,
  },
});

/**
 * Dark theme configuration
 * Implements 60-30-10 color rule with WCAG 2.1 AA compliant contrast ratios
 */
export const darkTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    mode: 'dark',
    primary: COLORS.dark.primary,
    secondary: COLORS.dark.secondary,
    background: COLORS.dark.background,
    text: COLORS.dark.text,
  },
});

/**
 * Theme cache for performance optimization
 */
const themeCache = new Map<THEME_MODES, typeof lightTheme>();

/**
 * Returns the appropriate theme based on the specified mode
 * Implements system theme detection and caching for performance
 * @param mode - The desired theme mode
 * @returns Material-UI theme object
 */
export const getTheme = (mode: THEME_MODES): typeof lightTheme => {
  // Check cache first
  const cachedTheme = themeCache.get(mode);
  if (cachedTheme) {
    return cachedTheme;
  }

  let theme: typeof lightTheme;

  switch (mode) {
    case THEME_MODES.LIGHT:
      theme = lightTheme;
      break;
    case THEME_MODES.DARK:
      theme = darkTheme;
      break;
    case THEME_MODES.SYSTEM:
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? darkTheme : lightTheme;
      break;
    default:
      theme = lightTheme; // Fallback to light theme
  }

  // Cache the theme
  themeCache.set(mode, theme);
  return theme;
};