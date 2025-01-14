import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';
import WS from 'jest-websocket-mock';
import TaskBoard from '../../src/components/tasks/TaskBoard';
import { fetchTasks, updateTask, subscribeToTaskUpdates } from '../../src/store/tasks/tasks.actions';
import { TaskStatus, TaskPriority } from '../../src/interfaces/task.interface';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock WebSocket URL
const WS_URL = 'ws://localhost:1234';

// Mock tasks data
const mockTasks = [
  {
    id: '1',
    title: 'Task 1',
    description: 'Description 1',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    dueDate: '2024-01-01',
    assigneeIds: ['user1'],
    projectId: 'project1',
    createdAt: '2023-12-01',
    updatedAt: '2023-12-01'
  },
  {
    id: '2',
    title: 'Task 2',
    description: 'Description 2',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    dueDate: '2024-01-02',
    assigneeIds: ['user2'],
    projectId: 'project1',
    createdAt: '2023-12-01',
    updatedAt: '2023-12-01'
  }
];

// Setup function for tests
const setupTest = (props = {}, initialState = {}) => {
  // Create mock store
  const store = configureStore({
    reducer: {
      tasks: (state = {
        tasks: mockTasks,
        loading: false,
        error: null
      }, action) => state
    },
    preloadedState: initialState
  });

  // Create WebSocket mock
  const wsServer = new WS(WS_URL);

  // Render component with store provider
  const utils = render(
    <Provider store={store}>
      <TaskBoard
        projectId="project1"
        testId="task-board"
        {...props}
      />
    </Provider>
  );

  return {
    ...utils,
    store,
    wsServer
  };
};

describe('TaskBoard', () => {
  // Clean up WebSocket mock after each test
  afterEach(() => {
    WS.clean();
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = setupTest();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels for columns', () => {
      setupTest();
      const columns = screen.getAllByRole('region');
      columns.forEach(column => {
        expect(column).toHaveAttribute('aria-label');
      });
    });

    it('should support keyboard navigation between tasks', async () => {
      setupTest();
      const firstTask = screen.getByText('Task 1').closest('[role="button"]');
      const secondTask = screen.getByText('Task 2').closest('[role="button"]');

      firstTask?.focus();
      expect(document.activeElement).toBe(firstTask);

      fireEvent.keyDown(firstTask!, { key: 'Tab' });
      expect(document.activeElement).toBe(secondTask);
    });
  });

  describe('Real-time Updates', () => {
    it('should update task status when receiving WebSocket message', async () => {
      const { wsServer, store } = setupTest();

      const updatedTask = {
        ...mockTasks[0],
        status: TaskStatus.IN_PROGRESS
      };

      wsServer.send(JSON.stringify({
        type: 'task.update',
        payload: updatedTask
      }));

      await waitFor(() => {
        const state = store.getState();
        expect(state.tasks.tasks[0].status).toBe(TaskStatus.IN_PROGRESS);
      });
    });

    it('should handle concurrent updates correctly', async () => {
      const { wsServer, store } = setupTest();

      // Simulate two quick updates
      const update1 = {
        ...mockTasks[0],
        status: TaskStatus.IN_PROGRESS,
        updatedAt: '2023-12-01T12:00:00Z'
      };

      const update2 = {
        ...mockTasks[0],
        status: TaskStatus.REVIEW,
        updatedAt: '2023-12-01T12:00:01Z'
      };

      wsServer.send(JSON.stringify({
        type: 'task.update',
        payload: update1
      }));

      wsServer.send(JSON.stringify({
        type: 'task.update',
        payload: update2
      }));

      await waitFor(() => {
        const state = store.getState();
        expect(state.tasks.tasks[0].status).toBe(TaskStatus.REVIEW);
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should implement virtualization for large task lists', async () => {
      // Create large dataset
      const largeMockTasks = Array.from({ length: 1000 }, (_, i) => ({
        ...mockTasks[0],
        id: `task${i}`,
        title: `Task ${i}`
      }));

      const { container } = setupTest({}, {
        tasks: {
          tasks: largeMockTasks,
          loading: false,
          error: null
        }
      });

      // Check if virtualization is active
      const virtualizer = container.querySelector('[data-virtualized="true"]');
      expect(virtualizer).toBeInTheDocument();

      // Verify only a subset of tasks is rendered
      const renderedTasks = screen.getAllByRole('button');
      expect(renderedTasks.length).toBeLessThan(largeMockTasks.length);
    });

    it('should optimize drag and drop performance', async () => {
      const { container } = setupTest();
      
      const task = screen.getByText('Task 1').closest('[role="button"]');
      const targetColumn = screen.getByLabelText('In Progress');

      // Start performance measurement
      performance.mark('dragStart');

      // Simulate drag and drop
      fireEvent.dragStart(task!);
      fireEvent.dragOver(targetColumn);
      fireEvent.drop(targetColumn);

      performance.mark('dragEnd');
      performance.measure('dragOperation', 'dragStart', 'dragEnd');

      const measure = performance.getEntriesByName('dragOperation')[0];
      expect(measure.duration).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Task Operations', () => {
    it('should handle task drag and drop between columns', async () => {
      const { store } = setupTest();

      const task = screen.getByText('Task 1').closest('[role="button"]');
      const targetColumn = screen.getByLabelText('In Progress');

      fireEvent.dragStart(task!);
      fireEvent.dragOver(targetColumn);
      fireEvent.drop(targetColumn);

      await waitFor(() => {
        const state = store.getState();
        const updatedTask = state.tasks.tasks.find(t => t.id === '1');
        expect(updatedTask?.status).toBe(TaskStatus.IN_PROGRESS);
      });
    });

    it('should handle task selection', async () => {
      const onTaskClick = jest.fn();
      setupTest({ onTaskClick });

      const task = screen.getByText('Task 1');
      userEvent.click(task);

      expect(onTaskClick).toHaveBeenCalledWith('1');
    });
  });

  describe('Error Handling', () => {
    it('should display error state when task update fails', async () => {
      const { store } = setupTest();

      // Mock failed update
      store.dispatch({
        type: 'tasks/updateTaskError',
        payload: 'Failed to update task'
      });

      const errorMessage = await screen.findByText(/Failed to update task/i);
      expect(errorMessage).toBeInTheDocument();
    });

    it('should recover from WebSocket disconnection', async () => {
      const { wsServer } = setupTest();

      wsServer.close();
      await waitFor(() => {
        expect(wsServer.server.clients().length).toBe(0);
      });

      // Wait for reconnection attempt
      await waitFor(() => {
        expect(wsServer.server.clients().length).toBe(1);
      }, { timeout: 6000 });
    });
  });
});