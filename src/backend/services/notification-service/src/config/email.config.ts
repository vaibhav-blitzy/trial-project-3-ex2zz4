/**
 * Email Service Configuration
 * Version: 1.0.0
 * Implements secure, scalable email service configuration with comprehensive
 * monitoring, failover, and template management capabilities.
 */

import { SMTPTransport } from 'nodemailer'; // ^6.9.0
import { validateEnvVariables } from 'env-validator'; // ^2.0.0
import * as winston from 'winston'; // ^3.8.0
import { NotificationType } from '../../../shared/interfaces/notification.interface';

// Logger configuration for email operations
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'email-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'email-combined.log' })
  ]
});

/**
 * Interface for comprehensive email service configuration
 */
export interface IEmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    tls: {
      rejectUnauthorized: boolean;
      ciphers: string;
    };
    pool: {
      maxConnections: number;
      maxMessages: number;
    };
    rateLimits: {
      maxPerSecond: number;
      maxBurst: number;
    };
  };
  templates: {
    directory: string;
    mapping: Record<NotificationType, string>;
    validation: {
      enabled: boolean;
      strictMode: boolean;
    };
    cache: {
      enabled: boolean;
      ttl: number;
    };
  };
  defaults: {
    from: string;
    replyTo: string;
    subject: string;
    headers: Record<string, string>;
    encoding: string;
    priority: string;
  };
  monitoring: {
    enabled: boolean;
    metrics: {
      deliveryRate: boolean;
      bounceRate: boolean;
      templateErrors: boolean;
    };
    alerts: {
      enabled: boolean;
      threshold: number;
    };
  };
  failover: {
    enabled: boolean;
    maxRetries: number;
    backoffStrategy: string;
    alternateSmtp: SMTPTransport.Options;
  };
}

// Validate required environment variables
validateEnvVariables([
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'EMAIL_REPLY_TO'
]);

// Enhanced SMTP configuration with security and performance options
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: true,
    ciphers: 'HIGH:MEDIUM:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5'
  },
  pool: {
    maxConnections: 5,
    maxMessages: 100
  }
};

// Template mapping configuration with validation
const TEMPLATE_MAPPING: Record<NotificationType, string> = {
  TASK_ASSIGNED: 'task-assigned.hbs',
  TASK_UPDATED: 'task-updated.hbs',
  PROJECT_CREATED: 'project-created.hbs'
};

// Enhanced default email settings with security headers
const EMAIL_DEFAULTS = {
  from: process.env.EMAIL_FROM,
  replyTo: process.env.EMAIL_REPLY_TO,
  subject: 'Task Management System Notification',
  headers: {
    'X-Priority': '1',
    'X-MSMail-Priority': 'High',
    'X-Mailer': 'TaskManagementSystem',
    'X-Content-Type-Options': 'nosniff'
  },
  encoding: 'UTF-8'
};

/**
 * Comprehensive email service configuration
 * Implements secure SMTP settings, template management, monitoring, and failover
 */
export const emailConfig: IEmailConfig = {
  smtp: {
    ...SMTP_CONFIG,
    rateLimits: {
      maxPerSecond: 10,
      maxBurst: 50
    }
  },
  templates: {
    directory: 'src/templates/email',
    mapping: TEMPLATE_MAPPING,
    validation: {
      enabled: true,
      strictMode: true
    },
    cache: {
      enabled: true,
      ttl: 3600 // 1 hour
    }
  },
  defaults: {
    ...EMAIL_DEFAULTS,
    priority: 'normal'
  },
  monitoring: {
    enabled: true,
    metrics: {
      deliveryRate: true,
      bounceRate: true,
      templateErrors: true
    },
    alerts: {
      enabled: true,
      threshold: 0.95 // Alert if delivery rate falls below 95%
    }
  },
  failover: {
    enabled: true,
    maxRetries: 3,
    backoffStrategy: 'exponential',
    alternateSmtp: {
      host: process.env.SMTP_FAILOVER_HOST,
      port: Number(process.env.SMTP_FAILOVER_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_FAILOVER_USER,
        pass: process.env.SMTP_FAILOVER_PASS
      }
    }
  }
};

// Log configuration initialization
logger.info('Email configuration initialized', {
  smtpHost: emailConfig.smtp.host,
  templatesEnabled: emailConfig.templates.validation.enabled,
  monitoringEnabled: emailConfig.monitoring.enabled
});

export default emailConfig;