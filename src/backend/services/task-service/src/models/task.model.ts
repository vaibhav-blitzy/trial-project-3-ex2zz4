/**
 * @fileoverview Enhanced Task model implementation using Objection.js with comprehensive
 * validation, security, audit trails, and optimized performance.
 * @version 1.0.0
 */

import { Model, AjvValidator } from 'objection'; // v3.0.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { ITask, TaskStatus, TaskPriority } from '../../../shared/interfaces/task.interface';
import { db } from '../config/database.config';
import { ErrorCodes } from '../../../shared/constants/error-codes';

// Configure Objection.js to use the database instance
Model.knex(db.getKnex());

/**
 * Enhanced Task model with comprehensive validation and security features
 */
export class TaskModel extends Model implements ITask {
  // Required properties from ITask interface
  id!: string;
  title!: string;
  description!: string;
  projectId!: string;
  status!: TaskStatus;
  priority!: TaskPriority;
  assigneeIds!: string[];
  creatorId!: string;
  dueDate!: Date;
  attachmentIds!: string[];
  tags!: string[];
  createdAt!: Date;
  updatedAt!: Date;

  // Static properties
  static tableName = 'tasks';

  static jsonSchema = {
    type: 'object',
    required: ['title', 'projectId', 'status', 'priority', 'creatorId'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      title: { type: 'string', minLength: 1, maxLength: 255 },
      description: { type: 'string', maxLength: 2000 },
      projectId: { type: 'string', format: 'uuid' },
      status: { type: 'string', enum: Object.values(TaskStatus) },
      priority: { type: 'string', enum: Object.values(TaskPriority) },
      assigneeIds: { 
        type: 'array',
        items: { type: 'string', format: 'uuid' }
      },
      creatorId: { type: 'string', format: 'uuid' },
      dueDate: { type: 'string', format: 'date-time' },
      attachmentIds: {
        type: 'array',
        items: { type: 'string', format: 'uuid' }
      },
      tags: {
        type: 'array',
        items: { type: 'string', maxLength: 50 }
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  };

  static relationMappings = {
    project: {
      relation: Model.BelongsToOneRelation,
      modelClass: '../project/project.model',
      join: {
        from: 'tasks.projectId',
        to: 'projects.id'
      }
    },
    comments: {
      relation: Model.HasManyRelation,
      modelClass: '../comment/comment.model',
      join: {
        from: 'tasks.id',
        to: 'comments.taskId'
      }
    },
    attachments: {
      relation: Model.HasManyRelation,
      modelClass: '../attachment/attachment.model',
      join: {
        from: 'tasks.id',
        to: 'attachments.taskId'
      }
    }
  };

  // Custom modifiers for common queries
  static modifiers = {
    defaultSelect(query: any) {
      query.select('id', 'title', 'status', 'priority', 'dueDate', 'assigneeIds');
    },
    withFullDetails(query: any) {
      query.select('*').withGraphFetched('[comments, attachments]');
    },
    active(query: any) {
      query.whereNot('status', TaskStatus.DONE);
    },
    overdue(query: any) {
      query.where('dueDate', '<', new Date()).whereNot('status', TaskStatus.DONE);
    }
  };

  // Database indexes configuration
  static get indexConfiguration() {
    return {
      taskStatusIdx: ['status'],
      taskProjectIdx: ['projectId'],
      taskDueDateIdx: ['dueDate'],
      taskAssigneesIdx: ['assigneeIds'],
      taskCreatedAtIdx: ['createdAt']
    };
  }

  /**
   * Lifecycle hook before insert
   */
  async $beforeInsert(context: any) {
    await super.$beforeInsert(context);
    
    this.id = uuidv4();
    this.createdAt = new Date();
    this.updatedAt = new Date();
    
    // Validate status transitions
    if (!this.validateStatusTransition(this.status, TaskStatus.TODO)) {
      throw new Error(ErrorCodes.INVALID_INPUT_FORMAT.toString());
    }
    
    // Initialize arrays if not provided
    this.assigneeIds = this.assigneeIds || [];
    this.attachmentIds = this.attachmentIds || [];
    this.tags = this.tags || [];
  }

  /**
   * Lifecycle hook before update
   */
  async $beforeUpdate(opt: any, context: any) {
    await super.$beforeUpdate(opt, context);
    
    this.updatedAt = new Date();

    // Get current state for validation
    const current = await TaskModel.query().findById(this.id);
    if (current && this.status !== current.status) {
      if (!this.validateStatusTransition(this.status, current.status)) {
        throw new Error(ErrorCodes.INVALID_INPUT_FORMAT.toString());
      }
    }
  }

  /**
   * Validates task status transitions
   */
  private validateStatusTransition(newStatus: TaskStatus, oldStatus: TaskStatus): boolean {
    const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.REVIEW, TaskStatus.TODO],
      [TaskStatus.REVIEW]: [TaskStatus.DONE, TaskStatus.IN_PROGRESS],
      [TaskStatus.DONE]: [TaskStatus.REVIEW]
    };

    return allowedTransitions[oldStatus]?.includes(newStatus) || oldStatus === newStatus;
  }

  /**
   * Custom query builder with enhanced features
   */
  static get QueryBuilder() {
    return class extends Model.QueryBuilder {
      findByProjectAndStatus(projectId: string, status: TaskStatus) {
        return this.where({ projectId, status });
      }

      findOverdueTasks() {
        return this.where('dueDate', '<', new Date())
          .whereNot('status', TaskStatus.DONE);
      }

      findByAssignee(assigneeId: string) {
        return this.whereRaw('? = ANY(assignee_ids)', [assigneeId]);
      }
    };
  }
}

export default TaskModel;