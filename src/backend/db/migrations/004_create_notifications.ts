/**
 * Database migration for notifications system schema
 * Version: 1.0.0
 * Implements comprehensive notification tables with performance optimizations
 * and ACID compliance for PostgreSQL
 */

import { Knex } from 'knex'; // v2.4.x
import { NotificationType, NotificationPriority } from '../../shared/interfaces/notification.interface';

/**
 * Creates notifications and notification_preferences tables with optimized indexes
 */
export async function up(knex: Knex): Promise<void> {
  // Create custom enum types for better data integrity and performance
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE notification_type AS ENUM (
        'TASK_ASSIGNED', 'TASK_UPDATED', 'TASK_COMPLETED',
        'PROJECT_CREATED', 'PROJECT_UPDATED', 'COMMENT_ADDED',
        'MENTION', 'SYSTEM'
      );
      CREATE TYPE notification_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create notifications table with comprehensive schema
  await knex.schema.createTable('notifications', (table) => {
    // Primary key and versioning
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.integer('version').notNullable().defaultTo(1);

    // Core notification fields
    table.specificType('type', 'notification_type').notNullable()
      .comment('Type of notification for categorization');
    table.string('title', 255).notNullable()
      .comment('Notification title for display');
    table.text('message').notNullable()
      .comment('Detailed notification message');
    table.string('link', 2048).nullable()
      .comment('Optional link associated with notification');
    table.jsonb('metadata').notNullable().defaultTo('{}')
      .comment('Additional contextual data');

    // Relationships
    table.uuid('recipient_id').notNullable()
      .references('id').inTable('users')
      .onDelete('CASCADE')
      .comment('User receiving the notification');
    table.uuid('sender_id').notNullable()
      .references('id').inTable('users')
      .onDelete('CASCADE')
      .comment('User or system sending the notification');

    // Status and tracking
    table.specificType('priority', 'notification_priority').notNullable()
      .defaultTo('MEDIUM')
      .comment('Priority level affecting delivery urgency');
    table.boolean('read').notNullable().defaultTo(false)
      .comment('Indicates if notification has been read');
    table.boolean('delivered').notNullable().defaultTo(false)
      .comment('Indicates successful delivery');
    table.boolean('expired').notNullable().defaultTo(false)
      .comment('Indicates if notification has expired');

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
      .comment('Timestamp of notification creation');
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
      .comment('Timestamp of last update');
    table.timestamp('read_at').nullable()
      .comment('Timestamp when notification was read');
    table.timestamp('delivered_at').nullable()
      .comment('Timestamp of successful delivery');
    table.timestamp('expired_at').nullable()
      .comment('Optional expiration timestamp');

    // Performance optimized indexes
    table.index(['recipient_id', 'read', 'created_at'], 'idx_notifications_recipient_status')
      .comment('Optimizes queries for user notification lists');
    table.index(['type', 'priority'], 'idx_notifications_type_priority')
      .comment('Optimizes notification filtering and prioritization');
    
    // Partial index for unread notifications
    knex.raw(`
      CREATE INDEX idx_notifications_unread ON notifications (recipient_id, created_at)
      WHERE read = false
    `);

    // Check constraints
    table.check('?? > ??', ['expired_at', 'created_at'], 'chk_notifications_expired_after_created');
    table.check('?? > ??', ['read_at', 'created_at'], 'chk_notifications_read_after_created');
  });

  // Create notification preferences table
  await knex.schema.createTable('notification_preferences', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User relationship
    table.uuid('user_id').notNullable().unique()
      .references('id').inTable('users')
      .onDelete('CASCADE')
      .comment('User associated with these preferences');

    // Delivery channel preferences
    table.boolean('email_enabled').notNullable().defaultTo(true)
      .comment('Enable/disable email notifications');
    table.boolean('push_enabled').notNullable().defaultTo(true)
      .comment('Enable/disable push notifications');
    table.boolean('in_app_enabled').notNullable().defaultTo(true)
      .comment('Enable/disable in-app notifications');

    // Advanced preferences
    table.specificType('muted_types', 'notification_type[]').notNullable().defaultTo('{}')
      .comment('Array of notification types to be muted');
    table.specificType('priority_threshold', 'notification_priority').notNullable()
      .defaultTo('LOW')
      .comment('Minimum priority threshold for receiving notifications');

    // Quiet hours configuration
    table.time('quiet_hours_start').nullable()
      .comment('Start time for quiet hours (24-hour format)');
    table.time('quiet_hours_end').nullable()
      .comment('End time for quiet hours (24-hour format)');
    table.string('timezone', 50).notNullable().defaultTo('UTC')
      .comment('IANA timezone identifier');

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Index for quick preference lookups
    table.index(['user_id'], 'idx_notification_preferences_user');
  });

  // Create updated_at trigger function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Add triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_notifications_timestamp
      BEFORE UPDATE ON notifications
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    
    CREATE TRIGGER update_notification_preferences_timestamp
      BEFORE UPDATE ON notification_preferences
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();
  `);
}

/**
 * Drops notifications and notification_preferences tables with proper cleanup
 */
export async function down(knex: Knex): Promise<void> {
  // Drop tables
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('notifications');

  // Drop custom types
  await knex.raw(`
    DROP TYPE IF EXISTS notification_type;
    DROP TYPE IF EXISTS notification_priority;
  `);

  // Drop trigger function
  await knex.raw('DROP FUNCTION IF EXISTS update_timestamp CASCADE;');
}