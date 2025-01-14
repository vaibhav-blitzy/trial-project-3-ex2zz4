/**
 * Root Application Component
 * Implements Material Design 3.0 principles with comprehensive error handling,
 * theme management, and performance optimization.
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { Provider } from 'react-redux'; // ^8.0.0
import { ThemeProvider, CssBaseline } from '@mui/material'; // ^5.0.0
import { BrowserRouter } from 'react-router-dom'; // ^6.0.0
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0

import MainLayout from './components/layout/MainLayout';
import { store } from './store';
import { getTheme } from './config/theme.config';
import useTheme from './hooks/useTheme';
import { TRANSITIONS } from './constants/theme.constants';

/**
 * Error fallback component for top-level error boundary
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div
    role="alert"
    style={{
      padding: '20px',
      margin: '20px',
      backgroundColor: '#ffebee',
      color: '#c62828',
      borderRadius: '4px'
    }}
  >
    <h2>An unexpected error occurred</h2>
    <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
    <button
      onClick={() => window.location.reload()}
      style={{
        padding: '8px 16px',
        backgroundColor: '#c62828',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Reload Application
    </button>
  </div>
);

/**
 * Root application component with performance optimization and error handling
 */
const App: React.FC = React.memo(() => {
  const { theme, themeMode } = useTheme();

  // Set up theme-related metadata
  useEffect(() => {
    // Update theme color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.palette.primary.main);
    }

    // Update body background with transition
    document.body.style.transition = `background-color ${TRANSITIONS.duration.shortest} ${TRANSITIONS.easing.easeInOut}`;
    document.body.style.backgroundColor = theme.palette.background.default;

    // Set theme mode attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [theme, themeMode]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error) => {
        // Log error to monitoring service
        console.error('Application Error:', error);
      }}
    >
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <React.Suspense
              fallback={
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    backgroundColor: theme.palette.background.default
                  }}
                >
                  Loading...
                </div>
              }
            >
              <MainLayout />
            </React.Suspense>
          </BrowserRouter>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
});

// Display name for debugging
App.displayName = 'App';

export default App;