/**
 * Enhanced Notification Controller Implementation
 * Version: 1.0.0
 * Handles notification-related HTTP requests with comprehensive error handling,
 * monitoring, and security features.
 */

import { Router, Request, Response } from 'express'; // ^4.18.0
import { Logger } from 'winston'; // ^3.8.0
import { RateLimiter } from 'rate-limiter-flexible'; // ^3.0.0
import { validate } from 'class-validator'; // ^0.14.0
import { NotificationService } from '../services/notification.service';
import { 
  INotification, 
  NotificationType, 
  NotificationPriority,
  INotificationPreferences 
} from '../../../shared/interfaces/notification.interface';

/**
 * Enhanced controller for handling notification-related HTTP requests
 */
export class NotificationController {
  private readonly router: Router;
  private readonly rateLimiter: RateLimiter;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly logger: Logger
  ) {
    this.router = Router();
    this.initializeRateLimiter();
    this.initializeRoutes();
  }

  /**
   * Initialize rate limiter for request throttling
   */
  private initializeRateLimiter(): void {
    this.rateLimiter = new RateLimiter({
      points: 100, // Number of points
      duration: 60, // Per 60 seconds
      blockDuration: 120 // Block for 2 minutes if exceeded
    });
  }

  /**
   * Initialize controller routes with security middleware
   */
  private initializeRoutes(): void {
    this.router.post(
      '/notifications',
      this.validateRequest,
      this.rateLimit.bind(this),
      this.createNotification.bind(this)
    );

    this.router.get(
      '/notifications',
      this.validateRequest,
      this.rateLimit.bind(this),
      this.getNotifications.bind(this)
    );

    this.router.patch(
      '/notifications/:id/read',
      this.validateRequest,
      this.rateLimit.bind(this),
      this.markAsRead.bind(this)
    );

    this.router.delete(
      '/notifications/:id',
      this.validateRequest,
      this.rateLimit.bind(this),
      this.deleteNotification.bind(this)
    );

    this.router.put(
      '/notifications/preferences',
      this.validateRequest,
      this.rateLimit.bind(this),
      this.updatePreferences.bind(this)
    );
  }

  /**
   * Rate limiting middleware
   */
  private async rateLimit(req: Request, res: Response, next: Function): Promise<void> {
    try {
      await this.rateLimiter.consume(req.ip);
      next();
    } catch (error) {
      this.logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: error.msBeforeNext / 1000
      });
    }
  }

  /**
   * Request validation middleware
   */
  private async validateRequest(req: Request, res: Response, next: Function): Promise<void> {
    try {
      const errors = await validate(req.body);
      if (errors.length > 0) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
        return;
      }
      next();
    } catch (error) {
      this.logger.error('Validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create a new notification
   */
  public async createNotification(req: Request, res: Response): Promise<Response> {
    try {
      const notificationData: Partial<INotification> = {
        type: req.body.type as NotificationType,
        title: req.body.title,
        message: req.body.message,
        recipientId: req.body.recipientId,
        senderId: req.user.id, // From auth middleware
        priority: req.body.priority || NotificationPriority.MEDIUM,
        metadata: req.body.metadata || {}
      };

      const preferences = await this.notificationService.getNotificationPreferences(
        notificationData.recipientId
      );

      const notification = await this.notificationService.createNotification(
        notificationData,
        preferences
      );

      this.logger.info('Notification created:', { id: notification.id });
      return res.status(201).json(notification);
    } catch (error) {
      this.logger.error('Error creating notification:', error);
      return res.status(500).json({
        error: 'Failed to create notification',
        details: error.message
      });
    }
  }

  /**
   * Get notifications with pagination and filtering
   */
  public async getNotifications(req: Request, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filter = {
        recipientId: req.user.id,
        read: req.query.read === 'true',
        type: req.query.type as NotificationType
      };

      const notifications = await this.notificationService.getNotifications(
        filter,
        page,
        limit
      );

      return res.status(200).json(notifications);
    } catch (error) {
      this.logger.error('Error fetching notifications:', error);
      return res.status(500).json({
        error: 'Failed to fetch notifications',
        details: error.message
      });
    }
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await this.notificationService.markAsRead(id, userId);

      this.logger.info('Notification marked as read:', { id });
      return res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
      this.logger.error('Error marking notification as read:', error);
      return res.status(500).json({
        error: 'Failed to mark notification as read',
        details: error.message
      });
    }
  }

  /**
   * Delete a notification
   */
  public async deleteNotification(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await this.notificationService.deleteNotification(id, userId);

      this.logger.info('Notification deleted:', { id });
      return res.status(204).send();
    } catch (error) {
      this.logger.error('Error deleting notification:', error);
      return res.status(500).json({
        error: 'Failed to delete notification',
        details: error.message
      });
    }
  }

  /**
   * Update notification preferences
   */
  public async updatePreferences(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const preferences: Partial<INotificationPreferences> = req.body;

      const updatedPreferences = await this.notificationService.updateNotificationPreferences(
        userId,
        preferences
      );

      this.logger.info('Notification preferences updated:', { userId });
      return res.status(200).json(updatedPreferences);
    } catch (error) {
      this.logger.error('Error updating notification preferences:', error);
      return res.status(500).json({
        error: 'Failed to update notification preferences',
        details: error.message
      });
    }
  }

  /**
   * Get router instance
   */
  public getRouter(): Router {
    return this.router;
  }
}

export default NotificationController;