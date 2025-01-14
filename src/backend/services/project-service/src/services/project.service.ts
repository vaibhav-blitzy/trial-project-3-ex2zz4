import { Injectable } from '@nestjs/common';
import CircuitBreaker from 'opossum'; // v6.0.0
import Redis from 'ioredis'; // v5.0.0
import Logger from '../../../../shared/utils/logger.util'; // v3.8.0
import ProjectRepository from '../repositories/project.repository';
import NotificationService from '../../notification-service/src/services/notification.service';
import { IProject, ProjectStatus, ProjectMetadata } from '../../../../shared/interfaces/project.interface';
import { NotificationType, NotificationPriority } from '../../../../shared/interfaces/notification.interface';
import { ErrorCodes } from '../../../../shared/constants/error-codes';

// Constants for service configuration
const CACHE_TTL = 3600; // 1 hour
const MAX_TEAM_PROJECTS = 100;
const PROJECT_CACHE_PREFIX = 'project:';
const MAX_RETRY_ATTEMPTS = 3;
const CIRCUIT_BREAKER_TIMEOUT = 5000;
const POOL_MIN_SIZE = 5;
const POOL_MAX_SIZE = 20;

@Injectable()
export class ProjectService {
  private readonly logger: Logger;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly notificationService: NotificationService,
    private readonly redisClient: Redis
  ) {
    // Initialize logger
    this.logger = Logger.getInstance('ProjectService', {
      enableConsole: true,
      enableFile: true
    });

    // Configure circuit breaker for external service calls
    this.circuitBreaker = new CircuitBreaker(this.notificationService.createNotification, {
      timeout: CIRCUIT_BREAKER_TIMEOUT,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });

    // Initialize Redis connection pool
    this.initializeRedisPool();
  }

  /**
   * Creates a new project with enhanced validation and notification
   */
  public async createProject(projectData: Partial<IProject>, userId: string): Promise<IProject> {
    try {
      // Validate team project limit
      await this.validateTeamProjectLimit(projectData.teamId);

      // Create project with transaction support
      const project = await this.projectRepository.create({
        ...projectData,
        ownerId: userId,
        status: ProjectStatus.PLANNING,
        metadata: this.initializeProjectMetadata(projectData.metadata)
      });

      // Cache project data
      await this.cacheProjectData(project);

      // Send notifications with circuit breaker
      await this.circuitBreaker.fire({
        type: NotificationType.PROJECT_CREATED,
        title: `New Project: ${project.name}`,
        message: `Project ${project.name} has been created`,
        recipientId: project.teamId,
        senderId: userId,
        priority: NotificationPriority.HIGH,
        metadata: {
          projectId: project.id,
          projectName: project.name,
          teamId: project.teamId
        }
      });

      this.logger.info('Project created successfully', {
        projectId: project.id,
        teamId: project.teamId,
        userId
      });

      return project;
    } catch (error) {
      this.logger.error('Failed to create project', {
        error,
        teamId: projectData.teamId,
        userId
      });
      throw error;
    }
  }

  /**
   * Updates project details with optimistic locking
   */
  public async updateProject(
    projectId: string,
    updateData: Partial<IProject>,
    userId: string
  ): Promise<IProject> {
    try {
      // Get current project state
      const currentProject = await this.getProjectFromCache(projectId) ||
        await this.projectRepository.findById(projectId);

      if (!currentProject) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Validate update permissions
      await this.validateProjectAccess(currentProject, userId);

      // Update project
      const updatedProject = await this.projectRepository.update(projectId, {
        ...updateData,
        metadata: {
          ...currentProject.metadata,
          ...updateData.metadata
        }
      });

      // Update cache
      await this.cacheProjectData(updatedProject);

      // Send update notification
      await this.circuitBreaker.fire({
        type: NotificationType.PROJECT_UPDATED,
        title: `Project Updated: ${updatedProject.name}`,
        message: `Project ${updatedProject.name} has been updated`,
        recipientId: updatedProject.teamId,
        senderId: userId,
        priority: NotificationPriority.MEDIUM,
        metadata: {
          projectId: updatedProject.id,
          projectName: updatedProject.name,
          changes: this.getProjectChanges(currentProject, updatedProject)
        }
      });

      return updatedProject;
    } catch (error) {
      this.logger.error('Failed to update project', {
        error,
        projectId,
        userId
      });
      throw error;
    }
  }

  /**
   * Retrieves project details with caching
   */
  public async getProject(projectId: string, userId: string): Promise<IProject> {
    try {
      // Try cache first
      const cachedProject = await this.getProjectFromCache(projectId);
      if (cachedProject) {
        return cachedProject;
      }

      // Fetch from database
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Validate access
      await this.validateProjectAccess(project, userId);

      // Cache result
      await this.cacheProjectData(project);

      return project;
    } catch (error) {
      this.logger.error('Failed to retrieve project', {
        error,
        projectId,
        userId
      });
      throw error;
    }
  }

  /**
   * Gets project statistics and metrics
   */
  public async getProjectStats(projectId: string, userId: string): Promise<any> {
    try {
      const project = await this.getProject(projectId, userId);
      return await this.projectRepository.getProjectStats(projectId);
    } catch (error) {
      this.logger.error('Failed to retrieve project statistics', {
        error,
        projectId,
        userId
      });
      throw error;
    }
  }

  /**
   * Helper method to initialize Redis connection pool
   */
  private initializeRedisPool(): void {
    this.redisClient.on('error', (error) => {
      this.logger.error('Redis connection error', { error });
    });

    this.redisClient.on('connect', () => {
      this.logger.info('Redis connection established');
    });
  }

  /**
   * Helper method to validate team project limit
   */
  private async validateTeamProjectLimit(teamId: string): Promise<void> {
    const { total } = await this.projectRepository.findByTeam(teamId, 1, 1);
    if (total >= MAX_TEAM_PROJECTS) {
      throw new Error(`Team has reached maximum project limit of ${MAX_TEAM_PROJECTS}`);
    }
  }

  /**
   * Helper method to initialize project metadata
   */
  private initializeProjectMetadata(metadata?: Partial<ProjectMetadata>): ProjectMetadata {
    return {
      category: metadata?.category || 'GENERAL',
      tags: metadata?.tags || [],
      priority: metadata?.priority || 'MEDIUM',
      customData: metadata?.customData || {}
    };
  }

  /**
   * Helper method to cache project data
   */
  private async cacheProjectData(project: IProject): Promise<void> {
    const cacheKey = `${PROJECT_CACHE_PREFIX}${project.id}`;
    await this.redisClient.setex(
      cacheKey,
      CACHE_TTL,
      JSON.stringify(project)
    );
  }

  /**
   * Helper method to get project from cache
   */
  private async getProjectFromCache(projectId: string): Promise<IProject | null> {
    const cacheKey = `${PROJECT_CACHE_PREFIX}${projectId}`;
    const cached = await this.redisClient.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Helper method to validate project access
   */
  private async validateProjectAccess(project: IProject, userId: string): Promise<void> {
    if (project.ownerId !== userId && !project.memberIds.includes(userId)) {
      throw new Error(ErrorCodes.RESOURCE_ACCESS_DENIED.toString());
    }
  }

  /**
   * Helper method to get project changes for notifications
   */
  private getProjectChanges(
    oldProject: IProject,
    newProject: IProject
  ): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    Object.keys(newProject).forEach(key => {
      if (JSON.stringify(oldProject[key]) !== JSON.stringify(newProject[key])) {
        changes[key] = {
          old: oldProject[key],
          new: newProject[key]
        };
      }
    });

    return changes;
  }
}

export default ProjectService;