import React, { useMemo, useCallback } from 'react';
import { format } from 'date-fns'; // ^2.30.0
import Card from '../common/Card';
import Badge from '../common/Badge';
import Avatar from '../common/Avatar';
import { ITask, TaskPriority, TaskStatus } from '../../interfaces/task.interface';
import { useTheme } from '../../hooks/useTheme';
import { BaseComponentProps } from '../../types/components.types';

/**
 * Props interface for TaskCard component with accessibility support
 */
interface TaskCardProps extends BaseComponentProps {
  /** Task data to display */
  task: ITask;
  /** Optional click handler for task selection */
  onClick?: (task: ITask) => void;
  /** Whether to show assignee avatars */
  showAssignees?: boolean;
  /** Maximum number of assignees to display */
  maxAssignees?: number;
  /** Accessibility label for the card */
  ariaLabel?: string;
  /** Tab order for keyboard navigation */
  tabIndex?: number;
}

/**
 * Maps task priority to theme-aware color scheme
 */
const getPriorityColor = (priority: TaskPriority, theme: Theme): string => {
  const colors = {
    [TaskPriority.LOW]: theme.palette.success.main,
    [TaskPriority.MEDIUM]: theme.palette.info.main,
    [TaskPriority.HIGH]: theme.palette.warning.main,
    [TaskPriority.URGENT]: theme.palette.error.main,
  };
  return colors[priority] || theme.palette.grey[500];
};

/**
 * Maps task status to theme-aware color scheme
 */
const getStatusColor = (status: TaskStatus, theme: Theme): string => {
  const colors = {
    [TaskStatus.TODO]: theme.palette.grey[500],
    [TaskStatus.IN_PROGRESS]: theme.palette.info.main,
    [TaskStatus.REVIEW]: theme.palette.warning.main,
    [TaskStatus.DONE]: theme.palette.success.main,
  };
  return colors[status] || theme.palette.grey[500];
};

/**
 * Formats the task due date with localization support
 */
const formatDueDate = (date: Date | string | number): string => {
  try {
    return format(new Date(date), 'MMM dd, yyyy');
  } catch {
    return 'Invalid date';
  }
};

/**
 * TaskCard Component
 * A reusable card component for displaying task information following Material Design 3.0
 * Implements WCAG 2.1 Level AA compliance with proper ARIA attributes
 */
const TaskCard: React.FC<TaskCardProps> = React.memo(({
  task,
  onClick,
  showAssignees = true,
  maxAssignees = 3,
  className,
  style,
  ariaLabel,
  tabIndex = 0,
}) => {
  const { theme } = useTheme();

  // Memoize colors for performance
  const priorityColor = useMemo(() => 
    getPriorityColor(task.priority, theme),
    [task.priority, theme]
  );

  const statusColor = useMemo(() => 
    getStatusColor(task.status, theme),
    [task.status, theme]
  );

  // Handle keyboard interaction for accessibility
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick(task);
    }
  }, [onClick, task]);

  // Handle click events
  const handleClick = useCallback(() => {
    onClick?.(task);
  }, [onClick, task]);

  return (
    <Card
      className={className}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? tabIndex : undefined}
      aria-label={ariaLabel || `Task: ${task.title}`}
      elevation={1}
      variant="elevated"
    >
      <div className="task-card__header">
        <h3 className="task-card__title" style={{ margin: 0, color: theme.palette.text.primary }}>
          {task.title}
        </h3>
        <div className="task-card__badges">
          <Badge
            content={task.priority}
            colorScheme={priorityColor}
            ariaLabel={`Priority: ${task.priority}`}
          />
          <Badge
            content={task.status.replace('_', ' ')}
            colorScheme={statusColor}
            ariaLabel={`Status: ${task.status}`}
          />
        </div>
      </div>

      {task.description && (
        <p
          className="task-card__description"
          style={{ color: theme.palette.text.secondary }}
        >
          {task.description}
        </p>
      )}

      <div className="task-card__footer">
        <div className="task-card__due-date" style={{ color: theme.palette.text.secondary }}>
          <span>Due: {formatDueDate(task.dueDate)}</span>
        </div>

        {showAssignees && task.assigneeIds.length > 0 && (
          <div
            className="task-card__assignees"
            role="group"
            aria-label="Task assignees"
          >
            {task.assigneeIds.slice(0, maxAssignees).map((assigneeId) => (
              <Avatar
                key={assigneeId}
                size="small"
                alt={`Assignee ${assigneeId}`}
                ariaLabel={`Assignee ${assigneeId}`}
              />
            ))}
            {task.assigneeIds.length > maxAssignees && (
              <div
                className="task-card__assignees-overflow"
                aria-label={`${task.assigneeIds.length - maxAssignees} more assignees`}
              >
                +{task.assigneeIds.length - maxAssignees}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;