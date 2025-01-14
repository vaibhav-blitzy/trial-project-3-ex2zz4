/**
 * @fileoverview Main Layout Component
 * Implements Material Design 3.0 layout structure with enhanced accessibility
 * Features responsive container management, theme support, and error boundaries
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { styled } from '@emotion/styled';
import { Box, Container, useTheme } from '@mui/material'; // v5.0.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0

import Header from './Header';
import LayoutSidebar from './Sidebar';
import Footer from './Footer';
import useAuth from '../../hooks/useAuth';
import { SPACING, TRANSITIONS, BREAKPOINTS } from '../../constants/theme.constants';

/**
 * Props interface for MainLayout component
 */
interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  skipHeader?: boolean;
  skipFooter?: boolean;
  customSidebar?: React.ReactNode;
  maxWidth?: string | false;
}

/**
 * Styled components with theme-aware transitions and responsive behavior
 */
const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.palette.background.default};
  transition: background-color ${TRANSITIONS.duration.shortest} ${TRANSITIONS.easing.easeInOut};
  position: relative;
  overflow-x: hidden;

  @media print {
    background-color: white;
  }
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: ${SPACING.scale[4]};
  margin-left: 0;
  transition: margin-left ${TRANSITIONS.duration.shortest} ${TRANSITIONS.easing.easeInOut};

  ${BREAKPOINTS.up('md')} {
    margin-left: ${({ theme }) => theme.sidebar?.isOpen ? '240px' : '0'};
  }

  [dir="rtl"] & {
    margin-left: 0;
    margin-right: ${({ theme }) => theme.sidebar?.isOpen ? '240px' : '0'};
  }
`;

/**
 * Error fallback component for error boundary
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <Box
    role="alert"
    p={3}
    m={2}
    bgcolor="error.light"
    color="error.contrastText"
    borderRadius={1}
  >
    <h2>Something went wrong:</h2>
    <pre>{error.message}</pre>
  </Box>
);

/**
 * Main layout component implementing Material Design 3.0 principles
 */
const MainLayout: React.FC<MainLayoutProps> = React.memo(({
  children,
  className,
  skipHeader = false,
  skipFooter = false,
  customSidebar,
  maxWidth = 'lg'
}) => {
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const dispatch = useDispatch();
  const contentRef = useRef<HTMLDivElement>(null);

  // Get sidebar state from Redux store
  const { sidebarOpen } = useSelector((state: any) => state.ui);

  /**
   * Handle sidebar toggle with smooth transitions
   */
  const handleSidebarToggle = useCallback(() => {
    dispatch({ type: 'ui/toggleSidebar' });
  }, [dispatch]);

  /**
   * Set up ResizeObserver for dynamic content adjustments
   */
  useEffect(() => {
    if (!contentRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Trigger layout recalculation if needed
      if (contentRef.current) {
        contentRef.current.style.minHeight = `${window.innerHeight}px`;
      }
    });

    resizeObserver.observe(contentRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <LayoutContainer className={className}>
        {!skipHeader && (
          <Header
            onMenuClick={handleSidebarToggle}
            testId="main-header"
          />
        )}

        {isAuthenticated && (
          customSidebar || (
            <LayoutSidebar />
          )
        )}

        <MainContent
          ref={contentRef}
          role="main"
          aria-label="Main content"
          data-testid="main-content"
        >
          <Container
            maxWidth={maxWidth}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              py: { xs: 2, md: 3 },
              px: { xs: 1, md: 2 }
            }}
          >
            {children}
          </Container>
        </MainContent>

        {!skipFooter && <Footer />}
      </LayoutContainer>
    </ErrorBoundary>
  );
});

// Display name for debugging
MainLayout.displayName = 'MainLayout';

export default MainLayout;