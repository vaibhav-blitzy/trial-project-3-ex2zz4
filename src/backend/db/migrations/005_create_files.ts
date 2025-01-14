import { Knex } from 'knex'; // v2.4.x - Database migration and schema builder
import { IFile } from '../../shared/interfaces/file.interface';

/**
 * Creates the files table with enhanced security constraints, optimized indexes,
 * and S3 integration support for storing file metadata.
 * @param knex - Knex instance for database operations
 */
export async function up(knex: Knex): Promise<void> {
  // Enable UUID generation capability
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await knex.schema.createTable('files', (table) => {
    // Primary key using UUID
    table.uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'))
      .notNullable();

    // File metadata columns with constraints
    table.string('name', 255)
      .notNullable()
      .comment('Sanitized file name used for storage');

    table.string('original_name', 255)
      .notNullable()
      .comment('Original file name as uploaded by user');

    table.string('mime_type', 127)
      .notNullable()
      .checkRegex('^[a-zA-Z0-9]+/[a-zA-Z0-9.+-]+$', 'mime_type_format')
      .comment('MIME type of the file with format validation');

    table.bigInteger('size')
      .notNullable()
      .checkPositive('size_positive')
      .comment('File size in bytes');

    table.string('path', 1024)
      .notNullable()
      .comment('Storage path/key in S3-compatible storage');

    table.string('url', 2048)
      .notNullable()
      .comment('Public access URL for the file');

    // Timestamps with timezone support
    table.timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when file was created');

    table.timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when file was last updated');

    // Table comment
    table.comment(
      'Stores file metadata for attachments with S3 integration support. ' +
      'Actual file content is stored in S3-compatible object storage.'
    );
  });

  // Create optimized indexes
  await knex.schema.alterTable('files', (table) => {
    // Index for temporal queries
    table.index(['created_at'], 'idx_files_created_at', { algorithm: 'btree' });
    
    // Index for content type filtering
    table.index(['mime_type'], 'idx_files_mime_type', { algorithm: 'btree' });
  });

  // Create updated_at trigger
  await knex.raw(`
    CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
}

/**
 * Rolls back the files table creation with proper cleanup of related objects.
 * @param knex - Knex instance for database operations
 */
export async function down(knex: Knex): Promise<void> {
  // Drop triggers first
  await knex.raw('DROP TRIGGER IF EXISTS update_files_updated_at ON files');

  // Drop indexes
  await knex.schema.alterTable('files', (table) => {
    table.dropIndex([], 'idx_files_created_at');
    table.dropIndex([], 'idx_files_mime_type');
  });

  // Drop the table with cascading constraints
  await knex.schema.dropTableIfExists('files');
}