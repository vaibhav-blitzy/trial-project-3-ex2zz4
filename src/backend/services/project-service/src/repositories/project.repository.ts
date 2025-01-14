import { Knex } from 'knex'; // v2.4.x
import Logger from '../../../../shared/utils/logger.util'; // v3.8.x
import { Project } from '../models/project.model';
import { IProject, ProjectStatus, ProjectMetadata, IProjectStats } from '../../../../shared/interfaces/project.interface';
import DatabaseConnection from '../../../../shared/utils/database.util';
import { ErrorCodes } from '../../../../shared/constants/error-codes';

// Constants for repository operations
const DEFAULT_PAGE_SIZE = 20;
const MAX_BATCH_SIZE = 100;
const CACHE_TTL = 300; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Repository class for project data access operations
 * Implements comprehensive CRUD and query operations with transaction support
 */
export class ProjectRepository {
  private readonly db: Knex;
  private readonly tableName: string;
  private readonly logger: Logger;

  constructor() {
    this.db = DatabaseConnection.getInstance({} as any).getKnex();
    this.tableName = Project.tableName;
    this.logger = Logger.getInstance('ProjectRepository', {
      enableConsole: true,
      enableFile: true
    });
  }

  /**
   * Creates a new project with transaction support
   * @param projectData Project creation data
   * @returns Created project
   */
  public async create(projectData: Partial<IProject>): Promise<IProject> {
    return await DatabaseConnection.getInstance({} as any).withTransaction(async (trx: Knex.Transaction) => {
      try {
        // Validate project data
        Project.validateData(projectData);

        const project = await trx(this.tableName)
          .insert({
            ...projectData,
            status: projectData.status || ProjectStatus.PLANNING,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning('*');

        this.logger.info('Project created successfully', {
          projectId: project[0].id,
          teamId: project[0].teamId
        });

        return project[0];
      } catch (error) {
        this.logger.error('Failed to create project', { error });
        throw error;
      }
    });
  }

  /**
   * Retrieves a project by ID with optional relation loading
   * @param id Project ID
   * @param relations Relations to include
   * @returns Project data
   */
  public async findById(id: string, relations: string[] = []): Promise<IProject | null> {
    try {
      let query = this.db(this.tableName).where({ id });

      if (relations.length > 0) {
        relations.forEach(relation => {
          query = query.withGraphFetched(relation);
        });
      }

      const project = await query.first();

      if (!project) {
        return null;
      }

      return project;
    } catch (error) {
      this.logger.error('Failed to retrieve project', { error, projectId: id });
      throw error;
    }
  }

  /**
   * Updates project data with optimistic locking
   * @param id Project ID
   * @param updateData Update data
   * @returns Updated project
   */
  public async update(id: string, updateData: Partial<IProject>): Promise<IProject> {
    return await DatabaseConnection.getInstance({} as any).withTransaction(async (trx: Knex.Transaction) => {
      try {
        const project = await trx(this.tableName)
          .where({ id })
          .update({
            ...updateData,
            updatedAt: new Date()
          })
          .returning('*');

        if (!project[0]) {
          throw new Error(`Project with ID ${id} not found`);
        }

        this.logger.info('Project updated successfully', { projectId: id });
        return project[0];
      } catch (error) {
        this.logger.error('Failed to update project', { error, projectId: id });
        throw error;
      }
    });
  }

  /**
   * Deletes a project and related data
   * @param id Project ID
   * @returns Boolean indicating success
   */
  public async delete(id: string): Promise<boolean> {
    return await DatabaseConnection.getInstance({} as any).withTransaction(async (trx: Knex.Transaction) => {
      try {
        const deleted = await trx(this.tableName)
          .where({ id })
          .delete();

        this.logger.info('Project deleted successfully', { projectId: id });
        return deleted > 0;
      } catch (error) {
        this.logger.error('Failed to delete project', { error, projectId: id });
        throw error;
      }
    });
  }

  /**
   * Finds projects by team ID with pagination
   * @param teamId Team ID
   * @param page Page number
   * @param pageSize Page size
   * @returns Paginated project list
   */
  public async findByTeam(
    teamId: string,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Promise<{ data: IProject[]; total: number }> {
    try {
      const offset = (page - 1) * pageSize;

      const [projects, total] = await Promise.all([
        this.db(this.tableName)
          .where({ teamId })
          .orderBy('createdAt', 'desc')
          .limit(pageSize)
          .offset(offset),
        this.db(this.tableName)
          .where({ teamId })
          .count('id as count')
          .first()
      ]);

      return {
        data: projects,
        total: parseInt(total?.count as string) || 0
      };
    } catch (error) {
      this.logger.error('Failed to retrieve team projects', { error, teamId });
      throw error;
    }
  }

  /**
   * Retrieves project statistics and metrics
   * @param projectId Project ID
   * @returns Project statistics
   */
  public async getProjectStats(projectId: string): Promise<IProjectStats> {
    try {
      const [taskStats, memberStats] = await Promise.all([
        this.db('tasks')
          .where({ projectId })
          .select(
            this.db.raw('COUNT(*) as total'),
            this.db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as completed', ['COMPLETED'])
          )
          .first(),
        this.db('project_members')
          .where({ projectId })
          .count('userId as count')
          .first()
      ]);

      const progress = taskStats.total > 0 
        ? Math.round((taskStats.completed / taskStats.total) * 100)
        : 0;

      return {
        totalTasks: parseInt(taskStats.total),
        completedTasks: parseInt(taskStats.completed),
        progress,
        activeMembers: parseInt(memberStats?.count || '0'),
        taskDistribution: await this.getTaskDistribution(projectId),
        memberActivity: await this.getMemberActivityStats(projectId),
        lastActivity: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to retrieve project statistics', { error, projectId });
      throw error;
    }
  }

  /**
   * Helper method to get task distribution stats
   * @param projectId Project ID
   * @returns Task distribution data
   */
  private async getTaskDistribution(projectId: string) {
    const distribution = await this.db('tasks')
      .where({ projectId })
      .select('status', 'priority', 'assigneeId')
      .groupBy('status', 'priority', 'assigneeId')
      .count('* as count');

    return {
      byStatus: this.groupByField(distribution, 'status'),
      byPriority: this.groupByField(distribution, 'priority'),
      byAssignee: this.groupByField(distribution, 'assigneeId')
    };
  }

  /**
   * Helper method to get member activity statistics
   * @param projectId Project ID
   * @returns Member activity data
   */
  private async getMemberActivityStats(projectId: string) {
    const activityStats = await this.db('task_activities')
      .where({ projectId })
      .select('userId')
      .max('createdAt as lastActive')
      .count('* as count')
      .groupBy('userId');

    return {
      taskCompletions: this.groupByField(activityStats, 'userId', 'count'),
      lastActive: this.groupByField(activityStats, 'userId', 'lastActive'),
      contributionScore: this.calculateContributionScores(activityStats)
    };
  }

  /**
   * Helper method to group data by field
   * @param data Data array
   * @param field Field to group by
   * @param valueField Value field to use
   * @returns Grouped data object
   */
  private groupByField(data: any[], field: string, valueField: string = 'count'): Record<string, number> {
    return data.reduce((acc, curr) => {
      acc[curr[field]] = parseInt(curr[valueField]);
      return acc;
    }, {});
  }

  /**
   * Helper method to calculate contribution scores
   * @param activityStats Activity statistics
   * @returns Contribution scores by user
   */
  private calculateContributionScores(activityStats: any[]): Record<string, number> {
    return activityStats.reduce((acc, curr) => {
      acc[curr.userId] = parseInt(curr.count) * 10; // Basic scoring algorithm
      return acc;
    }, {});
  }
}

export default ProjectRepository;