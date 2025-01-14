/**
 * Database migration for tasks schema implementation
 * Version: 1.0.0
 * Creates comprehensive task management tables with audit trails,
 * optimized indexes and partition support for horizontal scaling
 */

import { Knex } from 'knex'; // v2.4.x
import { TaskPriority, TaskStatus } from '../../shared/interfaces/task.interface';

/**
 * Creates tasks schema with all required tables and constraints
 */
export async function up(knex: Knex): Promise<void> {
  // Create custom enum types for better data integrity
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE task_status AS ENUM (
        '${TaskStatus.TODO}', 
        '${TaskStatus.IN_PROGRESS}', 
        '${TaskStatus.REVIEW}', 
        '${TaskStatus.DONE}'
      );
      
      CREATE TYPE task_priority AS ENUM (
        '${TaskPriority.LOW}',
        '${TaskPriority.MEDIUM}',
        '${TaskPriority.HIGH}',
        '${TaskPriority.URGENT}'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create tasks table with partition support
  await knex.schema.createTable('tasks', (table) => {
    // Primary key and partition key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().index();
    
    // Core fields
    table.string('title', 255).notNullable();
    table.text('description');
    table.specificType('status', 'task_status').notNullable().defaultTo(TaskStatus.TODO);
    table.specificType('priority', 'task_priority').notNullable().defaultTo(TaskPriority.MEDIUM);
    
    // Tracking fields
    table.timestamp('due_date');
    table.specificType('assignee_ids', 'uuid[]').notNullable().defaultTo('{}');
    table.uuid('creator_id').notNullable();
    table.specificType('attachment_ids', 'uuid[]').notNullable().defaultTo('{}');
    
    // Metadata fields
    table.specificType('tags', 'text[]').notNullable().defaultTo('{}');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes for optimization
    table.index(['status', 'priority'], 'idx_tasks_status_priority');
    table.index('creator_id');
    table.index('due_date');
    table.index('created_at');
  });

  // Create task comments table
  await knex.schema.createTable('task_comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('task_id').notNullable().references('id').inTable('tasks').onDelete('CASCADE');
    table.uuid('user_id').notNullable();
    table.text('content').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    table.index(['task_id', 'created_at']);
  });

  // Create task activities table for audit trail
  await knex.schema.createTable('task_activities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('task_id').notNullable().references('id').inTable('tasks').onDelete('CASCADE');
    table.uuid('user_id').notNullable();
    table.string('activity_type', 50).notNullable();
    table.jsonb('changes').notNullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    table.index(['task_id', 'created_at']);
    table.index('activity_type');
  });

  // Create GiST index for array operations
  await knex.raw(`
    CREATE INDEX idx_tasks_assignee_ids ON tasks USING GIN (assignee_ids);
    CREATE INDEX idx_tasks_tags ON tasks USING GIN (tags);
  `);

  // Create partial index for active tasks
  await knex.raw(`
    CREATE INDEX idx_tasks_active ON tasks (project_id, status)
    WHERE status != '${TaskStatus.DONE}';
  `);

  // Add foreign key constraints
  await knex.schema.alterTable('tasks', (table) => {
    table.foreign('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.foreign('creator_id').references('id').inTable('users').onDelete('RESTRICT');
  });

  // Create trigger for updated_at maintenance
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_tasks_updated_at
      BEFORE UPDATE ON tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_task_comments_updated_at
      BEFORE UPDATE ON task_comments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Add row-level security policies
  await knex.raw(`
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY tasks_access_policy ON tasks
    USING (
      creator_id = current_user_id() 
      OR current_user_id() = ANY(assignee_ids)
      OR EXISTS (
        SELECT 1 FROM project_members 
        WHERE project_id = tasks.project_id 
        AND user_id = current_user_id()
      )
    );
  `);
}

/**
 * Rolls back tasks schema changes
 */
export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('task_activities');
  await knex.schema.dropTableIfExists('task_comments');
  await knex.schema.dropTableIfExists('tasks');

  // Drop custom types
  await knex.raw(`
    DROP TYPE IF EXISTS task_status;
    DROP TYPE IF EXISTS task_priority;
  `);

  // Drop triggers and functions
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
    DROP TRIGGER IF EXISTS update_task_comments_updated_at ON task_comments;
    DROP FUNCTION IF EXISTS update_updated_at_column();
  `);
}