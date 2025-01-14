import { Model, ValidationError } from 'objection';
import * as Joi from 'joi';
import { IProject, ProjectStatus } from '../../../shared/interfaces/project.interface';

// Constants for validation rules
const TABLE_NAME = 'projects';
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MIN_PROJECT_DURATION_DAYS = 1;
const MAX_PROJECT_DURATION_DAYS = 365;
const MAX_TEAM_MEMBERS = 100;

/**
 * Project Model
 * Implements the core project entity with comprehensive validation and relationships
 * using Objection.js ORM for PostgreSQL
 * @version 1.0.0
 */
export class Project extends Model implements IProject {
  // Required properties from IProject interface
  id!: string;
  name!: string;
  description!: string;
  status!: ProjectStatus;
  teamId!: string;
  ownerId!: string;
  memberIds!: string[];
  startDate!: Date;
  endDate!: Date;
  settings!: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;

  /**
   * Database table name
   */
  static get tableName(): string {
    return TABLE_NAME;
  }

  /**
   * JSON Schema for validation
   * Implements comprehensive validation rules for project data
   */
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'teamId', 'ownerId', 'status', 'startDate', 'endDate'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { 
          type: 'string', 
          minLength: 1,
          maxLength: MAX_NAME_LENGTH 
        },
        description: { 
          type: 'string',
          maxLength: MAX_DESCRIPTION_LENGTH 
        },
        status: { 
          type: 'string',
          enum: Object.values(ProjectStatus)
        },
        teamId: { type: 'string', format: 'uuid' },
        ownerId: { type: 'string', format: 'uuid' },
        memberIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          maxItems: MAX_TEAM_MEMBERS
        },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
        settings: {
          type: 'object',
          properties: {
            isPublic: { type: 'boolean' },
            allowExternalSharing: { type: 'boolean' },
            notifications: { type: 'object' },
            permissions: { type: 'object' },
            customFields: { type: 'object' }
          }
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  /**
   * Custom validation rules
   * Implements additional business logic validation
   */
  async $beforeInsert(): Promise<void> {
    this.createdAt = new Date();
    this.updatedAt = new Date();
    await this.validateDates();
  }

  async $beforeUpdate(): Promise<void> {
    this.updatedAt = new Date();
    await this.validateDates();
  }

  /**
   * Validate project dates
   * Ensures project duration is within acceptable range
   */
  private async validateDates(): Promise<void> {
    if (this.startDate && this.endDate) {
      const duration = Math.ceil(
        (new Date(this.endDate).getTime() - new Date(this.startDate).getTime()) / 
        (1000 * 60 * 60 * 24)
      );

      if (duration < MIN_PROJECT_DURATION_DAYS || duration > MAX_PROJECT_DURATION_DAYS) {
        throw new ValidationError({
          type: 'ValidationError',
          message: `Project duration must be between ${MIN_PROJECT_DURATION_DAYS} and ${MAX_PROJECT_DURATION_DAYS} days`
        });
      }

      if (new Date(this.endDate) <= new Date(this.startDate)) {
        throw new ValidationError({
          type: 'ValidationError',
          message: 'End date must be after start date'
        });
      }
    }
  }

  /**
   * Define model relationships
   * Implements type-safe relationships with other entities
   */
  static get relationMappings() {
    return {
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: `${__dirname}/team.model`,
        join: {
          from: 'projects.teamId',
          to: 'teams.id'
        }
      },
      owner: {
        relation: Model.BelongsToOneRelation,
        modelClass: `${__dirname}/user.model`,
        join: {
          from: 'projects.ownerId',
          to: 'users.id'
        }
      },
      members: {
        relation: Model.ManyToManyRelation,
        modelClass: `${__dirname}/user.model`,
        join: {
          from: 'projects.id',
          through: {
            from: 'project_members.projectId',
            to: 'project_members.userId',
            extra: ['role', 'joinedAt']
          },
          to: 'users.id'
        }
      },
      tasks: {
        relation: Model.HasManyRelation,
        modelClass: `${__dirname}/task.model`,
        join: {
          from: 'projects.id',
          to: 'tasks.projectId'
        }
      }
    };
  }

  /**
   * Custom query modifiers
   * Implements common query patterns
   */
  static get modifiers() {
    return {
      active(builder) {
        builder.where('status', ProjectStatus.ACTIVE);
      },
      orderByCreated(builder) {
        builder.orderBy('createdAt', 'desc');
      },
      withFullRelations(builder) {
        builder
          .withGraphFetched('team')
          .withGraphFetched('owner')
          .withGraphFetched('members')
          .withGraphFetched('tasks');
      }
    };
  }
}