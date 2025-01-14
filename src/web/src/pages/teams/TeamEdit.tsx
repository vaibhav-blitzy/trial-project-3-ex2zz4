/**
 * @fileoverview Team Edit Page Component
 * Implements WCAG 2.1 Level AA compliance with real-time collaboration support
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@chakra-ui/react';
import { debounce } from 'lodash';
import styled from '@emotion/styled';

import TeamForm from '../../components/teams/TeamForm';
import { TeamService } from '../../services/team.service';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ITeam } from '../../interfaces/team.interface';
import { COLORS, SPACING, TRANSITIONS } from '../../constants/theme.constants';

// Styled components with Material Design 3.0 principles
const Container = styled.div`
  padding: ${SPACING.scale[6]};
  max-width: ${SPACING.layout.container.lg};
  margin: 0 auto;
  
  @media (max-width: ${SPACING.layout.container.sm}) {
    padding: ${SPACING.scale[4]};
  }
`;

const Header = styled.header`
  margin-bottom: ${SPACING.scale[6]};
`;

const Title = styled.h1`
  font-size: ${SPACING.scale[8]};
  color: ${({ theme }) => theme === 'dark' ? COLORS.dark.text.primary : COLORS.light.text.primary};
  margin-bottom: ${SPACING.scale[2]};
`;

const LoadingOverlay = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${({ isVisible }) => isVisible ? 1 : 0};
  visibility: ${({ isVisible }) => isVisible ? 'visible' : 'hidden'};
  transition: all ${TRANSITIONS.duration.standard} ${TRANSITIONS.easing.easeInOut};
  z-index: 1000;
`;

/**
 * Team Edit page component with real-time collaboration
 */
const TeamEdit: React.FC = () => {
  // Hooks initialization
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const teamService = new TeamService(null);
  const { subscribe } = useWebSocket();

  // State management
  const [team, setTeam] = useState<ITeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for managing concurrent edits
  const lastUpdateRef = useRef<string>('');
  const formRef = useRef<any>(null);

  // Fetch team data on mount
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const teamData = await teamService.getTeamById(teamId!);
        setTeam(teamData);
        lastUpdateRef.current = teamData.updatedAt;
      } catch (err) {
        setError('Failed to load team data');
        toast({
          title: 'Error',
          description: 'Failed to load team data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchTeam();
    }
  }, [teamId, toast]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!teamId) return;

    const unsubscribe = subscribe<ITeam>('team.update', (updatedTeam) => {
      if (updatedTeam.id === teamId && updatedTeam.updatedAt !== lastUpdateRef.current) {
        setTeam(updatedTeam);
        lastUpdateRef.current = updatedTeam.updatedAt;
        
        toast({
          title: 'Team Updated',
          description: 'Team details have been updated by another user',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [teamId, subscribe, toast]);

  // Debounced save handler to prevent rapid consecutive saves
  const debouncedSave = useCallback(
    debounce(async (updatedTeam: ITeam) => {
      try {
        setSaving(true);
        const result = await teamService.updateTeam(teamId!, updatedTeam);
        lastUpdateRef.current = result.updatedAt;
        
        toast({
          title: 'Success',
          description: 'Team updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (err) {
        setError('Failed to update team');
        toast({
          title: 'Error',
          description: 'Failed to update team',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setSaving(false);
      }
    }, 500),
    [teamId, toast]
  );

  // Form submission handler
  const handleSubmit = useCallback(async (updatedTeam: ITeam) => {
    if (lastUpdateRef.current && lastUpdateRef.current !== team?.updatedAt) {
      const confirmUpdate = window.confirm(
        'This team has been updated by another user. Do you want to overwrite their changes?'
      );
      if (!confirmUpdate) return;
    }
    await debouncedSave(updatedTeam);
  }, [debouncedSave, team?.updatedAt]);

  // Navigation handler
  const handleCancel = useCallback(() => {
    navigate('/teams');
  }, [navigate]);

  // Render loading state
  if (loading) {
    return (
      <LoadingOverlay isVisible={true}>
        <div role="status" aria-label="Loading team data">
          Loading...
        </div>
      </LoadingOverlay>
    );
  }

  // Render error state
  if (error) {
    return (
      <Container>
        <div role="alert" aria-live="polite">
          <Title>Error</Title>
          <p>{error}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Edit Team</Title>
      </Header>

      {team && (
        <TeamForm
          ref={formRef}
          initialData={team}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={saving}
        />
      )}

      <LoadingOverlay isVisible={saving}>
        <div role="status" aria-label="Saving team changes">
          Saving...
        </div>
      </LoadingOverlay>

      {/* Accessibility announcement region */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {saving && 'Saving team changes...'}
        {error && `Error: ${error}`}
      </div>
    </Container>
  );
};

export default TeamEdit;