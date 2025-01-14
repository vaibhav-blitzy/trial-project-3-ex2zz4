import React, { useCallback, useMemo } from 'react';
import clsx from 'clsx'; // v2.0.0
import { BaseComponentProps } from '../../types/components.types';
import { useTheme } from '../../hooks/useTheme';
import { TRANSITIONS } from '../../constants/theme.constants';

/**
 * Props interface for Card component with enhanced theme and accessibility support
 */
interface CardProps extends BaseComponentProps {
  /** Visual style variant of the card */
  variant?: 'elevated' | 'outlined' | 'filled';
  /** Shadow elevation level for elevated variant */
  elevation?: 1 | 2 | 3 | 4 | 5;
  /** Card content */
  children: React.ReactNode;
  /** Optional click handler for interactive cards */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** ARIA role for accessibility */
  role?: string;
  /** Optional color scheme for themed cards */
  colorScheme?: 'primary' | 'secondary' | 'neutral';
  /** Enables hover and active states with ripple effect */
  interactive?: boolean;
  /** Custom tab index for keyboard navigation */
  tabIndex?: number;
}

/**
 * A reusable card component following Material Design 3.0 principles
 * Implements WCAG 2.1 Level AA compliance with comprehensive ARIA support
 */
const Card: React.FC<CardProps> = React.memo(({
  variant = 'elevated',
  elevation = 1,
  children,
  className,
  style,
  onClick,
  role = 'article',
  colorScheme = 'neutral',
  interactive = false,
  tabIndex,
  ariaLabel,
  ariaDescribedBy,
  ariaLabelledBy,
  testId,
}) => {
  const { theme } = useTheme();

  // Memoized elevation styles based on theme and variant
  const elevationStyle = useMemo(() => {
    if (variant !== 'elevated') return {};
    const elevationValues = {
      1: '0 2px 4px rgba(0,0,0,0.12)',
      2: '0 4px 8px rgba(0,0,0,0.16)',
      3: '0 8px 16px rgba(0,0,0,0.16)',
      4: '0 12px 24px rgba(0,0,0,0.20)',
      5: '0 16px 32px rgba(0,0,0,0.24)'
    };
    return { boxShadow: elevationValues[elevation] };
  }, [variant, elevation]);

  // Memoized background color based on theme and variant
  const backgroundColor = useMemo(() => {
    const colors = {
      elevated: theme.palette.background.paper,
      outlined: 'transparent',
      filled: theme.palette.background.default
    };
    return colors[variant];
  }, [theme, variant]);

  // Memoized border styles based on theme and variant
  const borderStyle = useMemo(() => {
    if (variant !== 'outlined') return {};
    return {
      border: `1px solid ${theme.palette.divider}`
    };
  }, [theme, variant]);

  // Memoized color scheme styles
  const colorSchemeStyle = useMemo(() => {
    if (colorScheme === 'neutral') return {};
    const colors = {
      primary: {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText
      },
      secondary: {
        backgroundColor: theme.palette.secondary.main,
        color: theme.palette.secondary.contrastText
      }
    };
    return colors[colorScheme];
  }, [theme, colorScheme]);

  // Handle keyboard interaction for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (interactive && onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
    }
  }, [interactive, onClick]);

  // Generate CSS classes
  const cardClasses = clsx(
    'md3-card',
    {
      'md3-card--elevated': variant === 'elevated',
      'md3-card--outlined': variant === 'outlined',
      'md3-card--filled': variant === 'filled',
      'md3-card--interactive': interactive,
      [`md3-card--${colorScheme}`]: colorScheme !== 'neutral'
    },
    className
  );

  return (
    <div
      className={cardClasses}
      style={{
        position: 'relative',
        borderRadius: theme.shape.borderRadius,
        padding: theme.spacing(3),
        transition: `all ${TRANSITIONS.duration.standard}ms ${TRANSITIONS.easing.easeInOut}`,
        cursor: interactive ? 'pointer' : 'default',
        contain: 'content',
        ...elevationStyle,
        ...borderStyle,
        backgroundColor,
        ...colorSchemeStyle,
        ...style
      }}
      onClick={interactive ? onClick : undefined}
      onKeyDown={handleKeyDown}
      role={role}
      tabIndex={interactive ? tabIndex ?? 0 : undefined}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-labelledby={ariaLabelledBy}
      data-testid={testId}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;