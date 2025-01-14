/**
 * @fileoverview Material Design 3.0 Avatar component with enhanced accessibility and fluid scaling
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react'; // ^18.0.0
import { BaseComponentProps } from '../../types/components.types';
import { Size } from '../../types/common.types';
import styles from './Avatar.module.css';

/**
 * Props interface for the Avatar component extending base component props
 */
interface AvatarProps extends BaseComponentProps {
  /** Image source URL */
  src?: string;
  /** Alternative text for accessibility */
  alt: string;
  /** Avatar size variant */
  size: Size;
  /** User initials for fallback */
  initials?: string;
  /** Click event handler */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** ARIA label for accessibility */
  ariaLabel: string;
  /** Loading state indicator */
  loading?: boolean;
  /** Custom error fallback component */
  errorFallback?: React.ReactNode;
  /** Custom color scheme */
  colorScheme?: string;
  /** Reference to container for fluid sizing */
  containerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * Extracts and formats initials from a user's full name
 * @param name - Full name to extract initials from
 * @returns Formatted initials (max 2 characters)
 */
const getInitials = (name: string): string => {
  if (!name || typeof name !== 'string') return '';

  const nameParts = name.trim().split(/\s+/);
  const firstInitial = nameParts[0]?.[0] || '';
  const lastInitial = nameParts[nameParts.length - 1]?.[0] || '';

  return (firstInitial + lastInitial)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 2);
};

/**
 * Avatar component displaying user profile image or initials with Material Design 3.0 styling
 */
const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = Size.MEDIUM,
  initials,
  onClick,
  className = '',
  style,
  ariaLabel,
  loading = false,
  errorFallback,
  colorScheme,
  containerRef,
}) => {
  const [error, setError] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  /**
   * Handles image loading errors
   */
  const handleError = useCallback(() => {
    setError(true);
  }, []);

  /**
   * Updates avatar dimensions based on container size
   */
  useEffect(() => {
    if (!containerRef?.current) return;

    const updateDimensions = () => {
      const container = containerRef.current;
      if (!container) return;

      const { width } = container.getBoundingClientRect();
      const size = Math.min(width, 64); // Max size of 64px
      setDimensions({ width: size, height: size });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [containerRef]);

  /**
   * Generates CSS classes based on component state
   */
  const getClassNames = useCallback(() => {
    return [
      styles.avatar,
      styles[`avatar--${size.toLowerCase()}`],
      src && !error ? styles['avatar--with-image'] : styles['avatar--with-initials'],
      loading && styles['avatar--loading'],
      error && styles['avatar--error'],
      onClick && styles['avatar--clickable'],
      className,
    ]
      .filter(Boolean)
      .join(' ');
  }, [size, src, error, loading, onClick, className]);

  /**
   * Generates inline styles including color scheme and dimensions
   */
  const getStyles = useCallback(() => {
    return {
      ...style,
      ...(colorScheme && { backgroundColor: colorScheme }),
      ...(dimensions.width && {
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
      }),
    };
  }, [style, colorScheme, dimensions]);

  if (loading) {
    return (
      <div
        className={getClassNames()}
        style={getStyles()}
        role="progressbar"
        aria-label={ariaLabel}
      >
        <div className={styles['avatar__loading-indicator']} />
      </div>
    );
  }

  if (error && errorFallback) {
    return (
      <div
        className={getClassNames()}
        style={getStyles()}
        role="img"
        aria-label={ariaLabel}
      >
        {errorFallback}
      </div>
    );
  }

  return (
    <div
      className={getClassNames()}
      style={getStyles()}
      onClick={onClick}
      role="img"
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
      onKeyPress={onClick ? (e) => e.key === 'Enter' && onClick(e as any) : undefined}
    >
      {src && !error ? (
        <img
          src={src}
          alt={alt}
          onError={handleError}
          className={styles.avatar__image}
          loading="lazy"
        />
      ) : (
        <span className={styles.avatar__initials}>
          {getInitials(initials || alt)}
        </span>
      )}
    </div>
  );
};

export default Avatar;