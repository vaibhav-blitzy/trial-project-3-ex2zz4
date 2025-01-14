import { Controller, Get, Post, Put, Delete } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { StatusCodes } from 'http-status-codes'; // ^2.2.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import helmet from 'helmet'; // ^7.0.0
import Logger from '../../../../shared/utils/logger.util';
import ProjectService from '../services/project.service';
import { ProjectValidator } from '../validators/project.validator';
import { IProject, ProjectStatus } from '../../../../shared/interfaces/project.interface';
import { ErrorCodes } from '../../../../shared/constants/error-codes';
import { validatePaginationParams } from '../../../../shared/validators/common.validator';

// Rate limiting configurations
const RATE_LIMITS = {
  CREATE: { windowMs: 3600000, max: 100 }, // 100 requests per hour
  GET: { windowMs: 3600000, max: 1000 },   // 1000 requests per hour
  UPDATE: { windowMs: 3600000, max: 200 },  // 200 requests per hour
  DELETE: { windowMs: 3600000, max: 50 }    // 50 requests per hour
};

// Cache TTL configurations
const CACHE_TTL = {
  PROJECT_DETAILS: 300,  // 5 minutes
  TEAM_PROJECTS: 600,    // 10 minutes
  PROJECT_STATS: 900     // 15 minutes
};

@Controller('projects')
export class ProjectController {
  private readonly logger: Logger;

  constructor(
    private readonly projectService: ProjectService,
    private readonly validator: ProjectValidator
  ) {
    this.logger = Logger.getInstance('ProjectController', {
      enableConsole: true,
      enableFile: true
    });
    this.setupSecurityMiddleware();
  }

  /**
   * Configure security middleware for all routes
   */
  private setupSecurityMiddleware(): void {
    // Apply helmet security headers
    this.use(helmet());

    // Configure rate limiters
    this.use('/create', rateLimit(RATE_LIMITS.CREATE));
    this.use('/:id', rateLimit(RATE_LIMITS.GET));
    this.use('/:id/update', rateLimit(RATE_LIMITS.UPDATE));
    this.use('/:id/delete', rateLimit(RATE_LIMITS.DELETE));
  }

  /**
   * Create new project with enhanced validation and security
   */
  @Post()
  public async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const validatedData = await this.validator.validateCreate(req.body);

      // Create project
      const project = await this.projectService.createProject(validatedData, req.user.id);

      // Log successful creation
      this.logger.info('Project created successfully', {
        projectId: project.id,
        userId: req.user.id,
        teamId: project.teamId
      });

      res.status(StatusCodes.CREATED).json(project);
    } catch (error) {
      this.logger.error('Failed to create project', {
        error,
        userId: req.user?.id,
        body: req.body
      });
      next(error);
    }
  }

  /**
   * Get project details with caching and security checks
   */
  @Get('/:id')
  public async getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await this.projectService.getProject(req.params.id, req.user.id);
      
      // Set cache headers
      res.set('Cache-Control', `private, max-age=${CACHE_TTL.PROJECT_DETAILS}`);
      res.json(project);
    } catch (error) {
      this.logger.error('Failed to retrieve project', {
        error,
        projectId: req.params.id,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Update project with validation and audit logging
   */
  @Put('/:id')
  public async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate update data
      const validatedData = await this.validator.validateUpdate(req.params.id, req.body);

      // Update project
      const updatedProject = await this.projectService.updateProject(
        req.params.id,
        validatedData,
        req.user.id
      );

      // Log successful update
      this.logger.info('Project updated successfully', {
        projectId: req.params.id,
        userId: req.user.id,
        changes: req.body
      });

      res.json(updatedProject);
    } catch (error) {
      this.logger.error('Failed to update project', {
        error,
        projectId: req.params.id,
        userId: req.user?.id,
        body: req.body
      });
      next(error);
    }
  }

  /**
   * Delete project with security checks and cleanup
   */
  @Delete('/:id')
  public async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.projectService.deleteProject(req.params.id, req.user.id);

      // Log successful deletion
      this.logger.info('Project deleted successfully', {
        projectId: req.params.id,
        userId: req.user.id
      });

      res.status(StatusCodes.NO_CONTENT).send();
    } catch (error) {
      this.logger.error('Failed to delete project', {
        error,
        projectId: req.params.id,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Get team projects with pagination and filtering
   */
  @Get('/team/:teamId')
  public async getTeamProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate pagination parameters
      const pagination = validatePaginationParams(req.query);

      const projects = await this.projectService.getTeamProjects(
        req.params.teamId,
        pagination.value,
        req.user.id
      );

      // Set cache headers
      res.set('Cache-Control', `private, max-age=${CACHE_TTL.TEAM_PROJECTS}`);
      res.json(projects);
    } catch (error) {
      this.logger.error('Failed to retrieve team projects', {
        error,
        teamId: req.params.teamId,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Get project statistics with caching
   */
  @Get('/:id/stats')
  public async getProjectStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await this.projectService.getProjectStatistics(req.params.id, req.user.id);

      // Set cache headers
      res.set('Cache-Control', `private, max-age=${CACHE_TTL.PROJECT_STATS}`);
      res.json(stats);
    } catch (error) {
      this.logger.error('Failed to retrieve project statistics', {
        error,
        projectId: req.params.id,
        userId: req.user?.id
      });
      next(error);
    }
  }
}

export default ProjectController;