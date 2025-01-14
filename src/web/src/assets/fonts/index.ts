// @fontsource/roboto v4.5.0 - Primary font family
import '@fontsource/roboto';
// @fontsource/roboto/400.css v4.5.0 - Regular weight
import '@fontsource/roboto/400.css';
// @fontsource/roboto/500.css v4.5.0 - Medium weight
import '@fontsource/roboto/500.css';
// @fontsource/roboto/700.css v4.5.0 - Bold weight
import '@fontsource/roboto/700.css';

/**
 * Font family configuration following Material Design 3.0 typography system
 * Provides primary Roboto font with system fallbacks for optimal accessibility
 */
export const fontFamily = {
  primary: "'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Oxygen, Ubuntu, Cantarell, sans-serif",
  fallback: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Oxygen, Ubuntu, Cantarell, sans-serif"
} as const;

/**
 * Font weight configurations aligned with Material Design type scale
 * Supports regular (400), medium (500), and bold (700) weights
 */
export const fontWeights = {
  regular: 400,
  medium: 500,
  bold: 700
} as const;

/**
 * Font loading and optimization configuration
 * Implements performance best practices and WCAG 2.1 Level AA compliance
 */
export const fontConfig = {
  display: 'swap', // Ensures text remains visible during font loading
  subset: 'latin', // Optimizes bundle size by including only Latin character set
  preload: true    // Prioritizes font loading for critical rendering
} as const;

/**
 * Manages font loading process with performance optimization and error handling
 * @returns Promise that resolves when fonts are loaded or fails gracefully
 */
export const loadFonts = async (): Promise<void> => {
  try {
    // Check if document is available (browser environment)
    if (typeof document === 'undefined') return;

    // Create font loading performance mark
    performance.mark('fonts-loading-start');

    // Create link elements for preloading critical font weights
    if (fontConfig.preload) {
      const weights = [400, 500, 700];
      weights.forEach(weight => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'font';
        link.type = 'font/woff2';
        link.href = `/@fontsource/roboto/files/roboto-latin-${weight}-normal.woff2`;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      });
    }

    // Set font-display strategy
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Roboto';
        font-display: ${fontConfig.display};
      }
    `;
    document.head.appendChild(style);

    // Create font loading performance measure
    performance.mark('fonts-loading-end');
    performance.measure('fonts-loading', 'fonts-loading-start', 'fonts-loading-end');

  } catch (error) {
    // Log error but don't throw to prevent app crashes
    console.error('Error loading fonts:', error);
    // Fallback to system fonts is automatic due to fontFamily configuration
  }
};

// Export type definitions for TypeScript support
export type FontFamily = typeof fontFamily;
export type FontWeights = typeof fontWeights;
export type FontConfig = typeof fontConfig;