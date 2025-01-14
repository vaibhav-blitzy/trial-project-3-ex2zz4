/**
 * @fileoverview Test suite for ProjectCard component
 * Implements comprehensive testing for rendering, themes, accessibility and interactions
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, describe, it, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material';
import ProjectCard from '../../src/components/projects/ProjectCard';
import { IProject } from '../../src/interfaces/project.interface';
import { Priority, Status } from '../../src/types/common.types';
import { getTheme } from '../../src/config/theme.config';
import { THEME_MODES, TRANSITIONS } from '../../src/constants/theme.constants';

/**
 * Helper function to render component with theme provider
 */
const renderWithTheme = (
  children: React.ReactNode,
  themeMode: THEME_MODES = THEME_MODES.LIGHT
) => {
  const theme = getTheme(themeMode);
  return render(
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
};

/**
 * Mock project data for testing
 */
const mockProject: IProject = {
  id: 'test-project-1',
  name: 'Test Project',
  description: 'A test project description that might be very long and need truncation in the UI',
  priority: Priority.HIGH,
  progress: 75,
  status: Status.ACTIVE,
  teamId: 'team-1',
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-02').toISOString()
};

describe('ProjectCard Component', () => {
  describe('Visual Rendering', () => {
    it('should render project name correctly', () => {
      renderWithTheme(<ProjectCard project={mockProject} />);
      expect(screen.getByText(mockProject.name)).toBeInTheDocument();
    });

    it('should render project description with proper styling', () => {
      renderWithTheme(<ProjectCard project={mockProject} />);
      const description = screen.getByText(mockProject.description);
      expect(description).toHaveStyle({
        transition: `color ${TRANSITIONS.duration.standard}ms ${TRANSITIONS.easing.easeInOut}`
      });
    });

    it('should display correct priority indicator', () => {
      renderWithTheme(<ProjectCard project={mockProject} />);
      const priorityIndicator = screen.getByRole('img', {
        name: /high priority project/i
      });
      expect(priorityIndicator).toBeInTheDocument();
    });

    it('should render progress bar with correct value', () => {
      renderWithTheme(<ProjectCard project={mockProject} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('should display correct status with theme-aware color', () => {
      renderWithTheme(<ProjectCard project={mockProject} />);
      const status = screen.getByText(mockProject.status);
      expect(status).toHaveStyle({
        transition: `color ${TRANSITIONS.duration.standard}ms ${TRANSITIONS.easing.easeInOut}`
      });
    });
  });

  describe('Theme Support', () => {
    it('should apply light theme styles correctly', () => {
      renderWithTheme(<ProjectCard project={mockProject} />);
      const card = screen.getByRole('article');
      const theme = getTheme(THEME_MODES.LIGHT);
      expect(card).toHaveStyle({
        backgroundColor: theme.palette.background.paper
      });
    });

    it('should apply dark theme styles correctly', () => {
      renderWithTheme(<ProjectCard project={mockProject} />, THEME_MODES.DARK);
      const card = screen.getByRole('article');
      const theme = getTheme(THEME_MODES.DARK);
      expect(card).toHaveStyle({
        backgroundColor: theme.palette.background.paper
      });
    });

    it('should transition theme changes smoothly', () => {
      const { rerender } = renderWithTheme(<ProjectCard project={mockProject} />);
      const card = screen.getByRole('article');
      
      expect(card).toHaveStyle({
        transition: expect.stringContaining(TRANSITIONS.duration.standard.toString())
      });

      rerender(
        <ThemeProvider theme={getTheme(THEME_MODES.DARK)}>
          <ProjectCard project={mockProject} />
        </ThemeProvider>
      );

      expect(card).toHaveStyle({
        transition: expect.stringContaining(TRANSITIONS.duration.standard.toString())
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithTheme(<ProjectCard project={mockProject} />);
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', `Project: ${mockProject.name}`);
    });

    it('should be keyboard navigable when interactive', () => {
      const onClickMock = jest.fn();
      renderWithTheme(<ProjectCard project={mockProject} onClick={onClickMock} />);
      const card = screen.getByRole('article');

      expect(card).toHaveAttribute('tabIndex', '0');
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(onClickMock).toHaveBeenCalledWith(mockProject);

      fireEvent.keyDown(card, { key: ' ' });
      expect(onClickMock).toHaveBeenCalledTimes(2);
    });

    it('should have proper focus indicators', () => {
      const onClickMock = jest.fn();
      renderWithTheme(<ProjectCard project={mockProject} onClick={onClickMock} />);
      const card = screen.getByRole('article');

      fireEvent.focus(card);
      expect(card).toHaveStyle({
        outline: expect.any(String)
      });
    });

    it('should have accessible progress bar', () => {
      renderWithTheme(<ProjectCard project={mockProject} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Interactions', () => {
    it('should handle click events', async () => {
      const onClickMock = jest.fn();
      renderWithTheme(<ProjectCard project={mockProject} onClick={onClickMock} />);
      
      const card = screen.getByRole('article');
      await userEvent.click(card);
      expect(onClickMock).toHaveBeenCalledWith(mockProject);
    });

    it('should show hover state when interactive', async () => {
      const onClickMock = jest.fn();
      renderWithTheme(<ProjectCard project={mockProject} onClick={onClickMock} />);
      
      const card = screen.getByRole('article');
      await userEvent.hover(card);
      expect(card).toHaveStyle({
        cursor: 'pointer'
      });
    });

    it('should not be interactive without onClick handler', () => {
      renderWithTheme(<ProjectCard project={mockProject} />);
      const card = screen.getByRole('article');
      expect(card).not.toHaveAttribute('tabIndex');
      expect(card).toHaveStyle({
        cursor: 'default'
      });
    });

    it('should handle touch interactions', async () => {
      const onClickMock = jest.fn();
      renderWithTheme(<ProjectCard project={mockProject} onClick={onClickMock} />);
      
      const card = screen.getByRole('article');
      fireEvent.touchStart(card);
      fireEvent.touchEnd(card);
      expect(onClickMock).toHaveBeenCalledWith(mockProject);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing project data gracefully', () => {
      const incompleteProject = { ...mockProject, description: undefined };
      renderWithTheme(<ProjectCard project={incompleteProject as IProject} />);
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should handle invalid progress values', () => {
      const invalidProject = { ...mockProject, progress: 150 };
      renderWithTheme(<ProjectCard project={invalidProject} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });
});