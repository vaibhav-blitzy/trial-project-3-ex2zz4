/**
 * Authentication Service Entry Point
 * Version: 1.0.0
 * Implements secure authentication flows with comprehensive security controls,
 * session management, rate limiting, and monitoring.
 */

import express, { Application } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^6.0.1
import cors from 'cors'; // ^2.8.5
import compression from 'compression'; // ^1.7.4
import cookieParser from 'cookie-parser'; // ^1.4.6
import { rateLimit } from 'express-rate-limit'; // ^6.7.0
import session from 'express-session'; // ^1.17.3
import RedisStore from 'connect-redis'; // ^7.0.0
import { register, collectDefaultMetrics } from 'prom-client'; // ^14.0.1

import { authConfig } from './config/auth.config';
import { jwtConfig } from './config/jwt.config';
import { AuthController } from './controllers/auth.controller';
import errorHandler from '../../shared/middleware/error-handler';
import requestLogger from '../../shared/middleware/request-logger';
import { RedisConnection } from '../../shared/utils/redis.util';
import { Logger } from '../../shared/utils/logger.util';
import { ErrorCodes } from '../../shared/constants/error-codes';

// Initialize logger
const logger = Logger.getInstance('AuthService', {
  enableConsole: true,
  enableFile: true,
  enableElk: true
});

/**
 * Bootstraps the authentication service with comprehensive security measures
 */
async function bootstrapApplication(): Promise<Application> {
  try {
    // Create Express application
    const app: Application = express();

    // Initialize Redis connection
    const redisConnection = RedisConnection.getInstance({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || '',
      db: 0,
      keyPrefix: 'auth:',
      cluster: false,
      maxRetriesPerRequest: 3,
      piiEnabled: false,
      compressionThreshold: 1024
    });
    await redisConnection.connect();

    // Configure security middleware
    configureSecurityMiddleware(app);

    // Enable request compression
    app.use(compression());

    // Parse cookies securely
    app.use(cookieParser(process.env.COOKIE_SECRET));

    // Configure session management with Redis
    const sessionStore = new RedisStore({
      client: redisConnection.getClient(),
      prefix: 'session:',
      ttl: authConfig.sessionConfig.sessionDuration
    });

    app.use(session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET!,
      name: 'sid',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: authConfig.sessionConfig.sessionDuration * 1000
      }
    }));

    // Configure rate limiting
    const limiter = rateLimit({
      windowMs: authConfig.rateLimiting.apiRequests.windowMs,
      max: authConfig.rateLimiting.apiRequests.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === '/health'
    });
    app.use(limiter);

    // Initialize Prometheus metrics
    collectDefaultMetrics({ prefix: 'auth_service_' });

    // Setup request logging with PII masking
    app.use(requestLogger);

    // Parse JSON payloads
    app.use(express.json({ limit: '10kb' }));

    // Initialize routes
    const authController = new AuthController();
    app.use('/api/v1/auth', authController.router);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy' });
    });

    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      } catch (error) {
        res.status(500).end();
      }
    });

    // Global error handling
    app.use(errorHandler);

    return app;
  } catch (error) {
    logger.error('Failed to bootstrap application', {
      error,
      code: ErrorCodes.SYSTEM_ERROR
    });
    throw error;
  }
}

/**
 * Configures comprehensive security middleware stack
 */
function configureSecurityMiddleware(app: Application): void {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'"],
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
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  }));

  // CORS configuration
  const corsOptions = {
    origin: process.env.CORS_WHITELIST?.split(',') || [],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
  };
  app.use(cors(corsOptions));
}

/**
 * Starts the HTTP server with proper error handling
 */
async function startServer(app: Application): Promise<void> {
  try {
    const port = process.env.PORT || 3001;
    
    app.listen(port, () => {
      logger.info(`Authentication service started on port ${port}`, {
        port,
        environment: process.env.NODE_ENV
      });
    });

    // Graceful shutdown handler
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error,
      code: ErrorCodes.SYSTEM_ERROR
    });
    throw error;
  }
}

// Bootstrap and start application
const app = bootstrapApplication()
  .then(startServer)
  .catch((error) => {
    logger.error('Fatal error during startup', {
      error,
      code: ErrorCodes.SYSTEM_ERROR
    });
    process.exit(1);
  });

export default app;