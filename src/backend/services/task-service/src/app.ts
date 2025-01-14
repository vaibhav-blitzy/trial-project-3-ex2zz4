/**
 * @fileoverview Main application entry point for the Task Service microservice.
 * Implements enterprise-grade features including comprehensive middleware stack,
 * security controls, monitoring, and graceful shutdown handling.
 * @version 1.0.0
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import compression from 'compression'; // v1.7.4
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v3.0.0
import actuator from 'express-actuator'; // v1.8.4
import { register } from 'prom-client'; // v14.2.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { databaseConfig } from './config/database.config';
import { TaskController } from './controllers/task.controller';
import errorHandler from '../../../shared/middleware/error-handler';
import requestLogger from '../../../shared/middleware/request-logger';
import Logger from '../../../shared/utils/logger.util';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { HttpStatusCodes } from '../../../shared/constants/status-codes';

// Initialize logger
const logger = Logger.getInstance('TaskService', {
  enableConsole: true,
  enableFile: true
});

// Environment variables
const PORT = process.env.PORT || 3003;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW) || 15 * 60;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 100;

/**
 * Initializes Express application with comprehensive middleware stack
 * and enterprise features
 */
function initializeApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-site' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' },
    xssFilter: true
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400
  }));

  // Request parsing and compression
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(compression());

  // Request ID generation
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // Request logging
  app.use(requestLogger);

  // Rate limiting
  const rateLimiter = new RateLimiterMemory({
    points: RATE_LIMIT_MAX,
    duration: RATE_LIMIT_WINDOW,
    blockDuration: 300
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      await rateLimiter.consume(req.ip);
      next();
    } catch {
      res.status(HttpStatusCodes.TOO_MANY_REQUESTS).json({
        code: ErrorCodes.EXTERNAL_SERVICE_TIMEOUT,
        message: 'Too many requests'
      });
    }
  });

  // Health check endpoints
  app.use(actuator({
    basePath: '/management',
    infoGitMode: 'full',
    customEndpoints: [{
      id: 'dependencies',
      controller: async (_req: Request, res: Response) => {
        res.json({ database: await databaseConfig.db.healthCheck() });
      }
    }]
  }));

  // Metrics endpoint
  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).end();
    }
  });

  // API routes
  app.use('/api/v1/tasks', TaskController.router);

  // Error handling
  app.use(errorHandler);

  return app;
}

/**
 * Starts the HTTP server with graceful shutdown handling
 */
async function startServer(): Promise<void> {
  try {
    // Initialize database connection
    await databaseConfig.initializeDatabase();

    // Initialize metrics
    register.setDefaultLabels({
      app: 'task-service',
      environment: NODE_ENV
    });

    const app = initializeApp();
    const server = app.listen(PORT, () => {
      logger.info(`Task service started on port ${PORT}`, {
        port: PORT,
        environment: NODE_ENV
      });
    });

    // Graceful shutdown handling
    const shutdown = async () => {
      logger.info('Shutting down task service...');

      server.close(async () => {
        try {
          await databaseConfig.db.disconnect();
          await register.clear();
          logger.info('Task service shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start task service', { error });
    process.exit(1);
  }
}

// Start server if running directly
if (require.main === module) {
  startServer();
}

export default initializeApp();