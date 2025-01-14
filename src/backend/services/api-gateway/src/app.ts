/**
 * @fileoverview Main application entry point for the API Gateway service
 * Configures Express server with comprehensive security, monitoring, and error handling
 * @version 1.0.0
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // v4.18.2
import helmet from 'helmet'; // v6.0.0
import compression from 'compression'; // v1.7.4
import { validationResult } from 'express-validator'; // v7.0.0
import { trace, context, SpanStatusCode } from '@opentelemetry/api'; // v1.0.0
import { corsConfig } from './config/cors.config';
import { createRateLimiter } from './config/rate-limit.config';
import { Logger, LogLevel, SecurityEventType, SecuritySeverity } from '../../shared/utils/logger.util';
import { ErrorCodes, getErrorMessage } from '../../shared/constants/error-codes';

// Constants
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const REQUEST_TIMEOUT = process.env.REQUEST_TIMEOUT || 30000;
const MAX_REQUEST_SIZE = process.env.MAX_REQUEST_SIZE || '10mb';

// Initialize Express app
const app: Express = express();

// Initialize logger
const logger = Logger.getInstance('APIGateway', {
  enableConsole: true,
  enableFile: true,
  level: LogLevel.INFO
});

/**
 * Configure comprehensive middleware stack
 * @param app Express application instance
 */
async function configureMiddleware(app: Express): Promise<void> {
  // Enhanced security headers with CSP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
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
  app.use(cors(corsConfig));

  // Request parsing and compression
  app.use(express.json({ limit: MAX_REQUEST_SIZE }));
  app.use(express.urlencoded({ extended: true, limit: MAX_REQUEST_SIZE }));
  app.use(compression());

  // Request timeout
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setTimeout(Number(REQUEST_TIMEOUT), () => {
      const error = new Error('Request timeout');
      error['code'] = ErrorCodes.EXTERNAL_SERVICE_TIMEOUT;
      next(error);
    });
    next();
  });

  // Request tracking and correlation
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    const traceId = trace.getSpanContext(context.active())?.traceId;
    
    res.setHeader('X-Request-ID', requestId);
    req['correlationId'] = requestId;
    req['traceId'] = traceId;

    logger.info('Incoming request', {
      requestId,
      traceId,
      method: req.method,
      path: req.path,
      ip: req.ip
    });

    next();
  });

  // Rate limiting
  const rateLimiter = await createRateLimiter({
    points: 100,
    duration: 60,
    blockDuration: 300
  }, 'api', req.ip);

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      await rateLimiter.consume(req.ip);
      next();
    } catch (error) {
      logger.security('Rate limit exceeded', {
        eventType: SecurityEventType.ACCESS_DENIED,
        severity: SecuritySeverity.MEDIUM,
        ipAddress: req.ip,
        requestId: req['correlationId']
      });
      res.status(429).json({
        error: 'Too many requests',
        code: ErrorCodes.RESOURCE_ACCESS_DENIED
      });
    }
  });
}

/**
 * Configure health check endpoints
 * @param app Express application instance
 */
function configureHealthChecks(app: Express): void {
  // Liveness probe
  app.get('/health/live', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // Readiness probe with dependency checks
  app.get('/health/ready', async (req: Request, res: Response) => {
    try {
      // Add dependency health checks here
      res.status(200).json({ status: 'ok' });
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(503).json({ status: 'error' });
    }
  });

  // Metrics endpoint
  app.get('/metrics', (req: Request, res: Response) => {
    // Implement metrics collection
    res.status(200).json({ metrics: 'Implementation pending' });
  });
}

/**
 * Global error handler
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const errorCode = err.code || ErrorCodes.SYSTEM_ERROR;
  const statusCode = err.status || 500;

  logger.error('Request error', {
    error: err,
    code: errorCode,
    requestId: req['correlationId'],
    traceId: req['traceId']
  });

  res.status(statusCode).json({
    error: getErrorMessage(errorCode),
    code: errorCode,
    requestId: req['correlationId']
  });
});

/**
 * Start server with graceful shutdown
 */
async function startServer(): Promise<void> {
  try {
    await configureMiddleware(app);
    configureHealthChecks(app);

    const server = app.listen(PORT, () => {
      logger.info(`API Gateway started`, {
        port: PORT,
        environment: NODE_ENV
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM signal, initiating graceful shutdown');
      
      server.close(async () => {
        try {
          await logger.flush();
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;