/**
 * Projects Page Component
 * Implements Material Design 3.0 principles with responsive layout and accessibility
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';

import MainLayout from '../../components/layout/MainLayout';
import ProjectList from '../../components/projects/ProjectList';
import Button from '../../components/common/Button';
import useProjects from '../../hooks/useProjects';
import { ROUTES } from '../../constants/routes.constants';
import { SPACING, TYPOGRAPHY, BREAKPOINTS } from '../../constants/theme.constants';
import { IProject } from '../../interfaces/project.interface';

// Styled components with Material Design 3.0 principles
const PageHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.scale[4]};
  margin-bottom: ${SPACING.scale[6]};
  padding: ${SPACING.scale[4]};

  ${BREAKPOINTS.up('md')} {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: ${SPACING.scale[4]} ${SPACING.scale[6]};
  }
`;

const PageTitle = styled.h1`
  font-family: ${TYPOGRAPHY.fontFamilies.primary};
  font-size: ${TYPOGRAPHY.fontSizes['2xl']};
  font-weight: ${TYPOGRAPHY.fontWeights.bold};
  line-height: ${TYPOGRAPHY.lineHeights.tight};
  margin: 0;
  color: ${({ theme }) => theme.palette.text.primary};
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${SPACING.scale[8]};
  text-align: center;
  color: ${({ theme }) => theme.palette.error.main};
`;

/**
 * Projects page component with Material Design 3.0 implementation
 * Features responsive layout, real-time updates, and accessibility
 */
const Projects: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const {
    projects,
    loading,
    error,
    fetchAllProjects,
    handleSelectProject
  } = useProjects();

  // Fetch projects on mount
  useEffect(() => {
    fetchAllProjects();
  }, [fetchAllProjects]);

  // Handle project creation navigation
  const handleCreateProject = useCallback(() => {
    navigate(ROUTES.PROJECTS.CREATE);
  }, [navigate]);

  // Handle project selection
  const handleProjectClick = useCallback((project: IProject) => {
    handleSelectProject(project.id);
    navigate(`${ROUTES.PROJECTS.ROOT}/${project.id}`);
  }, [handleSelectProject, navigate]);

  // Memoized project filters
  const projectFilters = useMemo(() => ({
    sortBy: 'name',
    sortDirection: 'asc' as const,
    virtualScrolling: true,
    pageSize: 20
  }), []);

  return (
    <MainLayout>
      <PageHeader>
        <PageTitle>Projects</PageTitle>
        <Button
          variant="PRIMARY"
          size="MEDIUM"
          onClick={handleCreateProject}
          startIcon="+"
          ariaLabel="Create new project"
          testId="create-project-button"
        >
          Create Project
        </Button>
      </PageHeader>

      {error ? (
        <ErrorContainer role="alert" aria-live="polite">
          <h2>Error Loading Projects</h2>
          <p>{error}</p>
          <Button
            variant="OUTLINED"
            size="MEDIUM"
            onClick={fetchAllProjects}
            ariaLabel="Retry loading projects"
          >
            Retry
          </Button>
        </ErrorContainer>
      ) : (
        <ProjectList
          onProjectClick={handleProjectClick}
          loading={loading}
          {...projectFilters}
          className="projects-list"
          testId="projects-list"
        />
      )}
    </MainLayout>
  );
});

// Display name for debugging
Projects.displayName = 'Projects';

export default Projects;