/**
 * @fileoverview Core database utility providing centralized database connection management,
 * pooling, and configuration for all microservices.
 * @version 1.0.0
 */

import knex, { Knex } from 'knex'; // v2.4.x
import { Pool } from 'pg'; // v8.x
import { EventEmitter } from 'events';
import Logger from './logger.util';
import { ErrorCodes } from '../constants/error-codes';

// Constants for database configuration
const DEFAULT_POOL_MIN = 2;
const DEFAULT_POOL_MAX = 10;
const CONNECTION_RETRY_ATTEMPTS = 5;
const CONNECTION_RETRY_DELAY = 5000;
const HEALTH_CHECK_INTERVAL = 30000;
const MAX_QUERY_TIMEOUT = 30000;
const SSL_REJECT_UNAUTHORIZED = true;

/**
 * Comprehensive interface for database configuration
 */
export interface IDatabaseConfig {
  client: string;
  connection: IConnectionConfig;
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis?: number;
    acquireTimeoutMillis?: number;
  };
  migrations: {
    directory: string;
    tableName: string;
  };
  ssl: {
    rejectUnauthorized: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
  monitoring: {
    enableMetrics: boolean;
    healthCheckInterval: number;
  };
}

/**
 * Detailed connection configuration interface
 */
export interface IConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  poolConfig?: {
    statement_timeout?: number;
    idle_in_transaction_session_timeout?: number;
  };
  replication?: {
    master: string;
    slaves: string[];
  };
}

/**
 * Interface for health check results
 */
export interface IHealthCheckResult {
  isHealthy: boolean;
  responseTime: number;
  poolSize: number;
  activeConnections: number;
  replicationLag: {
    master: number;
    slaves: { [key: string]: number };
  };
}

/**
 * Singleton class managing database connections with advanced monitoring and health checks
 */
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private knexInstance: Knex | null = null;
  private readonly config: IDatabaseConfig;
  private readonly logger: Logger;
  private readonly eventEmitter: EventEmitter;
  private lastHealthCheck: IHealthCheckResult | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor(config: IDatabaseConfig) {
    this.config = this.validateConfig(config);
    this.logger = Logger.getInstance('DatabaseConnection', {
      enableConsole: true,
      enableFile: true
    });
    this.eventEmitter = new EventEmitter();
    this.setupEventListeners();
  }

  /**
   * Get singleton instance of database connection
   */
  public static getInstance(config: IDatabaseConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  /**
   * Validates and sanitizes database configuration
   */
  private validateConfig(config: IDatabaseConfig): IDatabaseConfig {
    if (!config.client || !config.connection) {
      throw new Error('Invalid database configuration');
    }

    return {
      ...config,
      pool: {
        min: config.pool?.min || DEFAULT_POOL_MIN,
        max: config.pool?.max || DEFAULT_POOL_MAX,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 60000,
      },
      ssl: {
        rejectUnauthorized: SSL_REJECT_UNAUTHORIZED,
        ...config.ssl,
      },
      monitoring: {
        enableMetrics: true,
        healthCheckInterval: HEALTH_CHECK_INTERVAL,
        ...config.monitoring,
      },
    };
  }

  /**
   * Sets up database event listeners
   */
  private setupEventListeners(): void {
    this.eventEmitter.on('connection-error', (error: Error) => {
      this.logger.error('Database connection error', {
        error,
        code: ErrorCodes.DATABASE_CONNECTION_ERROR,
      });
    });

    this.eventEmitter.on('pool-overflow', () => {
      this.logger.warn('Connection pool reached maximum capacity');
    });
  }

  /**
   * Establishes database connection with retry mechanism
   */
  public async connect(): Promise<void> {
    let retryCount = 0;

    while (retryCount < CONNECTION_RETRY_ATTEMPTS) {
      try {
        this.knexInstance = knex({
          client: this.config.client,
          connection: {
            ...this.config.connection,
            ssl: this.config.ssl,
          },
          pool: this.config.pool,
        });

        await this.knexInstance.raw('SELECT 1');
        this.logger.info('Database connection established successfully');
        
        this.startHealthChecks();
        return;
      } catch (error) {
        retryCount++;
        this.logger.error(`Connection attempt ${retryCount} failed`, { error });
        
        if (retryCount === CONNECTION_RETRY_ATTEMPTS) {
          throw new Error('Failed to establish database connection after maximum retries');
        }
        
        await new Promise(resolve => setTimeout(resolve, CONNECTION_RETRY_DELAY));
      }
    }
  }

  /**
   * Starts periodic health checks
   */
  private startHealthChecks(): void {
    if (this.config.monitoring.enableMetrics) {
      this.healthCheckInterval = setInterval(
        async () => {
          this.lastHealthCheck = await this.healthCheck();
        },
        this.config.monitoring.healthCheckInterval
      );
    }
  }

  /**
   * Performs comprehensive database health check
   */
  public async healthCheck(): Promise<IHealthCheckResult> {
    if (!this.knexInstance) {
      throw new Error('Database connection not initialized');
    }

    const startTime = Date.now();
    const pool = this.knexInstance.client.pool;

    try {
      // Check basic connectivity
      await this.knexInstance.raw('SELECT 1');
      
      // Get replication status
      const replicationStatus = await this.checkReplication();

      const healthCheck: IHealthCheckResult = {
        isHealthy: true,
        responseTime: Date.now() - startTime,
        poolSize: pool.numUsed() + pool.numFree(),
        activeConnections: pool.numUsed(),
        replicationLag: replicationStatus,
      };

      this.logger.info('Health check completed', { healthCheck });
      return healthCheck;
    } catch (error) {
      this.logger.error('Health check failed', { error });
      throw error;
    }
  }

  /**
   * Checks replication status and lag
   */
  private async checkReplication(): Promise<{ master: number; slaves: { [key: string]: number } }> {
    if (!this.knexInstance) {
      throw new Error('Database connection not initialized');
    }

    const replicationLag = {
      master: 0,
      slaves: {},
    };

    if (this.config.connection.replication) {
      // Check master status
      const masterResult = await this.knexInstance.raw('SELECT pg_current_wal_lsn() as lsn');
      const masterLSN = masterResult.rows[0].lsn;

      // Check each slave's replication lag
      for (const slave of this.config.connection.replication.slaves) {
        const slaveResult = await this.knexInstance.raw('SELECT pg_last_wal_receive_lsn() as lsn');
        const slaveLSN = slaveResult.rows[0].lsn;
        replicationLag.slaves[slave] = this.calculateReplicationLag(masterLSN, slaveLSN);
      }
    }

    return replicationLag;
  }

  /**
   * Calculates replication lag between master and slave
   */
  private calculateReplicationLag(masterLSN: string, slaveLSN: string): number {
    // Convert LSN to bytes and calculate difference
    const masterBytes = parseInt(masterLSN.split('/')[0], 16);
    const slaveBytes = parseInt(slaveLSN.split('/')[0], 16);
    return masterBytes - slaveBytes;
  }

  /**
   * Gracefully closes database connection
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      if (this.knexInstance) {
        await this.knexInstance.destroy();
        this.knexInstance = null;
        this.logger.info('Database connection closed successfully');
      }
    } catch (error) {
      this.logger.error('Error closing database connection', { error });
      throw error;
    }
  }

  /**
   * Gets the Knex instance for query execution
   */
  public getKnex(): Knex {
    if (!this.knexInstance) {
      throw new Error('Database connection not initialized');
    }
    return this.knexInstance;
  }
}

export default DatabaseConnection;