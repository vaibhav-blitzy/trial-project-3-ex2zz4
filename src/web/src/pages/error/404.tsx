/**
 * @fileoverview 404 Error Page Component
 * Implements Material Design 3.0 principles with enhanced accessibility
 * Features responsive layout, theme transitions, and clear navigation
 * @version 1.0.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Box } from '@mui/material'; // v5.0.0
import { styled } from '@emotion/styled'; // v11.0.0

import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/common/Button';
import { ROUTES } from '../../constants/routes.constants';
import { SPACING, TRANSITIONS, BREAKPOINTS } from '../../constants/theme.constants';

// Styled components with theme-aware transitions
const ErrorContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px);
  text-align: center;
  padding: ${SPACING.scale[4]};
  transition: all ${TRANSITIONS.duration.shortest} ${TRANSITIONS.easing.easeInOut};
`;

const ErrorImage = styled.img`
  max-width: 400px;
  width: 100%;
  height: auto;
  margin-bottom: ${SPACING.scale[4]};
  transition: all ${TRANSITIONS.duration.shortest} ${TRANSITIONS.easing.easeInOut};
  filter: ${props => props.theme.palette.mode === 'dark' ? 'invert(1)' : 'none'};

  ${BREAKPOINTS.down('sm')} {
    max-width: 280px;
  }
`;

/**
 * 404 Error page component with theme support and responsive layout
 * Implements WCAG 2.1 Level AA accessibility standards
 */
const NotFoundPage: React.FC = React.memo(() => {
  const navigate = useNavigate();

  /**
   * Handles navigation back to home page
   * Implements analytics tracking for error page interactions
   */
  const handleGoHome = React.useCallback(() => {
    // Track 404 page navigation event
    if (window.analytics) {
      window.analytics.track('404_navigation', {
        from: window.location.pathname,
        to: ROUTES.ROOT
      });
    }
    navigate(ROUTES.ROOT);
  }, [navigate]);

  return (
    <MainLayout>
      <ErrorContainer maxWidth="md">
        <Box
          component="section"
          role="main"
          aria-labelledby="error-title"
        >
          <ErrorImage
            src="/assets/images/404-illustration.svg"
            alt="Page not found illustration"
            loading="eager"
          />

          <Typography
            variant="h1"
            component="h1"
            id="error-title"
            gutterBottom
            sx={{
              fontSize: { xs: '2rem', sm: '3rem' },
              fontWeight: 'bold',
              marginBottom: SPACING.scale[4]
            }}
          >
            Page Not Found
          </Typography>

          <Typography
            variant="h5"
            component="p"
            color="textSecondary"
            sx={{ marginBottom: SPACING.scale[6] }}
          >
            The page you're looking for doesn't exist or has been moved.
          </Typography>

          <Button
            variant="PRIMARY"
            size="LARGE"
            onClick={handleGoHome}
            ariaLabel="Return to home page"
            startIcon="🏠"
            data-testid="go-home-button"
          >
            Return to Home
          </Button>
        </Box>
      </ErrorContainer>
    </MainLayout>
  );
});

// Display name for debugging
NotFoundPage.displayName = 'NotFoundPage';

export default NotFoundPage;