/**
 * @fileoverview Material Design 3.0 team card component with accessibility and responsive design
 * Displays team information including name, description, member count, and project count
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import clsx from 'clsx'; // v2.0.0
import Card from '../common/Card';
import Avatar from '../common/Avatar';
import { ITeam } from '../../interfaces/team.interface';
import { useTheme } from '../../hooks/useTheme';
import { Size } from '../../types/common.types';
import { TRANSITIONS } from '../../constants/theme.constants';

/**
 * Props interface for TeamCard component
 */
interface TeamCardProps {
  /** Team data to display */
  team: ITeam;
  /** Optional click handler for team selection */
  onClick?: (team: ITeam) => void;
  /** Whether the team card is selected */
  selected?: boolean;
  /** Optional additional CSS classes */
  className?: string;
  /** Loading state indicator */
  loading?: boolean;
  /** Error state information */
  error?: Error | null;
}

/**
 * TeamCard component displaying team information with Material Design 3.0 styling
 * Implements WCAG 2.1 Level AA compliance with proper ARIA attributes
 */
const TeamCard: React.FC<TeamCardProps> = React.memo(({
  team,
  onClick,
  selected = false,
  className,
  loading = false,
  error = null
}) => {
  const { theme } = useTheme();

  // Memoized counts to prevent unnecessary recalculations
  const counts = useMemo(() => ({
    members: team.memberIds?.length || 0,
    projects: team.projectIds?.length || 0
  }), [team.memberIds, team.projectIds]);

  // Memoized class names for performance
  const cardClasses = clsx(
    'team-card',
    {
      'team-card--selected': selected,
      'team-card--interactive': !!onClick,
      'team-card--loading': loading,
      'team-card--error': error
    },
    className
  );

  // Memoized styles for the card
  const cardStyles = useMemo(() => ({
    transition: `all ${TRANSITIONS.duration.standard}ms ${TRANSITIONS.easing.easeInOut}`,
    backgroundColor: selected ? theme.palette.primary.light : theme.palette.background.paper,
    border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
    cursor: onClick ? 'pointer' : 'default'
  }), [selected, onClick, theme]);

  // Handle keyboard interaction for accessibility
  const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick(team);
    }
  };

  // Handle click events
  const handleClick = () => {
    if (onClick) {
      onClick(team);
    }
  };

  if (loading) {
    return (
      <Card
        className={cardClasses}
        style={cardStyles}
        role="article"
        aria-busy="true"
        aria-label="Loading team information"
      >
        <div className="team-card__loading-skeleton" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={clsx(cardClasses, 'team-card--error')}
        style={cardStyles}
        role="alert"
        aria-label="Error loading team information"
      >
        <div className="team-card__error-message">
          {error.message || 'Failed to load team information'}
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cardClasses}
      style={cardStyles}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      role="article"
      aria-label={`Team ${team.name}`}
      tabIndex={onClick ? 0 : undefined}
      aria-selected={selected}
    >
      <div className="team-card__header">
        <Avatar
          src={`/api/teams/${team.id}/avatar`}
          alt={team.name}
          size={Size.MEDIUM}
          initials={team.name}
          ariaLabel={`${team.name} team avatar`}
        />
        <div className="team-card__title-section">
          <h3 className="team-card__title" style={{ color: theme.palette.text.primary }}>
            {team.name}
          </h3>
          <p 
            className="team-card__description"
            style={{ color: theme.palette.text.secondary }}
          >
            {team.description}
          </p>
        </div>
      </div>

      <div className="team-card__stats" aria-label="Team statistics">
        <div 
          className="team-card__stat-item"
          aria-label={`${counts.members} team members`}
        >
          <span className="team-card__stat-value">{counts.members}</span>
          <span className="team-card__stat-label">Members</span>
        </div>
        <div 
          className="team-card__stat-item"
          aria-label={`${counts.projects} projects`}
        >
          <span className="team-card__stat-value">{counts.projects}</span>
          <span className="team-card__stat-label">Projects</span>
        </div>
      </div>
    </Card>
  );
});

TeamCard.displayName = 'TeamCard';

export default TeamCard;