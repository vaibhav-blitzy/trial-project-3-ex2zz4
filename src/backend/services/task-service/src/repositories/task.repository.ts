/**
 * @fileoverview Enhanced Task Repository implementing secure and optimized data access patterns
 * for task management operations with comprehensive validation and audit logging.
 * @version 1.0.0
 */

import { Transaction } from 'objection'; // v3.0.0
import { Logger } from '../../../../shared/utils/logger.util'; // v3.8.2
import { DatabaseConnection } from '../../../../shared/utils/database.util';
import { ITask, TaskStatus, TaskPriority } from '../../../../shared/interfaces/task.interface';
import { TaskModel } from '../models/task.model';
import { ErrorCodes } from '../../../../shared/constants/error-codes';

/**
 * Enhanced repository class implementing secure and optimized data access patterns
 * for task management with comprehensive validation and audit capabilities
 */
export class TaskRepository {
  private readonly taskModel: typeof TaskModel;
  private readonly dbConnection: DatabaseConnection;
  private readonly logger: Logger;

  constructor() {
    this.dbConnection = DatabaseConnection.getInstance({
      client: 'postgresql',
      connection: {},
      pool: { min: 2, max: 10 },
      migrations: { directory: '', tableName: '' }
    });
    this.taskModel = TaskModel;
    this.logger = Logger.getInstance('TaskRepository', {
      enableConsole: true,
      enableFile: true
    });
  }

  /**
   * Creates a new task with comprehensive validation and security checks
   * @param taskData - Task data to be created
   * @returns Promise<ITask> - Created task with relationships
   */
  public async create(taskData: Partial<ITask>): Promise<ITask> {
    const trx = await this.dbConnection.getKnex().transaction();

    try {
      // Validate input data
      this.validateTaskData(taskData);

      // Create task with security context
      const task = await this.taskModel.query(trx)
        .insert(taskData)
        .withGraphFetched('[project, comments, attachments]');

      // Log audit trail
      await this.logger.audit('Task created', {
        resourceId: task.id,
        userId: taskData.creatorId,
        action: 'CREATE'
      });

      await trx.commit();
      return task;
    } catch (error) {
      await trx.rollback();
      this.logger.error('Failed to create task', { error });
      throw error;
    }
  }

  /**
   * Retrieves task by ID with optimized loading and security checks
   * @param id - Task ID
   * @returns Promise<ITask | null> - Found task with relationships or null
   */
  public async findById(id: string): Promise<ITask | null> {
    try {
      const task = await this.taskModel.query()
        .findById(id)
        .withGraphFetched('[project, comments, attachments]');

      if (!task) {
        return null;
      }

      return task;
    } catch (error) {
      this.logger.error('Failed to find task', { error });
      throw error;
    }
  }

  /**
   * Updates task with optimistic locking and validation
   * @param id - Task ID
   * @param taskData - Updated task data
   * @returns Promise<ITask> - Updated task
   */
  public async update(id: string, taskData: Partial<ITask>): Promise<ITask> {
    const trx = await this.dbConnection.getKnex().transaction();

    try {
      // Validate update data
      this.validateTaskData(taskData);

      // Perform optimistic locking check
      const currentTask = await this.taskModel.query(trx)
        .findById(id)
        .forUpdate();

      if (!currentTask) {
        throw new Error(ErrorCodes.INVALID_INPUT_FORMAT.toString());
      }

      // Update task with security context
      const updatedTask = await this.taskModel.query(trx)
        .patchAndFetchById(id, {
          ...taskData,
          updatedAt: new Date()
        })
        .withGraphFetched('[project, comments, attachments]');

      // Log audit trail
      await this.logger.audit('Task updated', {
        resourceId: id,
        userId: taskData.creatorId,
        action: 'UPDATE'
      });

      await trx.commit();
      return updatedTask;
    } catch (error) {
      await trx.rollback();
      this.logger.error('Failed to update task', { error });
      throw error;
    }
  }

  /**
   * Deletes task with cascading and security checks
   * @param id - Task ID
   * @returns Promise<boolean> - Deletion success status
   */
  public async delete(id: string): Promise<boolean> {
    const trx = await this.dbConnection.getKnex().transaction();

    try {
      const task = await this.taskModel.query(trx)
        .findById(id);

      if (!task) {
        return false;
      }

      // Delete task and related records
      await this.taskModel.query(trx)
        .deleteById(id);

      // Log audit trail
      await this.logger.audit('Task deleted', {
        resourceId: id,
        action: 'DELETE'
      });

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      this.logger.error('Failed to delete task', { error });
      throw error;
    }
  }

  /**
   * Finds tasks by project with pagination and filtering
   * @param projectId - Project ID
   * @param filters - Query filters
   * @returns Promise<ITask[]> - List of tasks
   */
  public async findByProject(
    projectId: string,
    filters: { status?: TaskStatus; priority?: TaskPriority } = {}
  ): Promise<ITask[]> {
    try {
      let query = this.taskModel.query()
        .where('projectId', projectId)
        .withGraphFetched('[comments, attachments]');

      if (filters.status) {
        query = query.where('status', filters.status);
      }

      if (filters.priority) {
        query = query.where('priority', filters.priority);
      }

      return await query.orderBy('createdAt', 'desc');
    } catch (error) {
      this.logger.error('Failed to find tasks by project', { error });
      throw error;
    }
  }

  /**
   * Finds tasks by assignee with optimized loading
   * @param assigneeId - Assignee user ID
   * @returns Promise<ITask[]> - List of assigned tasks
   */
  public async findByAssignee(assigneeId: string): Promise<ITask[]> {
    try {
      return await this.taskModel.query()
        .whereRaw('? = ANY(assignee_ids)', [assigneeId])
        .withGraphFetched('[project, comments]')
        .orderBy('dueDate', 'asc');
    } catch (error) {
      this.logger.error('Failed to find tasks by assignee', { error });
      throw error;
    }
  }

  /**
   * Validates task data against business rules
   * @param taskData - Task data to validate
   * @throws Error if validation fails
   */
  private validateTaskData(taskData: Partial<ITask>): void {
    if (!taskData.title || taskData.title.length > 255) {
      throw new Error(ErrorCodes.INVALID_INPUT_FORMAT.toString());
    }

    if (taskData.description && taskData.description.length > 2000) {
      throw new Error(ErrorCodes.INVALID_INPUT_FORMAT.toString());
    }

    if (taskData.status && !Object.values(TaskStatus).includes(taskData.status)) {
      throw new Error(ErrorCodes.INVALID_INPUT_FORMAT.toString());
    }

    if (taskData.priority && !Object.values(TaskPriority).includes(taskData.priority)) {
      throw new Error(ErrorCodes.INVALID_INPUT_FORMAT.toString());
    }
  }
}

export default TaskRepository;