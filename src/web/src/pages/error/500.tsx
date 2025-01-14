/**
 * @fileoverview Server Error (500) Page Component
 * Implements Material Design 3.0 principles with WCAG 2.1 Level AA compliance
 * Features responsive layout, theme transitions, and keyboard navigation
 * @version 1.0.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@emotion/styled';
import { Typography, Container, Box, useTheme } from '@mui/material';
import Button from '../../components/common/Button';
import MainLayout from '../../components/layout/MainLayout';
import { ROUTES } from '../../constants/routes.constants';

// Styled components with theme-aware styles and responsive design
const ErrorContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - ${({ theme }) => theme.spacing(25)});
  text-align: center;
  padding: ${({ theme }) => theme.spacing(2, 4)};
  max-width: 100%;

  ${({ theme }) => theme.breakpoints.up('md')} {
    padding: ${({ theme }) => theme.spacing(4)};
    max-width: 960px;
  }
`;

const ErrorCode = styled(Typography)`
  font-size: ${({ theme }) => theme.typography.h1.fontSize};
  font-weight: ${({ theme }) => theme.typography.fontWeightBold};
  color: ${({ theme }) => theme.palette.error.main};
  margin-bottom: ${({ theme }) => theme.spacing(2)};

  ${({ theme }) => theme.breakpoints.up('md')} {
    font-size: 6rem;
  }
`;

const ErrorMessage = styled(Typography)`
  font-size: ${({ theme }) => theme.typography.h5.fontSize};
  color: ${({ theme }) => theme.palette.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing(4)};
  max-width: 600px;

  ${({ theme }) => theme.breakpoints.up('md')} {
    font-size: ${({ theme }) => theme.typography.h4.fontSize};
  }
`;

/**
 * Server Error page component with accessibility support and error tracking
 * Implements Material Design 3.0 principles and responsive layout
 */
const ServerError: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const theme = useTheme();

  // Handle return to dashboard with keyboard support
  const handleReturn = React.useCallback(() => {
    navigate(ROUTES.DASHBOARD.ROOT);
  }, [navigate]);

  return (
    <MainLayout>
      <ErrorContainer>
        <Box
          role="alert"
          aria-live="polite"
          display="flex"
          flexDirection="column"
          alignItems="center"
        >
          <ErrorCode variant="h1" component="h1">
            500
          </ErrorCode>
          
          <ErrorMessage variant="h4" component="h2" gutterBottom>
            Internal Server Error
          </ErrorMessage>
          
          <Typography
            variant="body1"
            color="textSecondary"
            paragraph
            sx={{ mb: theme.spacing(4) }}
          >
            We apologize, but something went wrong on our end.
            Our team has been notified and is working to fix the issue.
          </Typography>

          <Button
            variant="PRIMARY"
            size="LARGE"
            onClick={handleReturn}
            ariaLabel="Return to dashboard"
            color="primary"
          >
            Return to Dashboard
          </Button>
        </Box>
      </ErrorContainer>
    </MainLayout>
  );
});

// Display name for debugging
ServerError.displayName = 'ServerError';

export default ServerError;