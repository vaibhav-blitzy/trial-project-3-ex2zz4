/**
 * @fileoverview Database configuration for the task service with advanced connection pooling,
 * replication support, and monitoring capabilities.
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.x
import { DatabaseConnection, IDatabaseConfig, IHealthCheckResult } from '../../../shared/utils/database.util';

// Load environment variables
config();

/**
 * Comprehensive database configuration object implementing enterprise-grade features
 * including connection pooling, replication, monitoring, and security settings.
 */
export const databaseConfig: IDatabaseConfig = {
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: true,
      ca: process.env.DB_SSL_CA,
      cert: process.env.DB_SSL_CERT,
      key: process.env.DB_SSL_KEY
    } : false,
    statement_timeout: 30000, // 30 seconds
    idle_in_transaction_session_timeout: 60000, // 1 minute
    application_name: 'task-service'
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: 60000, // 1 minute
    acquireTimeoutMillis: 30000, // 30 seconds
    createTimeoutMillis: 30000, // 30 seconds
    destroyTimeoutMillis: 5000, // 5 seconds
    createRetryIntervalMillis: 200,
    propagateCreateError: true
  },
  migrations: {
    directory: '../db/migrations',
    tableName: 'knex_migrations',
    stub: '../db/migration.stub',
    loadExtensions: ['.ts']
  },
  replication: {
    enabled: process.env.DB_REPLICATION_ENABLED === 'true',
    slaves: process.env.DB_REPLICA_HOSTS?.split(',') || [],
    selector: 'round-robin'
  },
  monitoring: {
    enableMetrics: true,
    slowQueryThreshold: 1000, // 1 second
    logStatements: process.env.NODE_ENV === 'development',
    poolMetrics: true,
    healthCheckInterval: 30000 // 30 seconds
  }
};

/**
 * Database connection instance with health monitoring and connection management
 */
export const db = DatabaseConnection.getInstance(databaseConfig);

/**
 * Initializes database connection with enhanced configuration and monitoring
 * @returns Promise<void> Resolves when database connection is established
 * @throws Error if connection cannot be established after maximum retries
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await db.connect();

    // Perform initial health check
    const healthCheck: IHealthCheckResult = await db.healthCheck();

    if (!healthCheck.isHealthy) {
      throw new Error('Initial database health check failed');
    }

    // Log successful initialization
    console.info('Database connection initialized successfully', {
      poolSize: healthCheck.poolSize,
      replicationStatus: healthCheck.replicationLag,
      responseTime: healthCheck.responseTime
    });
  } catch (error) {
    console.error('Failed to initialize database connection', { error });
    throw error;
  }
}

export default {
  databaseConfig,
  db,
  initializeDatabase
};