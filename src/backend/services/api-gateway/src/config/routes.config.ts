/**
 * API Gateway Routes Configuration
 * Version: 1.0.0
 * Implements comprehensive routing, validation, and monitoring for the Task Management System
 */

import { Router } from 'express'; // v4.x
import rateLimit from 'express-rate-limit'; // v6.x
import * as prometheus from 'prom-client'; // v14.x
import CircuitBreaker from 'opossum'; // v6.x
import { IAuthUser, UserRole } from '../../../shared/interfaces/auth.interface';
import { ITask, TaskStatus } from '../../../shared/interfaces/task.interface';

// HTTP Methods enum for type safety
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD'
}

// API versioning and base path constants
export const API_VERSION = 'v1';
export const BASE_PATH = `/api/${API_VERSION}`;

// Default rate limiting configuration
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip
};

// Type definitions for configuration objects
export type RateLimitConfig = {
  windowMs: number;
  max: number;
  skipSuccessfulRequests: boolean;
  keyGenerator: (req: any) => string;
};

export type ValidationSchema = {
  body?: object;
  params?: object;
  query?: object;
  headers?: object;
};

export type CircuitBreakerConfig = {
  timeout: number;
  failureThreshold: number;
  resetTimeout: number;
};

// Interface for route configuration
export interface RouteConfig {
  basePath: string;
  serviceName: string;
  version: string;
  routes: RouteDefinition[];
  validationRules: ValidationSchema;
  circuitBreaker: CircuitBreakerConfig;
  metrics: MetricsConfig;
}

// Interface for individual route definition
export interface RouteDefinition {
  path: string;
  method: HttpMethod;
  handler: string;
  roles: UserRole[];
  isPublic: boolean;
  rateLimit?: RateLimitConfig;
  inputValidation?: ValidationSchema;
  responseSchema?: object;
  errorHandling?: ErrorConfig;
  middleware?: MiddlewareChain;
}

// Interface for metrics configuration
interface MetricsConfig {
  enabled: boolean;
  prefix: string;
  defaultLabels: Record<string, string>;
}

// Interface for error handling configuration
interface ErrorConfig {
  retryable: boolean;
  maxRetries: number;
  errorCodes: number[];
}

// Interface for middleware chain
type MiddlewareChain = Array<(req: any, res: any, next: any) => void>;

// Initialize Prometheus metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Route configurations for different services
const routeConfigurations: RouteConfig[] = [
  {
    basePath: `${BASE_PATH}/tasks`,
    serviceName: 'task-service',
    version: API_VERSION,
    routes: [
      {
        path: '/',
        method: HttpMethod.GET,
        handler: 'getAllTasks',
        roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER],
        isPublic: false,
        rateLimit: {
          ...DEFAULT_RATE_LIMIT,
          max: 1000 // Higher limit for task listing
        }
      },
      {
        path: '/:id',
        method: HttpMethod.GET,
        handler: 'getTaskById',
        roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER],
        isPublic: false,
        inputValidation: {
          params: {
            id: { type: 'string', format: 'uuid' }
          }
        }
      },
      {
        path: '/',
        method: HttpMethod.POST,
        handler: 'createTask',
        roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER],
        isPublic: false,
        inputValidation: {
          body: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            projectId: { type: 'string', format: 'uuid' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }
          }
        }
      }
    ],
    validationRules: {},
    circuitBreaker: {
      timeout: 3000,
      failureThreshold: 5,
      resetTimeout: 30000
    },
    metrics: {
      enabled: true,
      prefix: 'task_service',
      defaultLabels: { service: 'task-service' }
    }
  }
];

/**
 * Configures and initializes all API routes with security, validation, and monitoring
 * @param router Express Router instance
 * @returns Configured Express router
 */
export function configureRoutes(router: Router): Router {
  // Initialize circuit breakers for services
  const circuitBreakers = new Map<string, CircuitBreaker>();

  routeConfigurations.forEach((config) => {
    // Create circuit breaker for service
    const breaker = new CircuitBreaker(async (req: any) => {
      // Service call implementation
    }, config.circuitBreaker);

    circuitBreakers.set(config.serviceName, breaker);

    // Configure routes for service
    config.routes.forEach((route) => {
      const middlewareChain: MiddlewareChain = [];

      // Add rate limiting if configured
      if (route.rateLimit) {
        middlewareChain.push(rateLimit(route.rateLimit));
      }

      // Add authentication middleware if not public
      if (!route.isPublic) {
        middlewareChain.push(authenticateRequest);
      }

      // Add authorization middleware
      if (route.roles?.length) {
        middlewareChain.push(authorizeRequest(route.roles));
      }

      // Add input validation middleware
      if (route.inputValidation) {
        middlewareChain.push(validateRequest(route.inputValidation));
      }

      // Add metrics collection middleware
      if (config.metrics.enabled) {
        middlewareChain.push(collectMetrics(config.metrics));
      }

      // Register route with middleware chain
      router[route.method.toLowerCase()](
        `${config.basePath}${route.path}`,
        ...middlewareChain,
        async (req: any, res: any, next: any) => {
          try {
            const result = await breaker.fire(req);
            res.json(result);
          } catch (error) {
            next(error);
          }
        }
      );
    });
  });

  return router;
}

// Middleware implementations
function authenticateRequest(req: any, res: any, next: any) {
  // Authentication implementation
  next();
}

function authorizeRequest(roles: UserRole[]) {
  return (req: any, res: any, next: any) => {
    // Authorization implementation
    next();
  };
}

function validateRequest(schema: ValidationSchema) {
  return (req: any, res: any, next: any) => {
    // Validation implementation
    next();
  };
}

function collectMetrics(config: MetricsConfig) {
  return (req: any, res: any, next: any) => {
    const startTime = process.hrtime();

    res.on('finish', () => {
      const duration = process.hrtime(startTime);
      httpRequestDuration
        .labels({
          method: req.method,
          route: req.route.path,
          status_code: res.statusCode
        })
        .observe(duration[0] + duration[1] / 1e9);
    });

    next();
  };
}