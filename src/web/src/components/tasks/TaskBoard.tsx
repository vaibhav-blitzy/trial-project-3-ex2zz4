import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useTheme, styled } from '@mui/material';
import { useVirtualizer } from '@tanstack/react-virtual';
import TaskCard from './TaskCard';
import useWebSocket from '../../hooks/useWebSocket';
import { TaskStatus, ITask, TaskPriority } from '../../interfaces/task.interface';
import { BaseComponentProps } from '../../types/components.types';
import { TRANSITIONS } from '../../constants/theme.constants';

// Styled components for the board layout
const BoardContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  height: '100%',
  overflowX: 'auto',
  overflowY: 'hidden',
  transition: `background-color ${TRANSITIONS.duration.standard}ms ${TRANSITIONS.easing.easeInOut}`,
  backgroundColor: theme.palette.background.default,
}));

const Column = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minWidth: '300px',
  maxWidth: '300px',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  '& > h3': {
    margin: 0,
    marginBottom: theme.spacing(2),
    color: theme.palette.text.primary,
  },
}));

const TaskList = styled('div')({
  flex: 1,
  overflowY: 'auto',
  minHeight: 0,
});

// Interface for component props
interface TaskBoardProps extends BaseComponentProps {
  projectId?: string;
  onTaskClick?: (taskId: string) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  virtualizeThreshold?: number;
}

// Task status configuration with display names and colors
const TASK_STATUSES = {
  [TaskStatus.TODO]: { label: 'To Do', color: 'grey.500' },
  [TaskStatus.IN_PROGRESS]: { label: 'In Progress', color: 'info.main' },
  [TaskStatus.REVIEW]: { label: 'Review', color: 'warning.main' },
  [TaskStatus.DONE]: { label: 'Done', color: 'success.main' },
};

const TaskBoard: React.FC<TaskBoardProps> = ({
  projectId,
  onTaskClick,
  onStatusChange,
  virtualizeThreshold = 20,
  className,
  style,
  testId = 'task-board',
}) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const columnRefs = useRef<Record<TaskStatus, HTMLDivElement | null>>({} as any);

  // WebSocket setup for real-time updates
  const { subscribe } = useWebSocket();

  // Get tasks from Redux store
  const tasks = useSelector((state: RootState) => 
    projectId ? state.tasks.items.filter(task => task.projectId === projectId) : state.tasks.items
  );

  // Memoized task grouping by status
  const tasksByStatus = useMemo(() => {
    const grouped = Object.values(TaskStatus).reduce((acc, status) => ({
      ...acc,
      [status]: tasks.filter(task => task.status === status),
    }), {} as Record<TaskStatus, ITask[]>);

    // Sort tasks by priority and due date
    Object.values(TaskStatus).forEach(status => {
      grouped[status].sort((a, b) => {
        const priorityOrder = {
          [TaskPriority.URGENT]: 0,
          [TaskPriority.HIGH]: 1,
          [TaskPriority.MEDIUM]: 2,
          [TaskPriority.LOW]: 3,
        };
        
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    });

    return grouped;
  }, [tasks]);

  // Virtualization setup for each column
  const virtualizers = useMemo(() => 
    Object.values(TaskStatus).reduce((acc, status) => ({
      ...acc,
      [status]: useVirtualizer({
        count: tasksByStatus[status].length,
        getScrollElement: () => columnRefs.current[status],
        estimateSize: () => 100,
        overscan: 5,
      }),
    }), {} as Record<TaskStatus, ReturnType<typeof useVirtualizer>>),
    [tasksByStatus]
  );

  // Handle drag end event
  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination || 
        (source.droppableId === destination.droppableId && 
         source.index === destination.index)) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    
    // Optimistic update
    dispatch({
      type: 'tasks/updateTaskStatus',
      payload: {
        taskId: draggableId,
        status: newStatus,
        previousStatus: source.droppableId,
        previousIndex: source.index,
      },
    });

    // Notify backend
    onStatusChange?.(draggableId, newStatus);
  }, [dispatch, onStatusChange]);

  // Subscribe to real-time task updates
  useEffect(() => {
    const unsubscribe = subscribe<ITask>('task.update', (updatedTask) => {
      dispatch({
        type: 'tasks/updateTask',
        payload: updatedTask,
      });
    });

    return () => unsubscribe();
  }, [subscribe, dispatch]);

  return (
    <BoardContainer
      className={className}
      style={style}
      data-testid={testId}
      role="application"
      aria-label="Task Board"
    >
      <DragDropContext onDragEnd={handleDragEnd}>
        {Object.entries(TASK_STATUSES).map(([status, { label, color }]) => (
          <Column key={status}>
            <h3 style={{ color: theme.palette[color] }}>{label}</h3>
            <Droppable droppableId={status}>
              {(provided, snapshot) => (
                <TaskList
                  ref={(el) => {
                    provided.innerRef(el);
                    columnRefs.current[status as TaskStatus] = el;
                  }}
                  style={{
                    backgroundColor: snapshot.isDraggingOver
                      ? theme.palette.action.hover
                      : 'transparent',
                  }}
                  {...provided.droppableProps}
                >
                  {tasksByStatus[status as TaskStatus].length > virtualizeThreshold ? (
                    virtualizers[status as TaskStatus].getVirtualItems().map((virtualRow) => {
                      const task = tasksByStatus[status as TaskStatus][virtualRow.index];
                      return (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={virtualRow.index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              style={{
                                ...dragProvided.draggableProps.style,
                                top: virtualRow.start,
                                position: 'absolute',
                                width: '100%',
                              }}
                            >
                              <TaskCard
                                task={task}
                                onClick={() => onTaskClick?.(task.id)}
                                style={{
                                  opacity: dragSnapshot.isDragging ? 0.6 : 1,
                                  transform: dragSnapshot.isDragging
                                    ? 'scale(1.02)'
                                    : 'scale(1)',
                                  transition: TRANSITIONS.duration.standard,
                                }}
                              />
                            </div>
                          )}
                        </Draggable>
                      );
                    })
                  ) : (
                    tasksByStatus[status as TaskStatus].map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <TaskCard
                              task={task}
                              onClick={() => onTaskClick?.(task.id)}
                              style={{
                                opacity: dragSnapshot.isDragging ? 0.6 : 1,
                                transform: dragSnapshot.isDragging
                                  ? 'scale(1.02)'
                                  : 'scale(1)',
                                transition: TRANSITIONS.duration.standard,
                              }}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </TaskList>
              )}
            </Droppable>
          </Column>
        ))}
      </DragDropContext>
    </BoardContainer>
  );
};

export default TaskBoard;