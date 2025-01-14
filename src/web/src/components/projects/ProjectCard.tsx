/**
 * @fileoverview Material Design 3.0 Project Card Component
 * Implements accessible, theme-aware project information display with interactive capabilities
 * @version 1.0.0
 */

import React, { useCallback, useMemo } from 'react';
import clsx from 'clsx'; // v2.0.0
import { IProject } from '../../interfaces/project.interface';
import Card from '../common/Card';
import ProgressBar from '../common/ProgressBar';
import { useTheme } from '../../hooks/useTheme';
import { TRANSITIONS } from '../../constants/theme.constants';
import { Priority, Status } from '../../types/common.types';

/**
 * Props interface for ProjectCard component
 */
interface ProjectCardProps {
  /** Project data to display */
  project: IProject;
  /** Optional click handler for card interaction */
  onClick?: (project: IProject) => void;
  /** Optional CSS class name */
  className?: string;
  /** Card elevation level (1-5) */
  elevation?: 1 | 2 | 3 | 4 | 5;
  /** Card style variant */
  variant?: 'outlined' | 'filled';
}

/**
 * Returns theme-aware color class based on project status
 */
const getStatusColor = (status: Status, theme: Theme): string => {
  const colors = {
    [Status.ACTIVE]: theme.palette.success.main,
    [Status.INACTIVE]: theme.palette.warning.main,
    [Status.DELETED]: theme.palette.error.main
  };
  return colors[status] || theme.palette.text.secondary;
};

/**
 * Returns formatted priority label with proper ARIA attributes
 */
const getPriorityLabel = (priority: Priority): { text: string; icon: string; ariaLabel: string } => {
  const labels = {
    [Priority.HIGH]: {
      text: 'High Priority',
      icon: '🔴',
      ariaLabel: 'High priority project'
    },
    [Priority.MEDIUM]: {
      text: 'Medium Priority',
      icon: '🟡',
      ariaLabel: 'Medium priority project'
    },
    [Priority.LOW]: {
      text: 'Low Priority',
      icon: '🟢',
      ariaLabel: 'Low priority project'
    }
  };
  return labels[priority];
};

/**
 * Material Design 3.0 Project Card Component
 * Implements WCAG 2.1 Level AA accessibility standards
 */
const ProjectCard: React.FC<ProjectCardProps> = React.memo(({
  project,
  onClick,
  className = '',
  elevation = 1,
  variant = 'filled'
}) => {
  const { theme } = useTheme();

  // Memoized priority label
  const priorityLabel = useMemo(() => 
    getPriorityLabel(project.priority), [project.priority]);

  // Memoized status color
  const statusColor = useMemo(() => 
    getStatusColor(project.status, theme), [project.status, theme]);

  // Handle card interaction
  const handleClick = useCallback((event: React.MouseEvent | React.KeyboardEvent) => {
    if (onClick) {
      event.preventDefault();
      onClick(project);
    }
  }, [onClick, project]);

  // Handle keyboard interaction
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick(event);
    }
  }, [handleClick]);

  return (
    <Card
      className={clsx('project-card', className)}
      elevation={elevation}
      variant={variant}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role="article"
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Project: ${project.name}`}
    >
      <div className="project-card__header">
        <h3 
          className="project-card__title"
          style={{
            color: theme.palette.text.primary,
            transition: `color ${TRANSITIONS.duration.standard}ms ${TRANSITIONS.easing.easeInOut}`
          }}
        >
          {project.name}
        </h3>
        <span 
          className="project-card__priority"
          aria-label={priorityLabel.ariaLabel}
          role="img"
        >
          {priorityLabel.icon}
        </span>
      </div>

      <p 
        className="project-card__description"
        style={{
          color: theme.palette.text.secondary,
          transition: `color ${TRANSITIONS.duration.standard}ms ${TRANSITIONS.easing.easeInOut}`
        }}
      >
        {project.description}
      </p>

      <div className="project-card__progress">
        <ProgressBar
          value={project.progress}
          variant="primary"
          size="small"
          label={`Project progress: ${project.progress}%`}
          showValue
          transitionDuration={parseInt(TRANSITIONS.duration.standard)}
        />
      </div>

      <div className="project-card__footer">
        <span 
          className="project-card__status"
          style={{
            color: statusColor,
            transition: `color ${TRANSITIONS.duration.standard}ms ${TRANSITIONS.easing.easeInOut}`
          }}
          aria-label={`Status: ${project.status.toLowerCase()}`}
        >
          {project.status}
        </span>
      </div>
    </Card>
  );
});

ProjectCard.displayName = 'ProjectCard';

export default ProjectCard;