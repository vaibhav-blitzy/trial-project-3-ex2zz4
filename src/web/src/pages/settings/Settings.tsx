/**
 * Settings Page Component
 * Implements Material Design 3.0 principles with WCAG 2.1 Level AA accessibility
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Container, Typography, CircularProgress, useTheme } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { debounce } from 'lodash';
import { ErrorBoundary } from 'react-error-boundary';
import styled from '@emotion/styled';

// Internal imports
import Profile from './Profile';
import SecurityPage from './Security';
import Tabs from '../../components/common/Tabs';
import { useAuth } from '../../hooks/useAuth';
import { SPACING, TYPOGRAPHY, TRANSITIONS } from '../../constants/theme.constants';

// Styled components with Material Design 3.0 principles
const SettingsContainer = styled(Container)`
  padding: ${SPACING.scale[6]};
  max-width: 1200px;
  margin: 0 auto;
  transition: all ${TRANSITIONS.duration.standard} ${TRANSITIONS.easing.easeInOut};

  @media (max-width: 768px) {
    padding: ${SPACING.scale[4]};
  }
`;

const SettingsHeader = styled.div`
  margin-bottom: ${SPACING.scale[6]};
  
  h1 {
    font-family: ${TYPOGRAPHY.fontFamilies.primary};
    font-size: ${TYPOGRAPHY.fontSizes['2xl']};
    font-weight: ${TYPOGRAPHY.fontWeights.medium};
    color: ${({ theme }) => theme.text.primary};
  }
`;

const ErrorFallback = styled.div`
  padding: ${SPACING.scale[4]};
  margin: ${SPACING.scale[4]} 0;
  border: 1px solid ${({ theme }) => theme.error.main};
  border-radius: 4px;
  color: ${({ theme }) => theme.error.main};
`;

// Settings component with enhanced error handling and accessibility
const Settings: React.FC = React.memo(() => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [error, setError] = useState<Error | null>(null);

  // Define tabs with accessibility support
  const tabs = useMemo(() => [
    {
      id: 'profile',
      label: 'Profile Settings',
      content: <Profile />,
      ariaLabel: 'Profile settings tab'
    },
    {
      id: 'security',
      label: 'Security Settings',
      content: <SecurityPage />,
      ariaLabel: 'Security settings tab'
    }
  ], []);

  // Debounced URL parameter update
  const updateUrlParams = useMemo(
    () => debounce((tab: string) => {
      setSearchParams({ tab }, { replace: true });
    }, 300),
    [setSearchParams]
  );

  // Handle tab changes with accessibility announcements
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    updateUrlParams(tabId);

    // Announce tab change to screen readers
    const announcement = document.getElementById('tab-announcement');
    if (announcement) {
      announcement.textContent = `${tabId} tab selected`;
    }
  };

  // Error handler for error boundary
  const handleError = (error: Error) => {
    console.error('Settings page error:', error);
    setError(error);
  };

  // Redirect if user is not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  return (
    <ErrorBoundary
      FallbackComponent={({ error }) => (
        <ErrorFallback role="alert" aria-live="polite">
          <Typography variant="h6">Error Loading Settings</Typography>
          <Typography>{error.message}</Typography>
        </ErrorFallback>
      )}
      onError={handleError}
    >
      <SettingsContainer>
        <SettingsHeader>
          <Typography variant="h1" component="h1" gutterBottom>
            Settings
          </Typography>
        </SettingsHeader>

        {/* Accessible live region for announcements */}
        <div
          id="tab-announcement"
          className="sr-only"
          role="status"
          aria-live="polite"
        />

        <Suspense
          fallback={
            <Container sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress aria-label="Loading settings" />
            </Container>
          }
        >
          <Tabs
            items={tabs}
            activeTab={activeTab}
            onChange={handleTabChange}
            orientation="horizontal"
            variant="default"
            size="medium"
            ariaLabel="Settings navigation"
            className="settings-tabs"
          />
        </Suspense>

        {error && (
          <ErrorFallback role="alert" aria-live="polite">
            <Typography variant="h6">Error</Typography>
            <Typography>{error.message}</Typography>
          </ErrorFallback>
        )}
      </SettingsContainer>
    </ErrorBoundary>
  );
});

Settings.displayName = 'Settings';

export default Settings;