/**
 * ProjectList Component
 * Implements a responsive grid of project cards with virtual scrolling,
 * real-time updates, and Material Design 3.0 principles
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { Grid, Box, Typography, Skeleton } from '@mui/material'; // ^5.0.0
import { FixedSizeGrid as VirtualGrid } from 'react-window'; // ^1.8.0
import { debounce } from 'lodash'; // ^4.0.8
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0

import ProjectCard from './ProjectCard';
import { useProjects } from '../../hooks/useProjects';
import { useTheme } from '../../hooks/useTheme';
import { IProject } from '../../interfaces/project.interface';
import { BREAKPOINTS } from '../../constants/theme.constants';

/**
 * Props interface for ProjectList component
 */
interface ProjectListProps {
  className?: string;
  filter?: string;
  sortBy?: 'name' | 'priority' | 'progress' | 'status';
  sortDirection?: 'asc' | 'desc';
  onProjectClick?: (project: IProject) => void;
  virtualScrolling?: boolean;
  pageSize?: number;
}

/**
 * Error Fallback component for error boundary
 */
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <Box
    sx={{
      p: 3,
      textAlign: 'center',
      color: 'error.main'
    }}
  >
    <Typography variant="h6" gutterBottom>
      Error loading projects
    </Typography>
    <Typography variant="body2" color="text.secondary" paragraph>
      {error.message}
    </Typography>
    <button onClick={resetErrorBoundary}>Retry</button>
  </Box>
);

/**
 * ProjectList Component
 * Implements virtual scrolling and real-time updates for optimal performance
 */
const ProjectList: React.FC<ProjectListProps> = React.memo(({
  className = '',
  filter = '',
  sortBy = 'name',
  sortDirection = 'asc',
  onProjectClick,
  virtualScrolling = true,
  pageSize = 20
}) => {
  const { theme } = useTheme();
  const {
    projects,
    loading,
    error,
    fetchAllProjects,
    handleSelectProject
  } = useProjects();

  // Calculate grid dimensions based on viewport
  const gridDimensions = useMemo(() => {
    const width = window.innerWidth;
    let columns = 1;
    if (width >= BREAKPOINTS.values.xl) columns = 4;
    else if (width >= BREAKPOINTS.values.lg) columns = 3;
    else if (width >= BREAKPOINTS.values.md) columns = 2;
    
    return {
      columns,
      itemWidth: Math.floor(width / columns) - 32, // Account for padding
      itemHeight: 200 // Fixed card height
    };
  }, []);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];
    
    // Apply filter
    if (filter) {
      const searchTerm = filter.toLowerCase();
      result = result.filter(project => 
        project.name.toLowerCase().includes(searchTerm) ||
        project.description.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      const compareValue = (val1: any, val2: any) =>
        sortDirection === 'asc' ? val1 > val2 ? 1 : -1 : val1 < val2 ? 1 : -1;

      return compareValue(a[sortBy], b[sortBy]);
    });

    return result;
  }, [projects, filter, sortBy, sortDirection]);

  // Debounced project click handler
  const handleProjectClick = useCallback(debounce((project: IProject) => {
    handleSelectProject(project.id);
    onProjectClick?.(project);
  }, 300), [handleSelectProject, onProjectClick]);

  // Virtual grid cell renderer
  const cellRenderer = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * gridDimensions.columns + columnIndex;
    const project = filteredProjects[index];

    if (!project) return null;

    return (
      <div style={style}>
        <ProjectCard
          project={project}
          onClick={() => handleProjectClick(project)}
          elevation={2}
          className="project-list__card"
        />
      </div>
    );
  }, [filteredProjects, gridDimensions.columns, handleProjectClick]);

  // Loading skeleton
  const renderSkeleton = () => (
    <Grid container spacing={3}>
      {Array.from({ length: pageSize }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={`skeleton-${index}`}>
          <Skeleton
            variant="rectangular"
            height={200}
            sx={{
              borderRadius: theme.shape.borderRadius,
              bgcolor: 'background.paper'
            }}
          />
        </Grid>
      ))}
    </Grid>
  );

  // Fetch projects on mount
  useEffect(() => {
    fetchAllProjects();
  }, [fetchAllProjects]);

  // Render loading state
  if (loading) return renderSkeleton();

  // Render error state
  if (error) {
    return (
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Typography color="error" align="center">
          {error}
        </Typography>
      </ErrorBoundary>
    );
  }

  return (
    <Box
      className={`project-list ${className}`}
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {virtualScrolling ? (
        <VirtualGrid
          columnCount={gridDimensions.columns}
          columnWidth={gridDimensions.itemWidth}
          height={window.innerHeight - 200} // Adjust for header/footer
          rowCount={Math.ceil(filteredProjects.length / gridDimensions.columns)}
          rowHeight={gridDimensions.itemHeight}
          width="100%"
        >
          {cellRenderer}
        </VirtualGrid>
      ) : (
        <Grid container spacing={3}>
          {filteredProjects.map(project => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={project.id}>
              <ProjectCard
                project={project}
                onClick={() => handleProjectClick(project)}
                elevation={2}
                className="project-list__card"
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
});

ProjectList.displayName = 'ProjectList';

export default ProjectList;