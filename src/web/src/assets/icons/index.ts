import React, { memo } from 'react'; // ^18.0.0

// Constants aligned with Material Design 3.0 grid system
const DEFAULT_ICON_SIZE = 24;
const DEFAULT_ICON_COLOR = 'currentColor';
const GRID_BASE = 8;
const THEME_TRANSITION_DURATION = 150;

/**
 * Standard interface for icon components following Material Design 3.0
 * and WCAG 2.1 Level AA accessibility guidelines
 */
interface IconProps {
  /** Icon size in pixels, aligned to 8px grid */
  size?: number | string;
  /** Theme-aware color value */
  color?: string;
  /** Optional CSS class for custom styling */
  className?: string;
  /** Accessibility title for the icon */
  title?: string;
  /** ARIA role for accessibility */
  role?: string;
}

/**
 * Factory function to create standardized, accessible icon components
 * following Material Design 3.0 principles
 * @param SVGContent - SVG path data following Material Design guidelines
 * @param props - Standardized icon properties
 * @returns Theme-aware, accessible icon component
 */
const createIcon = (SVGContent: React.ReactNode) => {
  const IconComponent: React.FC<IconProps> = memo(({
    size = DEFAULT_ICON_SIZE,
    color = DEFAULT_ICON_COLOR,
    className = '',
    title,
    role = 'img',
  }) => {
    // Align size to 8px grid
    const alignedSize = Math.ceil(Number(size) / GRID_BASE) * GRID_BASE;

    return (
      <svg
        width={alignedSize}
        height={alignedSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role={role}
        aria-hidden={!title}
        aria-label={title}
        style={{
          color,
          transition: `all ${THEME_TRANSITION_DURATION}ms ease-in-out`,
          flexShrink: 0,
        }}
      >
        {title && <title>{title}</title>}
        {SVGContent}
      </svg>
    );
  });

  return IconComponent;
};

// Task icon following Material Design 3.0 guidelines
export const TaskIcon = createIcon(
  <path
    d="M19 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.11 21 21 20.1 21 19V5C21 3.9 20.11 3 19 3ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"
    fill="currentColor"
  />
);

// Project icon following Material Design 3.0 guidelines
export const ProjectIcon = createIcon(
  <path
    d="M3 3H11V11H3V3ZM13 3H21V11H13V3ZM3 13H11V21H3V13ZM13 13H21V21H13V13Z"
    fill="currentColor"
  />
);

// Export types for external usage
export type { IconProps };