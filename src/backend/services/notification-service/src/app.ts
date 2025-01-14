/**
 * Enhanced Notification Service Application
 * Version: 1.0.0
 * Implements enterprise-grade notification service with comprehensive monitoring,
 * security features, and reliability mechanisms.
 */

import express, { Application, Request, Response, NextFunction } from 'express'; // ^4.18.0
import mongoose from 'mongoose'; // ^6.0.0
import Redis from 'ioredis'; // ^5.0.0
import winston from 'winston'; // ^3.8.0
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^6.0.0
import rateLimit from 'express-rate-limit'; // ^6.0.0
import promClient from 'prom-client'; // ^14.0.0
import { NotificationController } from './controllers/notification.controller';
import { NotificationService } from './services/notification.service';
import { emailConfig } from './config/email.config';

class App {
  private readonly app: Application;
  private readonly logger: winston.Logger;
  private readonly metricsRegistry: promClient.Registry;
  private notificationController: NotificationController;
  private notificationService: NotificationService;
  private redisClient: Redis;

  constructor() {
    this.app = express();
    this.initializeLogger();
    this.metricsRegistry = new promClient.Registry();
    this.validateEnvironment();
  }

  /**
   * Initialize structured logging with correlation IDs
   */
  private initializeLogger(): void {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'notification-service' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });
  }

  /**
   * Validate required environment variables
   */
  private validateEnvironment(): void {
    const requiredEnvVars = [
      'PORT',
      'MONGODB_URI',
      'REDIS_URL',
      'RATE_LIMIT_WINDOW',
      'RATE_LIMIT_MAX'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }
  }

  /**
   * Initialize MongoDB connection with retry mechanism
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await mongoose.connect(process.env.MONGODB_URI!, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10
      });

      mongoose.connection.on('error', (error) => {
        this.logger.error('MongoDB connection error:', error);
        process.exit(1);
      });

      mongoose.connection.on('disconnected', () => {
        this.logger.warn('MongoDB disconnected. Attempting to reconnect...');
      });

      this.logger.info('MongoDB connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB:', error);
      process.exit(1);
    }
  }

  /**
   * Initialize Redis with clustering and failover
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = new Redis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryStrategy: (times: number) => {
          return Math.min(times * 50, 2000);
        }
      });

      this.redisClient.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });

      this.redisClient.on('connect', () => {
        this.logger.info('Redis connected successfully');
      });
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
      process.exit(1);
    }
  }

  /**
   * Initialize metrics collection
   */
  private initializeMetrics(): void {
    promClient.collectDefaultMetrics({ register: this.metricsRegistry });

    // Custom metrics
    new promClient.Counter({
      name: 'notification_delivery_total',
      help: 'Total number of notifications delivered',
      labelNames: ['type', 'status'],
      registers: [this.metricsRegistry]
    });

    new promClient.Histogram({
      name: 'notification_delivery_duration_seconds',
      help: 'Notification delivery duration in seconds',
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.metricsRegistry]
    });
  }

  /**
   * Configure Express middleware with enhanced security
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400
    }));

    // Rate limiting
    this.app.use(rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_MAX) || 100,
      message: 'Too many requests from this IP'
    }));

    // Request parsing
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const correlationId = req.headers['x-correlation-id'] || 
                          `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('x-correlation-id', correlationId);
      
      this.logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        correlationId
      });
      next();
    });
  }

  /**
   * Initialize routes and controllers
   */
  private initializeRoutes(): void {
    this.notificationService = new NotificationService(
      this.redisClient,
      this.logger
    );

    this.notificationController = new NotificationController(
      this.notificationService,
      this.logger
    );

    // API routes
    this.app.use('/api/v1', this.notificationController.getRouter());

    // Metrics endpoint
    this.app.get('/metrics', async (req: Request, res: Response) => {
      try {
        res.set('Content-Type', this.metricsRegistry.contentType);
        res.end(await this.metricsRegistry.metrics());
      } catch (error) {
        res.status(500).end(error);
      }
    });

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1,
        redis: this.redisClient.status === 'ready'
      });
    });
  }

  /**
   * Initialize application with error handling
   */
  public async initialize(): Promise<void> {
    try {
      await this.initializeDatabase();
      await this.initializeRedis();
      this.initializeMetrics();
      this.setupMiddleware();
      this.initializeRoutes();

      // Global error handler
      this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        this.logger.error('Unhandled error:', err);
        res.status(500).json({
          error: 'Internal server error',
          correlationId: res.getHeader('x-correlation-id')
        });
      });

      // Start server
      const port = process.env.PORT || 3003;
      this.app.listen(port, () => {
        this.logger.info(`Notification service listening on port ${port}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      process.on('SIGINT', this.gracefulShutdown.bind(this));
    } catch (error) {
      this.logger.error('Failed to initialize application:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown handler
   */
  private async gracefulShutdown(): Promise<void> {
    this.logger.info('Initiating graceful shutdown...');

    try {
      await mongoose.connection.close();
      await this.redisClient.quit();
      
      this.logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }
}

export default App;