/**
 * Project Service Entry Point
 * Version: 1.0.0
 * Implements a secure, scalable Express server with comprehensive middleware,
 * database connectivity, and robust error handling for the project management service.
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // ^4.18.0
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import morgan from 'morgan'; // ^1.10.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { expressjwt as jwt } from 'express-jwt'; // ^8.4.1
import Logger from '../../../shared/utils/logger.util';
import { errorHandler } from '../../../shared/middleware/error-handler';
import { ProjectController } from './controllers/project.controller';
import { db } from './config/database.config';
import { HttpStatusCodes } from '../../../shared/constants/status-codes';

// Environment constants
const PORT = process.env.PORT || 3002;
const API_VERSION = 'v1';
const BASE_PATH = `/api/${API_VERSION}/projects`;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100;
const CORS_WHITELIST = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL
].filter(Boolean);

// Initialize logger
const logger = Logger.getInstance('ProjectService', {
  enableConsole: true,
  enableFile: true
});

/**
 * Initialize Express application with comprehensive middleware chain
 */
function initializeApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
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
    crossOriginResourcePolicy: { policy: "same-site" },
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
    origin: (origin, callback) => {
      if (!origin || CORS_WHITELIST.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
    credentials: true,
    maxAge: 600 // 10 minutes
  }));

  // Rate limiting
  app.use(rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  }));

  // General middleware
  app.use(compression());
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // JWT Authentication
  app.use(jwt({
    secret: process.env.JWT_SECRET!,
    algorithms: ['RS256'],
    requestProperty: 'user',
    getToken: (req) => {
      if (req.headers.authorization?.split(' ')[0] === 'Bearer') {
        return req.headers.authorization.split(' ')[1];
      }
      return null;
    }
  }).unless({ path: ['/health', '/metrics'] }));

  // API routes
  const projectController = new ProjectController();
  app.use(BASE_PATH, projectController.router);

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(HttpStatusCodes.OK).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: API_VERSION
    });
  });

  // Error handling
  app.use((req: Request, res: Response) => {
    res.status(HttpStatusCodes.NOT_FOUND).json({
      status: 'error',
      message: 'Resource not found'
    });
  });
  app.use(errorHandler);

  return app;
}

/**
 * Start server with database connection and error handling
 */
async function startServer(app: Express): Promise<void> {
  try {
    // Initialize database connection
    await db.connect();
    logger.info('Database connection established');

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Project service listening on port ${PORT}`);
    });

    // Graceful shutdown handling
    setupGracefulShutdown(server, db);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Configure graceful shutdown handlers
 */
function setupGracefulShutdown(server: any, database: any): void {
  const shutdown = async () => {
    logger.info('Received shutdown signal');

    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        await database.disconnect();
        logger.info('Database connections closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Initialize and start the application
const app = initializeApp();
startServer(app).catch(error => {
  logger.error('Startup error:', error);
  process.exit(1);
});

export default app;