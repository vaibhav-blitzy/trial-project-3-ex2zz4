/**
 * @fileoverview Enhanced logging utility providing structured logging capabilities
 * with security features and ELK stack integration.
 * @version 1.0.0
 */

import winston from 'winston'; // v3.8.2
import DailyRotateFile from 'winston-daily-rotate-file'; // v4.7.1
import { ErrorCodes } from '../constants/error-codes';

/**
 * Enhanced log levels including security-specific levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
  SECURITY = 'security',
  AUDIT = 'audit'
}

/**
 * Security event types for specialized logging
 */
export enum SecurityEventType {
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILURE = 'auth_failure',
  ACCESS_DENIED = 'access_denied',
  DATA_ACCESS = 'data_access',
  CONFIGURATION_CHANGE = 'config_change'
}

/**
 * Security severity levels
 */
export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Constants for logger configuration
 */
const DEFAULT_LOG_LEVEL = LogLevel.INFO;
const LOG_FILE_MAX_SIZE = '10m';
const LOG_FILE_MAX_FILES = '7d';
const SECURITY_LOG_RETENTION = '90d';
const MAX_LOG_BATCH_SIZE = 100;
const LOG_FLUSH_INTERVAL = 1000;

/**
 * PII patterns for masking sensitive data
 */
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g
};

/**
 * Interface for structured log metadata
 */
export interface LogMetadata {
  timestamp?: Date;
  level?: LogLevel;
  service?: string;
  correlationId?: string;
  requestId?: string;
  userId?: string;
  error?: Error;
  traceId?: string;
  spanId?: string;
  environment?: string;
  tags?: string[];
  sensitive?: boolean;
}

/**
 * Interface for security-specific log metadata
 */
export interface SecurityLogMetadata extends LogMetadata {
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  outcome?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Logger configuration interface
 */
interface LoggerConfig {
  level?: LogLevel;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableElk?: boolean;
  elkConfig?: {
    host: string;
    port: number;
    index: string;
  };
}

/**
 * Enhanced logger class with security features and structured logging
 */
export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;
  private readonly serviceName: string;
  private readonly config: LoggerConfig;

  private constructor(serviceName: string, config: LoggerConfig) {
    this.serviceName = serviceName;
    this.config = config;
    this.initializeLogger();
  }

  /**
   * Get singleton instance of logger
   */
  public static getInstance(serviceName: string, config: LoggerConfig): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(serviceName, config);
    }
    return Logger.instance;
  }

  /**
   * Initialize Winston logger with configured transports
   */
  private initializeLogger(): void {
    const transports: winston.transport[] = [];

    // Console transport with color coding
    if (this.config.enableConsole) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(this.createLogFormatter())
        )
      }));
    }

    // File transport with rotation
    if (this.config.enableFile) {
      transports.push(new DailyRotateFile({
        filename: `logs/${this.serviceName}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: LOG_FILE_MAX_SIZE,
        maxFiles: LOG_FILE_MAX_FILES,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }));

      // Separate security logs
      transports.push(new DailyRotateFile({
        filename: `logs/security/${this.serviceName}-security-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxFiles: SECURITY_LOG_RETENTION,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }));
    }

    this.logger = winston.createLogger({
      level: this.config.level || DEFAULT_LOG_LEVEL,
      transports,
      exitOnError: false
    });
  }

  /**
   * Create custom log formatter with PII masking
   */
  private createLogFormatter() {
    return (info: winston.LogEntry): string => {
      const masked = this.maskSensitiveData(info.message);
      return `${info.timestamp} [${info.level}] [${this.serviceName}] ${masked}`;
    };
  }

  /**
   * Mask sensitive data in log messages
   */
  private maskSensitiveData(message: string): string {
    if (typeof message !== 'string') return message;

    let maskedMessage = message;
    Object.entries(PII_PATTERNS).forEach(([_, pattern]) => {
      maskedMessage = maskedMessage.replace(pattern, '***REDACTED***');
    });
    return maskedMessage;
  }

  /**
   * Enhanced metadata preparation
   */
  private prepareMetadata(metadata: LogMetadata): LogMetadata {
    return {
      timestamp: new Date(),
      service: this.serviceName,
      environment: process.env.NODE_ENV,
      ...metadata
    };
  }

  /**
   * Log information level message
   */
  public async info(message: string, metadata?: LogMetadata): Promise<void> {
    const enhancedMetadata = this.prepareMetadata(metadata || {});
    this.logger.info(message, enhancedMetadata);
  }

  /**
   * Log error level message
   */
  public async error(message: string, metadata?: LogMetadata): Promise<void> {
    const enhancedMetadata = this.prepareMetadata(metadata || {});
    if (metadata?.error) {
      enhancedMetadata.error = {
        message: metadata.error.message,
        stack: metadata.error.stack,
        code: (metadata.error as any).code || ErrorCodes.SYSTEM_ERROR
      };
    }
    this.logger.error(message, enhancedMetadata);
  }

  /**
   * Log security events
   */
  public async security(message: string, metadata: SecurityLogMetadata): Promise<void> {
    const enhancedMetadata = this.prepareMetadata(metadata);
    this.logger.log(LogLevel.SECURITY, message, enhancedMetadata);
  }

  /**
   * Log audit events
   */
  public async audit(message: string, metadata: LogMetadata): Promise<void> {
    const enhancedMetadata = this.prepareMetadata(metadata);
    this.logger.log(LogLevel.AUDIT, message, enhancedMetadata);
  }

  /**
   * Flush logs and cleanup
   */
  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }
}

export default Logger;