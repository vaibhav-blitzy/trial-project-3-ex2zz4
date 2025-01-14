/**
 * Notification Model Definition
 * Version: 1.0.0
 * Implements MongoDB schema and model for notifications with optimized querying
 * and comprehensive delivery status tracking.
 */

import { Schema, model, Document } from 'mongoose';
import { 
  INotification, 
  NotificationType, 
  NotificationPriority,
  NotificationDeliveryStatus 
} from '../../../shared/interfaces/notification.interface';

/**
 * Extended interface for Notification document with Mongoose specifics
 */
interface INotificationDocument extends INotification, Document {}

/**
 * Mongoose schema definition for notifications with optimized indexing
 * and comprehensive validation rules
 */
const NotificationSchema = new Schema<INotificationDocument>({
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 255,
    trim: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  link: {
    type: String,
    default: null,
    validate: {
      validator: (v: string | null) => {
        if (!v) return true;
        try {
          new URL(v);
          return true;
        } catch (e) {
          return false;
        }
      },
      message: 'Invalid URL format'
    }
  },
  recipientId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: String,
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: Object.values(NotificationPriority),
    required: true,
    default: NotificationPriority.MEDIUM,
    index: true
  },
  read: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  deliveryStatus: {
    type: String,
    enum: Object.values(NotificationDeliveryStatus),
    default: NotificationDeliveryStatus.PENDING,
    required: true,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true,
  collection: 'notifications',
  validateBeforeSave: true,
  strict: true,
  useNestedStrict: true
});

/**
 * Compound indexes for optimized querying patterns
 */
NotificationSchema.index(
  { recipientId: 1, createdAt: -1 },
  { background: true, name: 'idx_recipient_created' }
);

NotificationSchema.index(
  { read: 1, recipientId: 1 },
  { background: true, name: 'idx_read_recipient' }
);

NotificationSchema.index(
  { deliveryStatus: 1, recipientId: 1 },
  { background: true, name: 'idx_delivery_recipient' }
);

NotificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'idx_ttl' }
);

/**
 * Pre-save middleware to set delivery tracking timestamps
 */
NotificationSchema.pre('save', function(next) {
  if (this.isModified('deliveryStatus') && 
      this.deliveryStatus === NotificationDeliveryStatus.DELIVERED) {
    this.deliveredAt = new Date();
  }
  if (this.isModified('read') && this.read && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

/**
 * Static methods for common notification operations
 */
NotificationSchema.statics = {
  /**
   * Find notifications for a specific recipient with pagination
   */
  async findByRecipientId(
    recipientId: string,
    page: number = 1,
    limit: number = 20,
    filter: Partial<INotification> = {}
  ) {
    return this.find({ recipientId, ...filter })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  },

  /**
   * Mark multiple notifications as read
   */
  async markAsRead(notificationIds: string[], recipientId: string) {
    return this.updateMany(
      { _id: { $in: notificationIds }, recipientId },
      { $set: { read: true, readAt: new Date() } }
    );
  },

  /**
   * Update delivery status for multiple notifications
   */
  async markAsDelivered(notificationIds: string[]) {
    return this.updateMany(
      { _id: { $in: notificationIds } },
      { 
        $set: { 
          deliveryStatus: NotificationDeliveryStatus.DELIVERED,
          deliveredAt: new Date()
        }
      }
    );
  },

  /**
   * Bulk create notifications with optimized operation
   */
  async bulkCreate(notifications: Partial<INotification>[]) {
    return this.insertMany(notifications, { ordered: false });
  }
};

// Create and export the Notification model
const NotificationModel = model<INotificationDocument>(
  'Notification',
  NotificationSchema
);

export default NotificationModel;