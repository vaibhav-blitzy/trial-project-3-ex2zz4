import { Knex } from 'knex'; // v2.4.x
import { UserRole } from '../../shared/interfaces/auth.interface';

/**
 * Creates users table with comprehensive security, authentication and auditing features
 */
export async function up(knex: Knex): Promise<void> {
  // Create custom types
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'locked');
      CREATE TYPE auth_provider AS ENUM ('local', 'google', 'github', 'microsoft');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create users table
  await knex.schema.createTable('users', (table) => {
    // Primary key and identification
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 128); // Argon2id hash
    
    // Profile information
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.string('avatar_url', 512);
    table.string('timezone', 50).defaultTo('UTC');
    table.specificType('status', 'user_status').notNullable().defaultTo('active');

    // Role and permissions
    table.enum('role', Object.values(UserRole)).notNullable().defaultTo(UserRole.GUEST);
    table.jsonb('permissions').defaultTo('{}');
    table.boolean('is_system_admin').notNullable().defaultTo(false);

    // Multi-factor authentication
    table.boolean('mfa_enabled').notNullable().defaultTo(false);
    table.string('mfa_secret', 64);
    table.jsonb('mfa_backup_codes');
    table.specificType('mfa_methods', 'text[]');

    // OAuth integration
    table.specificType('oauth_provider', 'auth_provider');
    table.string('oauth_id', 255);
    table.jsonb('oauth_data');

    // Security tracking
    table.timestamp('last_login');
    table.integer('failed_attempts').notNullable().defaultTo(0);
    table.timestamp('locked_until');
    table.string('last_ip_address', 45);
    table.string('last_user_agent', 512);
    table.jsonb('security_events');

    // Audit trail
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.uuid('created_by');
    table.uuid('updated_by');

    // Indexes
    table.index('email');
    table.index(['oauth_provider', 'oauth_id']);
    table.index('role');
    table.index('created_at');
    table.index('deleted_at');
  });

  // Add foreign key constraints
  await knex.schema.alterTable('users', (table) => {
    table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('updated_by').references('id').inTable('users').onDelete('SET NULL');
  });

  // Create updated_at trigger function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create audit log function and trigger
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS user_audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id),
      action varchar(50) NOT NULL,
      old_data jsonb,
      new_data jsonb,
      changed_by uuid REFERENCES users(id),
      changed_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE OR REPLACE FUNCTION audit_users_changes()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO user_audit_logs (
        user_id,
        action,
        old_data,
        new_data,
        changed_by
      )
      VALUES (
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        CURRENT_USER
      );
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER users_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON users
      FOR EACH ROW EXECUTE FUNCTION audit_users_changes();
  `);

  // Create row level security policies
  await knex.raw(`
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;

    CREATE POLICY users_view_policy ON users
      FOR SELECT
      USING (
        (CURRENT_USER = 'system_admin')
        OR (id = CURRENT_USER)
        OR (role = 'ADMIN')
      );

    CREATE POLICY users_modify_policy ON users
      FOR ALL
      USING (CURRENT_USER = 'system_admin');
  `);
}

/**
 * Removes users table and related objects
 */
export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw('DROP TRIGGER IF EXISTS users_audit_trigger ON users');
  await knex.raw('DROP TRIGGER IF EXISTS update_users_updated_at ON users');

  // Drop functions
  await knex.raw('DROP FUNCTION IF EXISTS audit_users_changes()');
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column()');

  // Drop audit logs table
  await knex.schema.dropTableIfExists('user_audit_logs');

  // Drop users table
  await knex.schema.dropTableIfExists('users');

  // Drop custom types
  await knex.raw(`
    DROP TYPE IF EXISTS user_status;
    DROP TYPE IF EXISTS auth_provider;
  `);
}