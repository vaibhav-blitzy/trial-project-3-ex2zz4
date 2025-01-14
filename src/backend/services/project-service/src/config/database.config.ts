/**
 * @fileoverview Enhanced database configuration for the project service with support for
 * secure connections, advanced pooling, monitoring, and replication.
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.x
import { DatabaseConnection, IDatabaseConfig, IHealthCheck, IReplicationConfig } from '../../../shared/utils/database.util';

// Load environment variables
config();

/**
 * Enhanced database configuration with monitoring and replication support
 */
export const databaseConfig: IDatabaseConfig = {
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      ca: process.env.DB_SSL_CA,
      cert: process.env.DB_SSL_CERT,
      key: process.env.DB_SSL_KEY
    }
  },
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 60000,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    createRetryIntervalMillis: 200,
    propagateCreateError: false
  },
  migrations: {
    directory: '../db/migrations',
    tableName: 'knex_migrations',
    stub: '../db/migration.stub',
    extension: 'ts'
  },
  replication: {
    read: {
      host: process.env.DB_READ_HOST,
      maxLagSeconds: 30
    }
  },
  monitoring: {
    statementTimeout: 30000,
    healthCheck: {
      enabled: true,
      intervalMs: 30000
    },
    metrics: {
      enabled: true,
      collectInterval: 10000
    }
  }
};

/**
 * Initialize database connection with enhanced monitoring and health checks
 */
async function initializeDatabase(): Promise<void> {
  try {
    const db = DatabaseConnection.getInstance(databaseConfig);
    await db.connect();
  } catch (error) {
    throw new Error(`Failed to initialize database connection: ${error.message}`);
  }
}

// Create and configure database instance
const db = DatabaseConnection.getInstance(databaseConfig);

// Export database configuration and connection instance
export {
  db,
  initializeDatabase
};

/**
 * Health check interface implementation
 */
export interface DatabaseHealth extends IHealthCheck {
  replicationLag: number;
  connectionPoolStatus: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  };
  lastError?: {
    message: string;
    timestamp: Date;
  };
}

/**
 * Replication configuration interface implementation
 */
export interface ReplicationConfig extends IReplicationConfig {
  readHost: string;
  writeHost: string;
  maxLagThreshold: number;
}

/**
 * Database metrics interface
 */
export interface DatabaseMetrics {
  queryCount: number;
  averageQueryTime: number;
  errorRate: number;
  connectionUtilization: number;
  replicationLag: number;
  slowQueries: {
    count: number;
    threshold: number;
  };
}