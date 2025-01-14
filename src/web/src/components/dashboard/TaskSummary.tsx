/**
 * TaskSummary Component
 * Displays a comprehensive summary of tasks including status distribution,
 * completion progress, and priority breakdown following Material Design 3.0 principles.
 * @version 1.0.0
 */

import React, { useMemo } from 'react'; // ^18.0.0
import { useSelector } from 'react-redux'; // ^8.0.0
import { BaseComponentProps } from '../../types/components.types';
import Card from '../common/Card';
import ProgressBar from '../common/ProgressBar';
import { selectTasksByStatus, selectTasksByPriority } from '../../store/tasks/tasks.selectors';
import { TaskStatus, TaskPriority } from '../../interfaces/task.interface';

/**
 * Props interface for TaskSummary component
 */
interface TaskSummaryProps extends BaseComponentProps {
  showProgress?: boolean;
  showPriority?: boolean;
  variant?: 'elevated' | 'outlined' | 'filled';
  loading?: boolean;
  error?: Error | null;
}

/**
 * Memoized function to calculate overall task completion percentage
 */
const calculateProgress = (tasksByStatus: Record<TaskStatus, { tasks: any[]; count: number }>) => {
  const totalTasks = Object.values(tasksByStatus).reduce((sum, { count }) => sum + count, 0);
  const completedTasks = tasksByStatus[TaskStatus.DONE]?.count || 0;
  
  if (totalTasks === 0) return 0;
  return Math.min(Math.round((completedTasks / totalTasks) * 100), 100);
};

/**
 * Memoized function to calculate priority distribution
 */
const getPriorityBreakdown = (tasksByPriority: Record<TaskPriority, { tasks: any[]; count: number }>) => {
  const total = Object.values(tasksByPriority).reduce((sum, { count }) => sum + count, 0);
  
  return Object.entries(tasksByPriority).reduce((acc, [priority, { count }]) => {
    const percentage = total === 0 ? 0 : Math.round((count / total) * 100);
    return {
      ...acc,
      [priority]: {
        percentage,
        count
      }
    };
  }, {} as Record<string, { percentage: number; count: number }>);
};

/**
 * TaskSummary component implementing Material Design 3.0 principles
 * with comprehensive accessibility support
 */
const TaskSummary: React.FC<TaskSummaryProps> = React.memo(({
  showProgress = true,
  showPriority = true,
  variant = 'elevated',
  loading = false,
  error = null,
  className,
  style,
  ariaLabel,
  testId
}) => {
  // Redux selectors for task metrics
  const tasksByStatus = useSelector(selectTasksByStatus);
  const tasksByPriority = useSelector(selectTasksByPriority);

  // Memoized calculations
  const progress = useMemo(() => calculateProgress(tasksByStatus), [tasksByStatus]);
  const priorityBreakdown = useMemo(() => getPriorityBreakdown(tasksByPriority), [tasksByPriority]);

  // Error state handling
  if (error) {
    return (
      <Card
        variant="outlined"
        className="task-summary-error"
        role="alert"
        ariaLabel="Task summary error"
      >
        <div className="error-message">
          {error.message || 'Failed to load task summary'}
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant={variant}
      className={`task-summary ${className || ''}`}
      style={{
        padding: '24px',
        minWidth: '300px',
        ...style
      }}
      role="region"
      ariaLabel={ariaLabel || 'Task summary'}
      testId={testId || 'task-summary'}
    >
      {/* Loading state */}
      {loading && (
        <div className="task-summary-skeleton" aria-busy="true">
          <div className="skeleton-line" />
          <div className="skeleton-progress" />
          <div className="skeleton-breakdown" />
        </div>
      )}

      {/* Task Status Distribution */}
      {!loading && (
        <div className="task-status-distribution">
          <h3 className="summary-title" tabIndex={0}>
            Task Overview
          </h3>
          
          <div className="status-counts" role="list">
            {Object.entries(tasksByStatus).map(([status, { count }]) => (
              <div 
                key={status}
                className="status-item"
                role="listitem"
                aria-label={`${status}: ${count} tasks`}
              >
                <span className="status-label">{status}</span>
                <span className="status-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {!loading && showProgress && (
        <div className="task-progress" aria-label="Overall task progress">
          <ProgressBar
            value={progress}
            label="Task Completion"
            showValue
            size="medium"
            variant="primary"
          />
        </div>
      )}

      {/* Priority Breakdown */}
      {!loading && showPriority && (
        <div className="priority-breakdown">
          <h4 className="breakdown-title" tabIndex={0}>
            Priority Distribution
          </h4>
          
          <div className="priority-stats" role="list">
            {Object.entries(priorityBreakdown).map(([priority, { percentage, count }]) => (
              <div
                key={priority}
                className={`priority-item priority-${priority.toLowerCase()}`}
                role="listitem"
                aria-label={`${priority}: ${count} tasks, ${percentage}%`}
              >
                <span className="priority-label">{priority}</span>
                <div className="priority-bar">
                  <div 
                    className="priority-fill"
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <span className="priority-percentage">{percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
});

TaskSummary.displayName = 'TaskSummary';

export default TaskSummary;