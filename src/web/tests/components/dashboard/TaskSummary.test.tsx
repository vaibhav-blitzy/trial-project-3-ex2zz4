import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@mui/material';
import { lightTheme, darkTheme } from '../../../config/theme.config';

import { TaskSummary } from '../../../../src/components/dashboard/TaskSummary';
import { ITask, TaskStatus, TaskPriority } from '../../../../src/interfaces/task.interface';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock tasks data
const mockTasks: ITask[] = [
  {
    id: '1',
    title: 'Task 1',
    description: 'Description 1',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    projectId: 'project-1',
    assigneeIds: ['user-1'],
    creatorId: 'creator-1',
    dueDate: new Date().toISOString(),
    attachmentIds: [],
    tags: ['frontend'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Task 2',
    description: 'Description 2',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    projectId: 'project-1',
    assigneeIds: ['user-2'],
    creatorId: 'creator-1',
    dueDate: new Date().toISOString(),
    attachmentIds: [],
    tags: ['backend'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Task 3',
    description: 'Description 3',
    status: TaskStatus.DONE,
    priority: TaskPriority.LOW,
    projectId: 'project-1',
    assigneeIds: ['user-3'],
    creatorId: 'creator-1',
    dueDate: new Date().toISOString(),
    attachmentIds: [],
    tags: ['testing'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Helper function to create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      tasks: (state = initialState, action) => state
    },
    preloadedState: {
      tasks: {
        tasks: mockTasks,
        selectedTask: null,
        loading: false,
        error: null
      }
    }
  });
};

// Enhanced render helper with Redux and Theme providers
const renderWithProviders = (
  ui: React.ReactElement,
  {
    initialState = {},
    store = createTestStore(initialState),
    theme = lightTheme,
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </Provider>
  );

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
};

describe('TaskSummary Component', () => {
  it('renders without crashing and meets accessibility standards', async () => {
    const { container } = renderWithProviders(<TaskSummary />);
    
    // Basic rendering check
    expect(screen.getByTestId('task-summary')).toBeInTheDocument();
    
    // Accessibility check
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('displays correct task status distribution', () => {
    renderWithProviders(<TaskSummary />);
    
    const statusList = screen.getByRole('list', { name: /task status/i });
    const statusItems = within(statusList).getAllByRole('listitem');
    
    expect(statusItems).toHaveLength(4); // TODO, IN_PROGRESS, REVIEW, DONE
    
    // Verify status counts
    expect(within(statusItems[0]).getByText('1')).toBeInTheDocument(); // TODO count
    expect(within(statusItems[1]).getByText('1')).toBeInTheDocument(); // IN_PROGRESS count
    expect(within(statusItems[3]).getByText('1')).toBeInTheDocument(); // DONE count
  });

  it('calculates and displays correct progress percentage', () => {
    renderWithProviders(<TaskSummary showProgress />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '33'); // 1/3 tasks completed
  });

  it('displays correct priority breakdown', () => {
    renderWithProviders(<TaskSummary showPriority />);
    
    const prioritySection = screen.getByRole('region', { name: /priority distribution/i });
    const priorityItems = within(prioritySection).getAllByRole('listitem');
    
    expect(priorityItems).toHaveLength(4); // HIGH, MEDIUM, LOW, URGENT
    
    // Verify priority percentages
    expect(within(priorityItems[0]).getByText('33%')).toBeInTheDocument(); // HIGH
    expect(within(priorityItems[1]).getByText('33%')).toBeInTheDocument(); // MEDIUM
    expect(within(priorityItems[2]).getByText('33%')).toBeInTheDocument(); // LOW
  });

  it('handles theme changes correctly', () => {
    const { rerender } = renderWithProviders(
      <TaskSummary />,
      { theme: lightTheme }
    );

    // Check light theme styles
    expect(screen.getByTestId('task-summary')).toHaveStyle({
      backgroundColor: lightTheme.palette.background.paper
    });

    // Switch to dark theme
    rerender(
      <Provider store={createTestStore()}>
        <ThemeProvider theme={darkTheme}>
          <TaskSummary />
        </ThemeProvider>
      </Provider>
    );

    // Check dark theme styles
    expect(screen.getByTestId('task-summary')).toHaveStyle({
      backgroundColor: darkTheme.palette.background.paper
    });
  });

  it('handles loading state correctly', () => {
    renderWithProviders(<TaskSummary loading />);
    
    expect(screen.getByTestId('task-summary')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByClassName('task-summary-skeleton')).toBeInTheDocument();
  });

  it('handles error state correctly', () => {
    const errorMessage = 'Failed to load tasks';
    renderWithProviders(
      <TaskSummary error={new Error(errorMessage)} />
    );
    
    expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
  });

  it('supports keyboard navigation', () => {
    renderWithProviders(<TaskSummary />);
    
    const summary = screen.getByTestId('task-summary');
    const headings = screen.getAllByRole('heading');
    
    // Verify tab navigation
    headings.forEach(heading => {
      heading.focus();
      expect(heading).toHaveFocus();
    });
  });

  it('updates when task data changes', () => {
    const { rerender } = renderWithProviders(<TaskSummary />);
    
    // Initial state check
    expect(screen.getByText('33%')).toBeInTheDocument();
    
    // Update store with new task
    const updatedStore = createTestStore({
      tasks: [...mockTasks, {
        ...mockTasks[0],
        id: '4',
        status: TaskStatus.DONE
      }]
    });
    
    rerender(
      <Provider store={updatedStore}>
        <ThemeProvider theme={lightTheme}>
          <TaskSummary />
        </ThemeProvider>
      </Provider>
    );
    
    // Verify updated progress
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});