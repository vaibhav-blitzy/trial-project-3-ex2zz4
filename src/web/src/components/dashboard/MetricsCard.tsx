/**
 * @fileoverview Material Design 3.0 Metrics Card Component
 * Implements accessible, real-time updating metrics visualization
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import clsx from 'clsx'; // v2.0.0
import { BaseComponentProps } from '../../types/components.types';
import Card from '../common/Card';
import ProgressBar from '../common/ProgressBar';
import { useTheme } from '../../hooks/useTheme';
import { TRANSITIONS } from '../../constants/theme.constants';

/**
 * Props interface for MetricsCard component with comprehensive type safety
 */
interface MetricsCardProps extends BaseComponentProps {
  /** Title of the metric with i18n support */
  title: string;
  /** Current value of the metric with locale formatting */
  value: number;
  /** Target value for the metric with validation */
  target: number;
  /** Unit of measurement with i18n support */
  unit?: string;
  /** Trend direction with visual indicator */
  trend?: 'up' | 'down' | 'neutral';
  /** Theme-aware visual variant */
  variant?: 'primary' | 'success' | 'warning' | 'error';
  /** Toggle for animated progress bar */
  showProgress?: boolean;
  /** Optional click handler with keyboard support */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Calculates progress percentage with validation and optimization
 */
const calculateProgress = (value: number, target: number): number => {
  if (target <= 0) return 0;
  const progress = (value / target) * 100;
  return Math.min(Math.max(progress, 0), 100);
};

/**
 * Determines theme-aware color variant based on progress and trend
 */
const getVariantColor = (progress: number, trend: 'up' | 'down' | 'neutral'): string => {
  if (progress >= 100) return 'success';
  if (progress < 50) return 'warning';
  if (trend === 'down') return 'error';
  if (trend === 'up') return 'success';
  return 'primary';
};

/**
 * Material Design 3.0 Metrics Card Component
 * Implements WCAG 2.1 Level AA accessibility standards
 */
const MetricsCard: React.FC<MetricsCardProps> = React.memo(({
  title,
  value,
  target,
  unit = '',
  trend = 'neutral',
  variant = 'primary',
  showProgress = true,
  onClick,
  className,
  style,
  ariaLabel,
  testId,
}) => {
  const { theme } = useTheme();

  // Memoized progress calculation
  const progress = useMemo(() => calculateProgress(value, target), [value, target]);

  // Memoized variant color
  const cardVariant = useMemo(() => getVariantColor(progress, trend), [progress, trend]);

  // Memoized trend icon and color
  const trendIndicator = useMemo(() => {
    const icons = {
      up: '↑',
      down: '↓',
      neutral: '→'
    };
    const colors = {
      up: theme.palette.success.main,
      down: theme.palette.error.main,
      neutral: theme.palette.text.secondary
    };
    return { icon: icons[trend], color: colors[trend] };
  }, [trend, theme]);

  // Format value with locale support
  const formattedValue = useMemo(() => {
    return new Intl.NumberFormat(navigator.language, {
      maximumFractionDigits: 1
    }).format(value);
  }, [value]);

  return (
    <Card
      variant="elevated"
      elevation={2}
      className={clsx('metrics-card', className)}
      style={{
        padding: theme.spacing(3),
        transition: `all ${TRANSITIONS.duration.standard}ms ${TRANSITIONS.easing.easeInOut}`,
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onClick={onClick}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel || `${title} metric: ${formattedValue} ${unit}`}
      data-testid={testId}
    >
      <div className="metrics-card__header">
        <h3
          className="metrics-card__title"
          style={{
            color: theme.palette.text.primary,
            fontSize: theme.typography.h6.fontSize,
            fontWeight: theme.typography.fontWeightMedium,
            margin: 0
          }}
        >
          {title}
        </h3>
        <span
          className="metrics-card__trend"
          style={{
            color: trendIndicator.color,
            fontSize: theme.typography.body2.fontSize,
            marginLeft: theme.spacing(1)
          }}
          aria-label={`Trend: ${trend}`}
        >
          {trendIndicator.icon}
        </span>
      </div>

      <div
        className="metrics-card__value"
        style={{
          marginTop: theme.spacing(2),
          marginBottom: showProgress ? theme.spacing(2) : 0
        }}
      >
        <span
          style={{
            fontSize: theme.typography.h4.fontSize,
            fontWeight: theme.typography.fontWeightBold,
            color: theme.palette[variant].main
          }}
        >
          {formattedValue}
        </span>
        {unit && (
          <span
            style={{
              marginLeft: theme.spacing(1),
              color: theme.palette.text.secondary,
              fontSize: theme.typography.body2.fontSize
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {showProgress && (
        <div className="metrics-card__progress">
          <ProgressBar
            value={progress}
            variant={cardVariant}
            size="small"
            showValue={false}
            aria-label={`Progress: ${Math.round(progress)}%`}
          />
          <span
            style={{
              fontSize: theme.typography.caption.fontSize,
              color: theme.palette.text.secondary,
              marginTop: theme.spacing(1)
            }}
          >
            {Math.round(progress)}% of target
          </span>
        </div>
      )}
    </Card>
  );
});

MetricsCard.displayName = 'MetricsCard';

export default MetricsCard;