/**
 * Database migration for creating the projects table with comprehensive schema design
 * Version: 1.0.0
 * Implements project organization requirements with proper constraints and relationships
 */

import { Knex } from 'knex'; // v2.4.x
import { ProjectStatus } from '../../shared/interfaces/project.interface';

/**
 * Creates the projects table with comprehensive schema including UUID primary key,
 * relationships, constraints, and optimized indexes
 */
export async function up(knex: Knex): Promise<void> {
  await knex.transaction(async (trx: Knex.Transaction) => {
    // Create enum type for project status
    await trx.raw(`
      CREATE TYPE project_status_enum AS ENUM (
        '${ProjectStatus.PLANNING}',
        '${ProjectStatus.ACTIVE}',
        '${ProjectStatus.ON_HOLD}',
        '${ProjectStatus.COMPLETED}',
        '${ProjectStatus.ARCHIVED}'
      )
    `);

    // Create projects table with comprehensive schema
    await trx.schema.createTable('projects', (table) => {
      // Primary key using UUID
      table.uuid('id').primary().defaultTo(trx.raw('gen_random_uuid()'));

      // Basic project information
      table.string('name', 255).notNullable();
      table.text('description');
      table.specificType('status', 'project_status_enum').notNullable().defaultTo(ProjectStatus.PLANNING);

      // Relationships
      table.uuid('team_id').notNullable().references('id')
        .inTable('teams')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
      
      table.uuid('owner_id').references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE');

      // Team member management
      table.specificType('member_ids', 'uuid[]').notNullable().defaultTo('{}');

      // Project timeline
      table.timestamptz('start_date').notNullable();
      table.timestamptz('end_date');

      // Project configuration using JSONB for flexibility
      table.jsonb('settings').notNullable().defaultTo('{}');

      // Metadata and tracking
      table.jsonb('metadata').notNullable().defaultTo('{}');
      table.timestamptz('created_at').notNullable().defaultTo(trx.fn.now());
      table.timestamptz('updated_at').notNullable().defaultTo(trx.fn.now());

      // Unique constraints
      table.unique(['team_id', 'name']);
    });

    // Create optimized indexes
    await trx.schema.raw(`
      -- B-tree index for foreign key lookups
      CREATE INDEX idx_projects_team_id ON projects USING btree (team_id);
      
      -- B-tree index for owner queries
      CREATE INDEX idx_projects_owner_id ON projects USING btree (owner_id);
      
      -- B-tree index for status filtering
      CREATE INDEX idx_projects_status ON projects USING btree (status);
      
      -- GiST index for date range queries
      CREATE INDEX idx_projects_dates ON projects USING gist (start_date, end_date);
      
      -- GIN index for JSONB fields
      CREATE INDEX idx_projects_settings ON projects USING gin (settings jsonb_path_ops);
      CREATE INDEX idx_projects_metadata ON projects USING gin (metadata jsonb_path_ops);
      
      -- Array index for member lookups
      CREATE INDEX idx_projects_member_ids ON projects USING gin (member_ids);
    `);

    // Add check constraints
    await trx.schema.raw(`
      -- Ensure end_date is after start_date when set
      ALTER TABLE projects 
      ADD CONSTRAINT chk_projects_dates 
      CHECK (end_date IS NULL OR end_date > start_date);
      
      -- Ensure name is not empty
      ALTER TABLE projects 
      ADD CONSTRAINT chk_projects_name 
      CHECK (length(trim(name)) > 0);
    `);

    // Create trigger for updating updated_at timestamp
    await trx.schema.raw(`
      CREATE TRIGGER trg_projects_updated_at 
      BEFORE UPDATE ON projects 
      FOR EACH ROW 
      EXECUTE FUNCTION update_timestamp();
    `);
  });
}

/**
 * Rolls back the projects table creation with proper cleanup
 */
export async function down(knex: Knex): Promise<void> {
  await knex.transaction(async (trx: Knex.Transaction) => {
    // Drop table and all associated objects
    await trx.schema.dropTableIfExists('projects');
    
    // Drop custom enum type
    await trx.raw('DROP TYPE IF EXISTS project_status_enum');
  });
}