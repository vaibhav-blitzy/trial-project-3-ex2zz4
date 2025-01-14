// @aws-sdk/client-s3 version 3.x
import { S3 } from '@aws-sdk/client-s3';
import { IFile } from '../../shared/interfaces/file.interface';

/**
 * Interface for AWS S3 configuration with enhanced security and performance settings
 */
interface IS3Config {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  useAccelerateEndpoint: boolean;
  cdnDomain: string;
  uploadTimeout: number;
  corsConfig: {
    allowedOrigins: string[];
    allowedMethods: string[];
    maxAge: number;
  };
  encryptionConfig: {
    enabled: boolean;
    algorithm: string;
    kmsKeyId?: string;
  };
}

/**
 * Comprehensive storage configuration interface including security and monitoring
 */
interface IStorageConfig {
  s3: IS3Config;
  limits: {
    maxFileSize: number;
    minFileSize: number;
    maxConcurrentUploads: number;
    maxRetries: number;
  };
  allowedMimeTypes: string[];
  uploadPath: string;
  cache: {
    enabled: boolean;
    duration: number;
    maxAge: number;
    staleWhileRevalidate: number;
  };
  security: {
    virusScan: {
      enabled: boolean;
      timeout: number;
    };
    contentValidation: {
      validateMimeType: boolean;
      validateFileExtension: boolean;
    };
    encryption: {
      inTransit: boolean;
      atRest: boolean;
    };
  };
  monitoring: {
    enabled: boolean;
    metrics: string[];
    alertThresholds: {
      errorRate: number;
      latency: number;
    };
  };
  compliance: {
    retentionPeriod: number;
    dataClassification: string;
    auditLogging: boolean;
  };
}

// Constants for storage configuration
export const MAX_FILE_SIZE = 52428800; // 50MB in bytes
export const MIN_FILE_SIZE = 1024; // 1KB in bytes
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip'
];
export const CACHE_DURATION = 86400; // 24 hours in seconds
export const UPLOAD_PATH = 'uploads';
export const MAX_UPLOAD_RETRIES = 3;
export const VIRUS_SCAN_TIMEOUT = 30000; // 30 seconds

/**
 * Validates the storage configuration for security and completeness
 * @param config Storage configuration to validate
 * @returns boolean indicating if configuration is valid
 */
const validateStorageConfig = (config: IStorageConfig): boolean => {
  if (!config.s3.accessKeyId || !config.s3.secretAccessKey || !config.s3.bucket) {
    throw new Error('Missing required S3 credentials');
  }

  if (!config.s3.region) {
    throw new Error('S3 region must be specified');
  }

  if (!config.security.encryption.atRest) {
    throw new Error('Storage encryption at rest must be enabled');
  }

  if (!config.allowedMimeTypes || config.allowedMimeTypes.length === 0) {
    throw new Error('Allowed MIME types must be specified');
  }

  return true;
};

/**
 * Retrieves and validates storage configuration based on environment
 * @returns Validated storage configuration
 */
const getStorageConfig = (): IStorageConfig => {
  const config: IStorageConfig = {
    s3: {
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET || '',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      useAccelerateEndpoint: process.env.USE_S3_ACCELERATE === 'true',
      cdnDomain: process.env.CDN_DOMAIN || '',
      uploadTimeout: parseInt(process.env.UPLOAD_TIMEOUT || '300000', 10),
      corsConfig: {
        allowedOrigins: (process.env.CORS_ORIGINS || '').split(','),
        allowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        maxAge: 86400
      },
      encryptionConfig: {
        enabled: true,
        algorithm: 'AES256',
        kmsKeyId: process.env.KMS_KEY_ID
      }
    },
    limits: {
      maxFileSize: MAX_FILE_SIZE,
      minFileSize: MIN_FILE_SIZE,
      maxConcurrentUploads: parseInt(process.env.MAX_CONCURRENT_UPLOADS || '10', 10),
      maxRetries: MAX_UPLOAD_RETRIES
    },
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    uploadPath: UPLOAD_PATH,
    cache: {
      enabled: true,
      duration: CACHE_DURATION,
      maxAge: 86400,
      staleWhileRevalidate: 600
    },
    security: {
      virusScan: {
        enabled: true,
        timeout: VIRUS_SCAN_TIMEOUT
      },
      contentValidation: {
        validateMimeType: true,
        validateFileExtension: true
      },
      encryption: {
        inTransit: true,
        atRest: true
      }
    },
    monitoring: {
      enabled: true,
      metrics: ['uploads', 'downloads', 'errors', 'latency'],
      alertThresholds: {
        errorRate: 0.01, // 1% error rate threshold
        latency: 1000 // 1 second latency threshold
      }
    },
    compliance: {
      retentionPeriod: 90, // 90 days retention
      dataClassification: 'CONFIDENTIAL',
      auditLogging: true
    }
  };

  validateStorageConfig(config);
  return config;
};

// Export the storage configuration
export const storageConfig = getStorageConfig();