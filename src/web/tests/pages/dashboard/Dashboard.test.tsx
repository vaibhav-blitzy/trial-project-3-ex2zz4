/**
 * @fileoverview Test suite for the Dashboard component
 * Implements comprehensive testing for real-time metrics, accessibility, and Material Design compliance
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, test, expect, jest, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { setupServer } from 'msw/node';
import { renderWithProviders } from '@testing-library/react-redux';
import { axe, toHaveNoViolations } from '@axe-core/react';
import { act } from '@testing-library/react-hooks';
import Dashboard from '../../src/pages/dashboard/Dashboard';
import { THEME_MODES } from '../../src/constants/theme.constants';
import { WebSocketEventType } from '../../src/hooks/useWebSocket';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((data: any) => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  readyState = WebSocket.CONNECTING;
  send = jest.fn();
  close = jest.fn();
}

// Mock initial dashboard metrics
const mockDashboardMetrics = {
  totalTasks: 150,
  completedTasks: 95,
  activeProjects: 12,
  teamMembers: 25,
  tasksTrend: {
    direction: 'up',
    percentage: 15
  },
  completionRate: 63,
  projectProgress: 78,
  teamActivity: 85
};

// Mock WebSocket events
const mockWebSocketEvents = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  message: jest.fn(),
  error: jest.fn()
};

// Setup MSW server for API mocking
const server = setupServer();

describe('Dashboard Component', () => {
  // Global test setup
  beforeAll(() => {
    server.listen();
    // Mock WebSocket global
    global.WebSocket = MockWebSocket as any;
  });

  beforeEach(() => {
    // Reset WebSocket instance and mocks
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('Component Rendering', () => {
    test('should render dashboard layout with correct Material Design components', async () => {
      const { container } = renderWithProviders(<Dashboard />);
      
      // Check for Material Design layout structure
      expect(container.querySelector('.MuiContainer-root')).toBeInTheDocument();
      expect(container.querySelector('.MuiGrid-container')).toBeInTheDocument();
      
      // Verify metrics cards are rendered
      const metricsCards = container.querySelectorAll('.metrics-card');
      expect(metricsCards).toHaveLength(4);
    });

    test('should display loading skeleton during data fetch', () => {
      const { container } = renderWithProviders(<Dashboard />);
      
      // Check for skeleton loading state
      const skeletons = container.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons).toHaveLength(4);
    });

    test('should handle API errors gracefully with error boundary', async () => {
      // Mock API error
      server.use(
        // Add MSW handler for error simulation
      );

      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    test('should establish WebSocket connection on mount', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(mockWebSocketEvents.connect).toHaveBeenCalled();
      });
    });

    test('should update metrics within 2 seconds of WebSocket event', async () => {
      const { container } = renderWithProviders(<Dashboard />);
      
      // Simulate WebSocket message
      const updatedMetrics = {
        ...mockDashboardMetrics,
        totalTasks: 160
      };

      act(() => {
        const ws = new MockWebSocket();
        ws.onmessage?.({
          data: JSON.stringify({
            type: 'task.update' as WebSocketEventType,
            payload: updatedMetrics
          })
        });
      });

      await waitFor(() => {
        const totalTasksCard = screen.getByText('Total Tasks').closest('.metrics-card');
        expect(within(totalTasksCard!).getByText('160')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    test('should handle reconnection after connection loss', async () => {
      renderWithProviders(<Dashboard />);
      
      // Simulate connection loss
      act(() => {
        const ws = new MockWebSocket();
        ws.onclose?.();
      });

      await waitFor(() => {
        expect(mockWebSocketEvents.connect).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility', () => {
    test('should meet WCAG 2.1 Level AA standards', async () => {
      const { container } = renderWithProviders(<Dashboard />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should support keyboard navigation', () => {
      renderWithProviders(<Dashboard />);
      
      const metricsCards = screen.getAllByRole('article');
      metricsCards.forEach(card => {
        expect(card).toHaveAttribute('tabIndex', '0');
      });
    });

    test('should have correct ARIA attributes', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar');
        progressBars.forEach(bar => {
          expect(bar).toHaveAttribute('aria-valuemin', '0');
          expect(bar).toHaveAttribute('aria-valuemax', '100');
          expect(bar).toHaveAttribute('aria-valuenow');
        });
      });
    });
  });

  describe('Theme Integration', () => {
    test('should apply correct theme based on system preference', async () => {
      const { container } = renderWithProviders(<Dashboard />);
      
      // Mock system dark mode preference
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));

      await waitFor(() => {
        const dashboard = container.firstChild;
        const computedStyle = window.getComputedStyle(dashboard!);
        expect(computedStyle.backgroundColor).toBe(COLORS.dark.background.default);
      });
    });

    test('should maintain color contrast ratios in both themes', async () => {
      const { container, rerender } = renderWithProviders(<Dashboard />);
      
      // Test light theme
      let results = await axe(container);
      expect(results).toHaveNoViolations();

      // Switch to dark theme
      rerender(<Dashboard theme={THEME_MODES.DARK} />);
      results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Performance', () => {
    test('should render initial metrics within performance budget', async () => {
      const startTime = performance.now();
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        screen.getByText('Total Tasks');
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(200); // 200ms budget
    });

    test('should maintain smooth animations during theme transitions', async () => {
      const { container } = renderWithProviders(<Dashboard />);
      
      const dashboard = container.firstChild as HTMLElement;
      const transition = window.getComputedStyle(dashboard).transition;
      
      expect(transition).toContain(`${TRANSITIONS.duration.standard}ms`);
      expect(transition).toContain(TRANSITIONS.easing.easeInOut);
    });
  });
});