import { NestFactory } from '@nestjs/core';
import { 
  Module, 
  ValidationPipe, 
  Logger,
  MiddlewareConsumer, 
  RequestMethod 
} from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { TerminusModule } from '@nestjs/terminus';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { FileController } from './controllers/file.controller';
import { FileService } from './services/file.service';
import { storageConfig } from './config/storage.config';
import { HealthController } from './controllers/health.controller';
import { MetricsService } from './services/metrics.service';
import { RateLimiterMiddleware } from './middleware/rate-limiter.middleware';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { RequestLoggingMiddleware } from './middleware/request-logging.middleware';

// Environment variables with defaults
const PORT = process.env.PORT || 3003;
const CORS_WHITELIST = process.env.CORS_WHITELIST?.split(',') || [];
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10); // 15 minutes
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

/**
 * Root module for the File Service application with enhanced security and monitoring
 */
@Module({
  imports: [
    TerminusModule,
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      customMetrics: {
        fileUploads: {
          type: 'counter',
          help: 'Total number of file uploads',
        },
        fileDownloads: {
          type: 'counter',
          help: 'Total number of file downloads',
        },
        uploadLatency: {
          type: 'histogram',
          help: 'File upload latency in milliseconds',
        },
      },
    }),
  ],
  controllers: [FileController, HealthController],
  providers: [FileService, MetricsService],
})
export class FileModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        helmet(),
        compression(),
        CorrelationIdMiddleware,
        RequestLoggingMiddleware,
        RateLimiterMiddleware.configure({
          windowMs: RATE_LIMIT_WINDOW,
          max: RATE_LIMIT_MAX,
        }),
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

/**
 * Bootstraps the NestJS application with enhanced security, monitoring, and performance features
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // Create NestJS application
    const app = await NestFactory.create(FileModule, {
      logger: ['error', 'warn', 'log', 'debug'],
      cors: {
        origin: CORS_WHITELIST,
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
        credentials: true,
        maxAge: 86400, // 24 hours
      },
    });

    // Apply global validation pipe with strict settings
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: false,
        },
      }),
    );

    // Configure security headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...CORS_WHITELIST],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hidePoweredBy: true,
    }));

    // Enable response compression
    app.use(compression());

    // Configure graceful shutdown
    app.enableShutdownHooks();

    // Start the server
    await app.listen(PORT);
    logger.log(`File Service is running on port ${PORT}`);
    logger.log(`Storage configuration loaded for bucket: ${storageConfig.s3.bucket}`);
    logger.log(`Security features enabled: Virus scanning=${storageConfig.security.virusScan.enabled}, Encryption=${storageConfig.security.encryption.atRest}`);

  } catch (error) {
    logger.error(`Failed to start File Service: ${error.message}`, error.stack);
    process.exit(1);
  }
}

// Start the application
bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});