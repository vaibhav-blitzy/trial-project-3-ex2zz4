/**
 * Application Entry Point
 * Implements React 18 features with concurrent rendering, theme support,
 * error boundaries, and performance monitoring.
 * @version 1.0.0
 */

import React from 'react'; // ^18.0.0
import { createRoot } from 'react-dom/client'; // ^18.0.0
import { Provider } from 'react-redux'; // ^8.0.0
import { ThemeProvider } from '@mui/material/styles'; // ^5.0.0
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0
import { reportWebVitals } from 'web-vitals'; // ^3.0.0

import App from './App';
import { store } from './store';
import { getTheme } from './config/theme.config';
import { THEME_MODES } from './constants/theme.constants';

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
      borderRadius: '4px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}
  >
    <h2>Application Error</h2>
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
 * Initializes and renders the root application with all necessary providers
 * and error boundaries
 */
const renderApp = (): void => {
  // Get root element with error handling
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Failed to find root element');
  }

  // Create React 18 root with concurrent features
  const root = createRoot(rootElement);

  // Get initial theme based on system preference
  const initialTheme = getTheme(THEME_MODES.SYSTEM);

  // Render application with providers and error boundary
  root.render(
    <React.StrictMode>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={(error) => {
          console.error('Application Error:', error);
          // Log to monitoring service in production
          if (process.env.NODE_ENV === 'production') {
            // Implementation for error logging service would go here
          }
        }}
      >
        <Provider store={store}>
          <ThemeProvider theme={initialTheme}>
            <App />
          </ThemeProvider>
        </Provider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// Initialize application
renderApp();

/**
 * Reports performance metrics to monitoring service
 * @param metric Web vital metric to report
 */
const reportPerformance = (metric: any): void => {
  // Log metrics in development
  if (process.env.NODE_ENV === 'development') {
    console.log(metric);
  }

  // Send to monitoring service in production
  if (process.env.NODE_ENV === 'production') {
    // Implementation for metrics reporting service would go here
  }
};

// Monitor and report web vitals
reportWebVitals(reportPerformance);

// Enable hot module replacement in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', renderApp);
}