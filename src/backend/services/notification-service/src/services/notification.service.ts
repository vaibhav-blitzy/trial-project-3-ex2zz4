/**
 * Enhanced Notification Service Implementation
 * Version: 1.0.0
 * Provides enterprise-grade notification management with real-time delivery,
 * comprehensive tracking, and multi-channel support.
 */

import Redis from 'ioredis';
import { Logger } from 'winston';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import NotificationModel from '../models/notification.model';
import EmailService from './email.service';
import { 
  INotification, 
  INotificationPreferences,
  NotificationDeliveryStatus,
  NotificationType 
} from '../../../shared/interfaces/notification.interface';

/**
 * Configuration interface for notification service
 */
interface NotificationConfig {
  maxRetries: number;
  retryDelay: number;
  rateLimits: {
    points: number;
    duration: number;
  };
  channels: {
    email: boolean;
    inApp: boolean;
    push: boolean;
  };
}

/**
 * Enhanced Notification Service with comprehensive delivery tracking and reliability
 */
export class NotificationService {
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly rateLimiter: RateLimiterRedis;
  private readonly deliveryTracking: Map<string, number>;

  constructor(
    private readonly emailService: EmailService,
    private readonly redisClient: Redis,
    private readonly logger: Logger,
    private readonly config: NotificationConfig
  ) {
    this.maxRetries = config.maxRetries;
    this.retryDelay = config.retryDelay;
    this.deliveryTracking = new Map();

    // Initialize rate limiter
    this.rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      points: config.rateLimits.points,
      duration: config.rateLimits.duration,
      blockDuration: 60 // Block for 1 minute if limit exceeded
    });

    // Initialize Redis subscription for real-time updates
    this.initializeRedisSubscription();
  }

  /**
   * Initialize Redis pub/sub for real-time notification updates
   */
  private initializeRedisSubscription(): void {
    const subscriber = this.redisClient.duplicate();
    
    subscriber.subscribe('notification:status', (err) => {
      if (err) {
        this.logger.error('Redis subscription error:', err);
        throw err;
      }
    });

    subscriber.on('message', async (channel, message) => {
      try {
        const { notificationId, status } = JSON.parse(message);
        await this.updateDeliveryStatus(notificationId, status);
      } catch (error) {
        this.logger.error('Error processing notification status update:', error);
      }
    });
  }

  /**
   * Create and deliver a notification with enhanced tracking
   */
  public async createNotification(
    notificationData: Partial<INotification>,
    preferences: INotificationPreferences
  ): Promise<INotification> {
    try {
      // Check rate limits
      await this.rateLimiter.consume(notificationData.recipientId);

      // Create notification record
      const notification = await NotificationModel.create({
        ...notificationData,
        deliveryStatus: NotificationDeliveryStatus.PENDING,
        createdAt: new Date()
      });

      // Track delivery attempt
      this.deliveryTracking.set(notification.id, 0);

      // Process notification through enabled channels
      await this.processNotificationChannels(notification, preferences);

      return notification;
    } catch (error) {
      this.logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Process notification through configured delivery channels
   */
  private async processNotificationChannels(
    notification: INotification,
    preferences: INotificationPreferences
  ): Promise<void> {
    const deliveryPromises: Promise<void>[] = [];

    // Email channel
    if (this.config.channels.email && preferences.emailEnabled) {
      deliveryPromises.push(this.deliverEmailNotification(notification));
    }

    // In-app channel
    if (this.config.channels.inApp && preferences.inAppEnabled) {
      deliveryPromises.push(this.deliverInAppNotification(notification));
    }

    // Push channel
    if (this.config.channels.push && preferences.pushEnabled) {
      deliveryPromises.push(this.deliverPushNotification(notification));
    }

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Deliver notification via email with retry mechanism
   */
  private async deliverEmailNotification(
    notification: INotification
  ): Promise<void> {
    let attempts = this.deliveryTracking.get(notification.id) || 0;

    while (attempts < this.maxRetries) {
      try {
        const result = await this.emailService.sendNotification(notification);
        
        if (result.success) {
          await this.updateDeliveryStatus(
            notification.id,
            NotificationDeliveryStatus.DELIVERED
          );
          return;
        }
        
        attempts++;
        this.deliveryTracking.set(notification.id, attempts);
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, this.retryDelay * Math.pow(2, attempts))
        );
      } catch (error) {
        this.logger.error(`Email delivery attempt ${attempts + 1} failed:`, error);
        
        if (attempts === this.maxRetries - 1) {
          await this.updateDeliveryStatus(
            notification.id,
            NotificationDeliveryStatus.FAILED
          );
          throw error;
        }
      }
    }
  }

  /**
   * Deliver in-app notification
   */
  private async deliverInAppNotification(
    notification: INotification
  ): Promise<void> {
    try {
      await this.redisClient.publish(
        `user:${notification.recipientId}:notifications`,
        JSON.stringify(notification)
      );
      
      await this.updateDeliveryStatus(
        notification.id,
        NotificationDeliveryStatus.DELIVERED
      );
    } catch (error) {
      this.logger.error('In-app delivery failed:', error);
      await this.updateDeliveryStatus(
        notification.id,
        NotificationDeliveryStatus.FAILED
      );
      throw error;
    }
  }

  /**
   * Deliver push notification (placeholder for future implementation)
   */
  private async deliverPushNotification(
    notification: INotification
  ): Promise<void> {
    // Placeholder for push notification implementation
    this.logger.info('Push notification delivery not implemented');
  }

  /**
   * Update notification delivery status with tracking
   */
  private async updateDeliveryStatus(
    notificationId: string,
    status: NotificationDeliveryStatus
  ): Promise<void> {
    try {
      await NotificationModel.updateDeliveryStatus(notificationId, status);
      
      // Publish status update
      await this.redisClient.publish(
        'notification:status',
        JSON.stringify({ notificationId, status })
      );
      
      this.logger.info(`Notification ${notificationId} status updated to ${status}`);
    } catch (error) {
      this.logger.error('Error updating delivery status:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  public async updateNotificationPreferences(
    userId: string,
    preferences: Partial<INotificationPreferences>
  ): Promise<INotificationPreferences> {
    try {
      const key = `user:${userId}:preferences`;
      const currentPreferences = await this.redisClient.get(key);
      
      const updatedPreferences = {
        ...(currentPreferences ? JSON.parse(currentPreferences) : {}),
        ...preferences,
        userId
      };

      await this.redisClient.set(
        key,
        JSON.stringify(updatedPreferences),
        'EX',
        86400 // Cache for 24 hours
      );

      return updatedPreferences;
    } catch (error) {
      this.logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification delivery status
   */
  public async getDeliveryStatus(
    notificationId: string
  ): Promise<NotificationDeliveryStatus> {
    try {
      const notification = await NotificationModel.findById(notificationId);
      return notification?.deliveryStatus || NotificationDeliveryStatus.PENDING;
    } catch (error) {
      this.logger.error('Error fetching delivery status:', error);
      throw error;
    }
  }
}

export default NotificationService;