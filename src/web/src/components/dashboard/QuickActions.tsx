/**
 * QuickActions Component
 * Provides quick access to common task and project management actions
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA accessibility
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import styled from '@emotion/styled';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from '@analytics/react';

import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { useNotification } from '../../hooks/useNotification';
import { COLORS, SPACING, TRANSITIONS } from '../../constants/theme.constants';
import { Priority } from '../../types/common.types';

// Interface for component props
interface QuickActionsProps {
  className?: string;
  style?: React.CSSProperties;
  onActionComplete?: (type: 'task' | 'project') => void;
}

// Styled components with theme-aware styling
const StyledCard = styled(Card)`
  padding: ${SPACING.scale[4]};
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${SPACING.scale[3]};
  contain: content;
  will-change: transform, opacity;
`;

const ActionButton = styled(Button)`
  width: 100%;
  min-height: 48px; // WCAG touch target size
  transition: all ${TRANSITIONS.duration.standard}ms ${TRANSITIONS.easing.easeInOut};
  transform: translateZ(0); // GPU acceleration
  
  &:focus-visible {
    outline: 2px solid ${COLORS.light.primary.main};
    outline-offset: 2px;
  }
`;

/**
 * QuickActions component for dashboard quick access buttons
 * Implements WCAG 2.1 Level AA accessibility guidelines
 */
const QuickActions: React.FC<QuickActionsProps> = React.memo(({
  className,
  style,
  onActionComplete
}) => {
  // Hooks
  const { t } = useTranslation();
  const analytics = useAnalytics();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Action handlers with loading states and analytics
  const handleCreateTask = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, task: true }));
      analytics.track('quick_action_clicked', { type: 'create_task' });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      showNotification({
        type: 'success',
        message: t('notifications.taskCreated'),
        autoHide: true,
        duration: 3000
      });

      onActionComplete?.('task');
    } catch (error) {
      showNotification({
        type: 'error',
        message: t('notifications.taskCreateError'),
        autoHide: true,
        duration: 5000
      });
    } finally {
      setLoading(prev => ({ ...prev, task: false }));
    }
  }, [analytics, onActionComplete, showNotification, t]);

  const handleCreateProject = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, project: true }));
      analytics.track('quick_action_clicked', { type: 'create_project' });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      showNotification({
        type: 'success',
        message: t('notifications.projectCreated'),
        autoHide: true,
        duration: 3000
      });

      onActionComplete?.('project');
    } catch (error) {
      showNotification({
        type: 'error',
        message: t('notifications.projectCreateError'),
        autoHide: true,
        duration: 5000
      });
    } finally {
      setLoading(prev => ({ ...prev, project: false }));
    }
  }, [analytics, onActionComplete, showNotification, t]);

  const handleCreateHighPriorityTask = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, highPriority: true }));
      analytics.track('quick_action_clicked', { type: 'create_high_priority_task' });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      showNotification({
        type: 'success',
        message: t('notifications.highPriorityTaskCreated'),
        autoHide: true,
        duration: 3000
      });

      onActionComplete?.('task');
    } catch (error) {
      showNotification({
        type: 'error',
        message: t('notifications.taskCreateError'),
        autoHide: true,
        duration: 5000
      });
    } finally {
      setLoading(prev => ({ ...prev, highPriority: false }));
    }
  }, [analytics, onActionComplete, showNotification, t]);

  return (
    <StyledCard
      className={className}
      style={style}
      variant="elevated"
      elevation={1}
      role="region"
      ariaLabel={t('quickActions.title')}
    >
      <ActionButton
        variant="PRIMARY"
        size="MEDIUM"
        onClick={handleCreateTask}
        loading={loading.task}
        ariaLabel={t('quickActions.createTask')}
        startIcon={<span aria-hidden="true">+</span>}
      >
        {t('quickActions.createTask')}
      </ActionButton>

      <ActionButton
        variant="SECONDARY"
        size="MEDIUM"
        onClick={handleCreateProject}
        loading={loading.project}
        ariaLabel={t('quickActions.createProject')}
        startIcon={<span aria-hidden="true">📋</span>}
      >
        {t('quickActions.createProject')}
      </ActionButton>

      <ActionButton
        variant="PRIMARY"
        size="MEDIUM"
        onClick={handleCreateHighPriorityTask}
        loading={loading.highPriority}
        ariaLabel={t('quickActions.createHighPriorityTask')}
        startIcon={<span aria-hidden="true">🔥</span>}
      >
        {t('quickActions.createHighPriorityTask')}
      </ActionButton>
    </StyledCard>
  );
});

QuickActions.displayName = 'QuickActions';

export default QuickActions;