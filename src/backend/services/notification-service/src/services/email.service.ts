/**
 * Enhanced Email Service Implementation
 * Version: 1.0.0
 * Provides enterprise-grade email notification capabilities with advanced features
 * including connection pooling, rate limiting, and delivery tracking.
 */

import { createTransport, Transporter } from 'nodemailer'; // ^6.9.0
import { compile, TemplateDelegate } from 'handlebars'; // ^4.7.7
import { readFileSync } from 'fs';
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { emailConfig } from '../config/email.config';
import { INotification, NotificationType, NotificationDeliveryStatus } from '../../../shared/interfaces/notification.interface';
import * as path from 'path';

/**
 * Interface for enhanced email sending options
 */
interface IEmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
  securityHeaders?: ISecurityHeaders;
  trackingOptions?: ITrackingOptions;
  deliveryOptions?: IDeliveryOptions;
}

interface ISecurityHeaders {
  dkim?: boolean;
  spf?: boolean;
  contentSecurityPolicy?: string;
}

interface ITrackingOptions {
  trackOpens?: boolean;
  trackClicks?: boolean;
  messageId?: string;
}

interface IDeliveryOptions {
  priority?: 'high' | 'normal' | 'low';
  retryCount?: number;
  timeout?: number;
}

interface IEmailTemplate {
  name: string;
  version: string;
  compiled: TemplateDelegate;
  isValid: boolean;
  localizations: Record<string, TemplateDelegate>;
}

interface IDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: Error;
  timestamp: Date;
  attempts: number;
}

/**
 * Enhanced Email Service with advanced features for reliable notification delivery
 */
export class EmailService {
  private transporter: Transporter;
  private templates: Map<string, IEmailTemplate>;
  private rateLimiter: typeof rateLimit;
  private retryQueue: Set<string>;
  private deliveryMetrics: Map<string, IDeliveryResult>;

  constructor() {
    this.initializeTransporter();
    this.initializeTemplates();
    this.setupRateLimiting();
    this.initializeMetrics();
  }

  /**
   * Initialize SMTP transporter with connection pooling
   */
  private initializeTransporter(): void {
    this.transporter = createTransport({
      ...emailConfig.smtp,
      pool: true,
      maxConnections: emailConfig.smtp.pool.maxConnections,
      maxMessages: emailConfig.smtp.pool.maxMessages,
      rateDelta: 1000 / emailConfig.smtp.rateLimits.maxPerSecond,
      rateLimit: emailConfig.smtp.rateLimits.maxBurst,
    });

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        throw new Error(`SMTP Connection Error: ${error.message}`);
      }
    });
  }

  /**
   * Initialize and validate email templates
   */
  private initializeTemplates(): void {
    this.templates = new Map();
    
    Object.entries(emailConfig.templates.mapping).forEach(([type, templateFile]) => {
      try {
        const templatePath = path.join(emailConfig.templates.directory, templateFile);
        const templateContent = readFileSync(templatePath, 'utf-8');
        const compiled = compile(templateContent);

        this.templates.set(type, {
          name: templateFile,
          version: '1.0.0',
          compiled,
          isValid: true,
          localizations: {}
        });
      } catch (error) {
        console.error(`Template loading error for ${templateFile}:`, error);
        throw error;
      }
    });
  }

  /**
   * Configure rate limiting for email sending
   */
  private setupRateLimiting(): void {
    this.rateLimiter = rateLimit({
      windowMs: 1000,
      max: emailConfig.smtp.rateLimits.maxPerSecond,
      message: 'Email rate limit exceeded'
    });
    this.retryQueue = new Set();
  }

  /**
   * Initialize metrics collection
   */
  private initializeMetrics(): void {
    this.deliveryMetrics = new Map();
  }

  /**
   * Send an email with enhanced error handling and tracking
   */
  public async sendEmail(options: IEmailOptions): Promise<IDeliveryResult> {
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let attempts = 0;

    try {
      // Apply rate limiting
      if (this.retryQueue.size >= emailConfig.smtp.rateLimits.maxBurst) {
        throw new Error('Rate limit exceeded');
      }

      // Get template
      const template = this.templates.get(options.template);
      if (!template || !template.isValid) {
        throw new Error(`Invalid template: ${options.template}`);
      }

      // Prepare email content
      const html = template.compiled(options.context);
      
      // Prepare email options with security headers
      const mailOptions = {
        from: emailConfig.defaults.from,
        to: options.to,
        subject: options.subject,
        html,
        headers: {
          ...emailConfig.defaults.headers,
          ...options.securityHeaders,
          'X-Message-ID': messageId
        },
        priority: options.deliveryOptions?.priority || 'normal',
        messageId
      };

      // Attempt delivery with retries
      while (attempts < (options.deliveryOptions?.retryCount || emailConfig.failover.maxRetries)) {
        attempts++;
        try {
          const result = await this.transporter.sendMail(mailOptions);
          
          // Track successful delivery
          this.deliveryMetrics.set(messageId, {
            success: true,
            messageId: result.messageId,
            timestamp: new Date(),
            attempts
          });

          return {
            success: true,
            messageId: result.messageId,
            timestamp: new Date(),
            attempts
          };
        } catch (error) {
          if (attempts === (options.deliveryOptions?.retryCount || emailConfig.failover.maxRetries)) {
            throw error;
          }
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }

      throw new Error('Max retry attempts reached');
    } catch (error) {
      // Track failed delivery
      const failureResult = {
        success: false,
        error,
        timestamp: new Date(),
        attempts
      };
      this.deliveryMetrics.set(messageId, failureResult);
      
      // Handle failover if enabled
      if (emailConfig.failover.enabled) {
        return this.handleFailover(options, messageId);
      }

      return failureResult;
    }
  }

  /**
   * Handle failover to backup SMTP server
   */
  private async handleFailover(options: IEmailOptions, messageId: string): Promise<IDeliveryResult> {
    try {
      const failoverTransporter = createTransport(emailConfig.failover.alternateSmtp);
      const result = await failoverTransporter.sendMail({
        from: emailConfig.defaults.from,
        to: options.to,
        subject: options.subject,
        html: this.templates.get(options.template)?.compiled(options.context),
        headers: {
          ...emailConfig.defaults.headers,
          'X-Message-ID': messageId,
          'X-Failover': 'true'
        }
      });

      return {
        success: true,
        messageId: result.messageId,
        timestamp: new Date(),
        attempts: 1
      };
    } catch (error) {
      return {
        success: false,
        error,
        timestamp: new Date(),
        attempts: 1
      };
    }
  }

  /**
   * Send a notification via email
   */
  public async sendNotification(notification: INotification): Promise<IDeliveryResult> {
    const template = emailConfig.templates.mapping[notification.type as NotificationType];
    
    const emailOptions: IEmailOptions = {
      to: notification.metadata.recipientEmail,
      subject: notification.title,
      template,
      context: {
        ...notification.metadata,
        message: notification.message,
        link: notification.metadata.link
      },
      securityHeaders: {
        dkim: true,
        spf: true,
        contentSecurityPolicy: "default-src 'self'"
      },
      trackingOptions: {
        trackOpens: true,
        trackClicks: true,
        messageId: notification.id
      },
      deliveryOptions: {
        priority: 'high',
        retryCount: 3,
        timeout: 30000
      }
    };

    return this.sendEmail(emailOptions);
  }

  /**
   * Get delivery status for a specific message
   */
  public getDeliveryStatus(messageId: string): IDeliveryResult | undefined {
    return this.deliveryMetrics.get(messageId);
  }
}

export default EmailService;