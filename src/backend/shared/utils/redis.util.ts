/**
 * @fileoverview Core Redis utility providing centralized Redis connection management
 * and caching strategies for microservices with enhanced error handling and PII controls.
 * @version 1.0.0
 */

import Redis, { Cluster, ClusterNode, RedisOptions } from 'ioredis'; // v5.3.x
import { Logger } from './logger.util';
import { ErrorCodes } from '../constants/error-codes';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';

// Promisified compression utilities
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Redis configuration interface
 */
export interface IRedisConfig {
  host: string;
  port: number;
  password: string;
  db: number;
  keyPrefix: string;
  cluster: boolean;
  nodes?: Array<{ host: string; port: number }>;
  maxRetriesPerRequest: number;
  piiEnabled: boolean;
  compressionThreshold: number;
}

/**
 * Cache operation options interface
 */
export interface ICacheOptions {
  ttl?: number;
  prefix?: string;
  compress?: boolean;
  isPII?: boolean;
}

/**
 * Constants for Redis operations
 */
const DEFAULT_TTL = 3600; // 1 hour
const CONNECTION_RETRY_ATTEMPTS = 5;
const CONNECTION_RETRY_DELAY = 5000; // 5 seconds
const DEFAULT_KEY_PREFIX = 'tms:';
const CLUSTER_RETRY_ATTEMPTS = 3;
const COMPRESSION_THRESHOLD = 1024; // 1KB
const MAX_PII_TTL = 1800; // 30 minutes for PII data

/**
 * Singleton class managing Redis connections and caching operations
 */
export class RedisConnection {
  private static instance: RedisConnection;
  private client: Redis | Cluster;
  private readonly logger: Logger;
  private readonly config: IRedisConfig;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(config: IRedisConfig) {
    this.config = this.validateConfig(config);
    this.logger = Logger.getInstance('RedisService', {
      enableConsole: true,
      enableFile: true
    });
  }

  /**
   * Get singleton instance of RedisConnection
   */
  public static getInstance(config: IRedisConfig): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection(config);
    }
    return RedisConnection.instance;
  }

  /**
   * Validate Redis configuration
   */
  private validateConfig(config: IRedisConfig): IRedisConfig {
    if (!config.host && !config.nodes) {
      throw new Error('Redis host or nodes configuration is required');
    }

    return {
      ...config,
      keyPrefix: config.keyPrefix || DEFAULT_KEY_PREFIX,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      compressionThreshold: config.compressionThreshold || COMPRESSION_THRESHOLD
    };
  }

  /**
   * Initialize Redis client with retry mechanism
   */
  public async connect(): Promise<void> {
    try {
      const options: RedisOptions = {
        password: this.config.password,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        retryStrategy: (times: number) => {
          if (times > CONNECTION_RETRY_ATTEMPTS) {
            return null;
          }
          return Math.min(times * CONNECTION_RETRY_DELAY, 20000);
        }
      };

      if (this.config.cluster && this.config.nodes) {
        this.client = new Redis.Cluster(this.config.nodes, {
          clusterRetryStrategy: (times: number) => {
            if (times > CLUSTER_RETRY_ATTEMPTS) {
              return null;
            }
            return Math.min(times * 100, 3000);
          },
          ...options
        });
      } else {
        this.client = new Redis({
          host: this.config.host,
          port: this.config.port,
          ...options
        });
      }

      this.setupEventListeners();
      await this.verifyConnection();
      
      this.logger.info('Redis connection established successfully');
      this.isConnected = true;
    } catch (error) {
      this.logger.error('Failed to establish Redis connection', {
        error,
        code: ErrorCodes.CACHE_SERVICE_ERROR
      });
      throw error;
    }
  }

  /**
   * Set up Redis client event listeners
   */
  private setupEventListeners(): void {
    this.client.on('error', (error) => {
      this.isConnected = false;
      this.logger.error('Redis client error', { error });
    });

    this.client.on('reconnecting', () => {
      this.logger.info('Attempting to reconnect to Redis');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.logger.info('Redis client ready');
    });
  }

  /**
   * Verify Redis connection
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.client.ping();
    } catch (error) {
      throw new Error('Redis connection verification failed');
    }
  }

  /**
   * Set value in Redis with optional compression and PII handling
   */
  public async set(
    key: string,
    value: any,
    options: ICacheOptions = {}
  ): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client is not connected');
      }

      const finalKey = `${options.prefix || ''}${key}`;
      let finalValue = JSON.stringify(value);
      let ttl = options.ttl || DEFAULT_TTL;

      // Handle PII data
      if (options.isPII) {
        if (!this.config.piiEnabled) {
          throw new Error('PII storage is not enabled');
        }
        ttl = Math.min(ttl, MAX_PII_TTL);
      }

      // Apply compression if needed
      if (options.compress && finalValue.length > this.config.compressionThreshold) {
        const compressed = await gzipAsync(Buffer.from(finalValue));
        finalValue = compressed.toString('base64');
      }

      await this.client.set(finalKey, finalValue, 'EX', ttl);
      
      this.logger.info('Successfully cached data', {
        key: finalKey,
        compressed: options.compress,
        ttl
      });
    } catch (error) {
      this.logger.error('Failed to set cache value', {
        error,
        key,
        code: ErrorCodes.CACHE_SERVICE_ERROR
      });
      throw error;
    }
  }

  /**
   * Get value from Redis with automatic decompression
   */
  public async get<T>(key: string, options: ICacheOptions = {}): Promise<T | null> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client is not connected');
      }

      const finalKey = `${options.prefix || ''}${key}`;
      const value = await this.client.get(finalKey);

      if (!value) {
        return null;
      }

      // Handle compressed data
      if (options.compress) {
        try {
          const decompressed = await gunzipAsync(Buffer.from(value, 'base64'));
          return JSON.parse(decompressed.toString());
        } catch {
          // If decompression fails, try parsing as regular JSON
          return JSON.parse(value);
        }
      }

      return JSON.parse(value);
    } catch (error) {
      this.logger.error('Failed to get cache value', {
        error,
        key,
        code: ErrorCodes.CACHE_SERVICE_ERROR
      });
      throw error;
    }
  }

  /**
   * Delete value from Redis
   */
  public async delete(key: string, options: ICacheOptions = {}): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client is not connected');
      }

      const finalKey = `${options.prefix || ''}${key}`;
      await this.client.del(finalKey);
      
      this.logger.info('Successfully deleted cached data', { key: finalKey });
    } catch (error) {
      this.logger.error('Failed to delete cache value', {
        error,
        key,
        code: ErrorCodes.CACHE_SERVICE_ERROR
      });
      throw error;
    }
  }

  /**
   * Perform health check on Redis connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      await this.client.ping();
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed', {
        error,
        code: ErrorCodes.CACHE_SERVICE_ERROR
      });
      return false;
    }
  }

  /**
   * Gracefully close Redis connection
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        this.logger.info('Redis connection closed successfully');
      }
    } catch (error) {
      this.logger.error('Error closing Redis connection', { error });
      throw error;
    }
  }
}

export default RedisConnection;