import { MongoMemoryServer } from 'mongodb-memory-server';
import Redis from 'ioredis-mock';
import { faker } from '@faker-js/faker';
import NotificationService from '../src/services/notification.service';
import NotificationModel from '../src/models/notification.model';
import { 
  INotification, 
  NotificationType, 
  NotificationPriority,
  NotificationDeliveryStatus,
  INotificationPreferences 
} from '../../../shared/interfaces/notification.interface';
import EmailService from '../src/services/email.service';
import { Logger } from 'winston';

describe('NotificationService', () => {
  let mongoServer: MongoMemoryServer;
  let notificationService: NotificationService;
  let redisClient: Redis;
  let emailService: EmailService;
  let mockLogger: Partial<Logger>;

  const mockConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    rateLimits: {
      points: 100,
      duration: 60
    },
    channels: {
      email: true,
      inApp: true,
      push: false
    }
  };

  beforeAll(async () => {
    // Setup MongoDB memory server
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'test-notifications',
        storageEngine: 'wiredTiger'
      }
    });

    // Setup Redis mock
    redisClient = new Redis({
      data: new Map()
    });

    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    // Setup email service mock
    emailService = new EmailService();
    jest.spyOn(emailService, 'sendNotification').mockImplementation(async () => ({
      success: true,
      messageId: faker.string.uuid(),
      timestamp: new Date(),
      attempts: 1
    }));

    // Initialize notification service
    notificationService = new NotificationService(
      emailService,
      redisClient,
      mockLogger as Logger,
      mockConfig
    );
  });

  afterAll(async () => {
    await mongoServer.stop();
    await redisClient.quit();
    jest.clearAllMocks();
  });

  describe('Notification Creation and Delivery', () => {
    it('should create and deliver a notification successfully', async () => {
      const notificationData: Partial<INotification> = {
        type: NotificationType.TASK_ASSIGNED,
        title: 'New Task Assignment',
        message: 'You have been assigned a new task',
        recipientId: faker.string.uuid(),
        senderId: faker.string.uuid(),
        priority: NotificationPriority.HIGH,
        metadata: {
          taskId: faker.string.uuid(),
          projectId: faker.string.uuid(),
          recipientEmail: faker.internet.email()
        }
      };

      const preferences: INotificationPreferences = {
        userId: notificationData.recipientId!,
        emailEnabled: true,
        pushEnabled: false,
        inAppEnabled: true,
        mutedTypes: [],
        priorityThreshold: NotificationPriority.LOW,
        quietHours: {
          start: '22:00',
          end: '06:00',
          timezone: 'UTC'
        },
        deliveryChannels: {
          [NotificationType.TASK_ASSIGNED]: ['email', 'inApp']
        }
      };

      const notification = await notificationService.createNotification(
        notificationData,
        preferences
      );

      expect(notification).toBeDefined();
      expect(notification.id).toBeDefined();
      expect(notification.deliveryStatus).toBe(NotificationDeliveryStatus.DELIVERED);
      expect(emailService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining(notificationData)
      );
    });

    it('should handle delivery failure and retry mechanism', async () => {
      jest.spyOn(emailService, 'sendNotification')
        .mockRejectedValueOnce(new Error('Delivery failed'))
        .mockResolvedValueOnce({
          success: true,
          messageId: faker.string.uuid(),
          timestamp: new Date(),
          attempts: 2
        });

      const notificationData: Partial<INotification> = {
        type: NotificationType.TASK_UPDATED,
        title: 'Task Update',
        message: 'Task status has changed',
        recipientId: faker.string.uuid(),
        senderId: faker.string.uuid(),
        priority: NotificationPriority.MEDIUM,
        metadata: {
          taskId: faker.string.uuid(),
          recipientEmail: faker.internet.email()
        }
      };

      const preferences: INotificationPreferences = {
        userId: notificationData.recipientId!,
        emailEnabled: true,
        pushEnabled: false,
        inAppEnabled: true,
        mutedTypes: [],
        priorityThreshold: NotificationPriority.LOW,
        quietHours: {
          start: '22:00',
          end: '06:00',
          timezone: 'UTC'
        },
        deliveryChannels: {
          [NotificationType.TASK_UPDATED]: ['email']
        }
      };

      const notification = await notificationService.createNotification(
        notificationData,
        preferences
      );

      expect(notification.deliveryStatus).toBe(NotificationDeliveryStatus.DELIVERED);
      expect(emailService.sendNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits for notifications', async () => {
      const createNotification = async () => {
        const notificationData: Partial<INotification> = {
          type: NotificationType.SYSTEM,
          title: 'Test Notification',
          message: 'Rate limit test',
          recipientId: faker.string.uuid(),
          senderId: faker.string.uuid(),
          priority: NotificationPriority.LOW
        };

        const preferences: INotificationPreferences = {
          userId: notificationData.recipientId!,
          emailEnabled: true,
          inAppEnabled: true,
          pushEnabled: false,
          mutedTypes: [],
          priorityThreshold: NotificationPriority.LOW,
          quietHours: {
            start: '22:00',
            end: '06:00',
            timezone: 'UTC'
          },
          deliveryChannels: {
            [NotificationType.SYSTEM]: ['inApp']
          }
        };

        return notificationService.createNotification(notificationData, preferences);
      };

      const promises = Array(150).fill(null).map(createNotification);
      const results = await Promise.allSettled(promises);

      const rejected = results.filter(r => r.status === 'rejected');
      expect(rejected.length).toBeGreaterThan(0);
    });
  });

  describe('Notification Preferences', () => {
    it('should respect user notification preferences', async () => {
      const notificationData: Partial<INotification> = {
        type: NotificationType.MENTION,
        title: 'You were mentioned',
        message: '@user mentioned you in a comment',
        recipientId: faker.string.uuid(),
        senderId: faker.string.uuid(),
        priority: NotificationPriority.MEDIUM
      };

      const preferences: INotificationPreferences = {
        userId: notificationData.recipientId!,
        emailEnabled: false,
        pushEnabled: false,
        inAppEnabled: true,
        mutedTypes: [NotificationType.TASK_UPDATED],
        priorityThreshold: NotificationPriority.MEDIUM,
        quietHours: {
          start: '22:00',
          end: '06:00',
          timezone: 'UTC'
        },
        deliveryChannels: {
          [NotificationType.MENTION]: ['inApp']
        }
      };

      const notification = await notificationService.createNotification(
        notificationData,
        preferences
      );

      expect(notification).toBeDefined();
      expect(emailService.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time notification status updates', async () => {
      const notification = await NotificationModel.create({
        type: NotificationType.TASK_ASSIGNED,
        title: 'Real-time Test',
        message: 'Testing real-time updates',
        recipientId: faker.string.uuid(),
        senderId: faker.string.uuid(),
        deliveryStatus: NotificationDeliveryStatus.PENDING
      });

      const statusUpdate = {
        notificationId: notification.id,
        status: NotificationDeliveryStatus.DELIVERED
      };

      await redisClient.publish(
        'notification:status',
        JSON.stringify(statusUpdate)
      );

      const updatedNotification = await NotificationModel.findById(notification.id);
      expect(updatedNotification?.deliveryStatus).toBe(NotificationDeliveryStatus.DELIVERED);
    });
  });

  describe('Security Validation', () => {
    it('should validate notification content for security', async () => {
      const maliciousData: Partial<INotification> = {
        type: NotificationType.SYSTEM,
        title: '<script>alert("xss")</script>',
        message: 'javascript:alert("xss")',
        recipientId: faker.string.uuid(),
        senderId: faker.string.uuid()
      };

      const preferences: INotificationPreferences = {
        userId: maliciousData.recipientId!,
        emailEnabled: true,
        pushEnabled: false,
        inAppEnabled: true,
        mutedTypes: [],
        priorityThreshold: NotificationPriority.LOW,
        quietHours: {
          start: '22:00',
          end: '06:00',
          timezone: 'UTC'
        },
        deliveryChannels: {
          [NotificationType.SYSTEM]: ['email', 'inApp']
        }
      };

      await expect(
        notificationService.createNotification(maliciousData, preferences)
      ).rejects.toThrow();
    });
  });
});