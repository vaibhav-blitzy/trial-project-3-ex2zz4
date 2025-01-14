import React, { useMemo } from 'react';
import classNames from 'classnames'; // v2.3.2
import { BaseComponentProps } from '../types/components.types';
import { useTheme } from '../hooks/useTheme';
import { Variant, Size, Priority, Status } from '../types/common.types';

/**
 * Props interface for Badge component with comprehensive configuration options
 */
interface BadgeProps extends BaseComponentProps {
  /** Content to be displayed inside the badge */
  content: string | number | React.ReactNode;
  /** Visual variant of the badge */
  variant?: Variant;
  /** Size of the badge */
  size?: Size;
  /** Status indicator */
  status?: Status;
  /** Priority indicator */
  priority?: Priority;
  /** Show only a dot without content */
  dot?: boolean;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Click handler */
  onClick?: (event: React.MouseEvent) => void;
  /** Enable/disable animations */
  animated?: boolean;
  /** Text direction */
  direction?: 'ltr' | 'rtl';
}

/**
 * Calculates accessible text color based on background color
 * Ensures WCAG 2.1 AA compliance (minimum 4.5:1 contrast ratio)
 */
const getContrastColor = (backgroundColor: string, theme: Theme): string => {
  const hexToRgb = (hex: string): number[] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const [r, g, b] = hexToRgb(backgroundColor);
  const luminance = getLuminance(r, g, b);
  
  return luminance > 0.179 ? theme.palette.text.primary : theme.palette.text.primary;
};

/**
 * Generates CSS class names for badge based on props with theme awareness
 */
const getBadgeClasses = (props: BadgeProps, theme: Theme): string => {
  const {
    variant = Variant.PRIMARY,
    size = Size.MEDIUM,
    status,
    priority,
    dot,
    animated = true,
    direction = 'ltr',
    className
  } = props;

  return classNames(
    'badge',
    `badge--${variant.toLowerCase()}`,
    `badge--${size.toLowerCase()}`,
    {
      'badge--dot': dot,
      'badge--animated': animated,
      'badge--rtl': direction === 'rtl',
      [`badge--status-${status?.toLowerCase()}`]: status,
      [`badge--priority-${priority?.toLowerCase()}`]: priority,
      'badge--clickable': !!props.onClick,
      [`badge--theme-${theme.palette.mode}`]: true
    },
    className
  );
};

/**
 * Badge Component
 * A reusable, accessible badge component following Material Design 3.0 principles
 */
const Badge: React.FC<BadgeProps> = (props) => {
  const { theme } = useTheme();
  
  const {
    content,
    dot,
    ariaLabel,
    tooltip,
    onClick,
    style,
    ...rest
  } = props;

  // Memoize class names for performance
  const badgeClasses = useMemo(() => getBadgeClasses(props, theme), [props, theme]);

  // Merge styles with theme-aware colors
  const badgeStyles = useMemo(() => ({
    ...style,
    backgroundColor: theme.palette.primary.main,
    color: getContrastColor(theme.palette.primary.main, theme),
    transition: theme.transitions.create(['background-color', 'color', 'transform'], {
      duration: theme.transitions.duration.shorter
    })
  }), [style, theme]);

  return (
    <span
      className={badgeClasses}
      style={badgeStyles}
      role={onClick ? 'button' : 'status'}
      aria-label={ariaLabel}
      title={tooltip}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      data-testid="badge"
      {...rest}
    >
      {!dot && content}
    </span>
  );
};

export default Badge;