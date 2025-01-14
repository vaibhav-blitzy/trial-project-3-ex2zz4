import { Injectable, Logger, UseInterceptors, CacheInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ClamAV } from '@djsolutions/clamav';
import { Cache } from '@nestjs/cache-manager';
import { createHash } from 'crypto';
import { IFile, IFileUpload } from '../../../shared/interfaces/file.interface';
import { FileModel } from '../models/file.model';
import { storageConfig } from '../config/storage.config';

/**
 * Enhanced service for handling file operations with security, CDN optimization,
 * and comprehensive error handling
 * @class FileService
 */
@Injectable()
@UseInterceptors(CacheInterceptor)
export class FileService {
  private readonly s3Client: S3Client;
  private readonly virusScanner: ClamAV;
  private readonly logger = new Logger(FileService.name);
  private readonly CACHE_TTL = storageConfig.cache.duration;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheManager: Cache
  ) {
    // Initialize S3 client with enhanced configuration
    this.s3Client = new S3Client({
      region: storageConfig.s3.region,
      credentials: {
        accessKeyId: storageConfig.s3.accessKeyId,
        secretAccessKey: storageConfig.s3.secretAccessKey,
      },
      useAccelerateEndpoint: storageConfig.s3.useAccelerateEndpoint,
      maxAttempts: storageConfig.limits.maxRetries,
    });

    // Initialize virus scanner
    this.virusScanner = new ClamAV({
      removeInfected: true,
      quarantinePath: '/tmp/quarantine',
      timeout: storageConfig.security.virusScan.timeout,
    });
  }

  /**
   * Uploads file with comprehensive security checks and CDN optimization
   * @param fileUpload File upload data
   * @returns Promise<IFile> Enhanced file metadata
   * @throws Error if validation or upload fails
   */
  async uploadFile(fileUpload: IFileUpload): Promise<IFile> {
    try {
      // Generate file checksum for integrity verification
      const checksum = createHash('sha256')
        .update(fileUpload.buffer)
        .digest('hex');

      // Validate file comprehensively
      await this.validateFile(fileUpload);

      // Perform virus scan if enabled
      if (storageConfig.security.virusScan.enabled) {
        const scanResult = await this.virusScanner.scanBuffer(fileUpload.buffer);
        if (!scanResult.isClean) {
          throw new Error(`Virus detected in file: ${scanResult.viruses.join(', ')}`);
        }
      }

      // Generate secure file path
      const filePath = `${storageConfig.uploadPath}/${new Date().getTime()}-${checksum.substring(0, 8)}-${fileUpload.originalName}`;

      // Upload to S3 with encryption and metadata
      const uploadCommand = new PutObjectCommand({
        Bucket: storageConfig.s3.bucket,
        Key: filePath,
        Body: fileUpload.buffer,
        ContentType: fileUpload.mimeType,
        ServerSideEncryption: storageConfig.s3.encryptionConfig.algorithm,
        Metadata: {
          originalName: fileUpload.originalName,
          checksum: checksum,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(uploadCommand);

      // Create and save file metadata
      const fileModel = new FileModel();
      fileModel.name = filePath;
      fileModel.originalName = fileUpload.originalName;
      fileModel.mimeType = fileUpload.mimeType;
      fileModel.size = fileUpload.size;
      fileModel.path = filePath;
      fileModel.url = fileModel.getPublicUrl();

      // Cache file metadata
      const cacheKey = `file:${fileModel.id}`;
      await this.cacheManager.set(cacheKey, fileModel, this.CACHE_TTL);

      this.logger.log(`File uploaded successfully: ${fileModel.id}`);
      return fileModel;

    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Retrieves file with CDN optimization and caching
   * @param fileId File identifier
   * @returns Promise<IFile> File metadata with optimized URLs
   * @throws Error if file not found or access denied
   */
  async getFile(fileId: string): Promise<IFile> {
    try {
      // Check cache first
      const cacheKey = `file:${fileId}`;
      const cachedFile = await this.cacheManager.get<IFile>(cacheKey);
      if (cachedFile) {
        return cachedFile;
      }

      // Retrieve file metadata
      const fileModel = await FileModel.findOne({ where: { id: fileId } });
      if (!fileModel) {
        throw new Error('File not found');
      }

      // Generate optimized URLs
      fileModel.url = fileModel.getPublicUrl();

      // Cache the result
      await this.cacheManager.set(cacheKey, fileModel, this.CACHE_TTL);

      return fileModel;

    } catch (error) {
      this.logger.error(`File retrieval failed: ${error.message}`, error.stack);
      throw new Error(`File retrieval failed: ${error.message}`);
    }
  }

  /**
   * Validates file with comprehensive security checks
   * @param file File upload data
   * @returns Promise<boolean> Validation result
   * @throws Error if validation fails
   */
  private async validateFile(file: IFileUpload): Promise<boolean> {
    // Check file size limits
    if (file.size < storageConfig.limits.minFileSize || 
        file.size > storageConfig.limits.maxFileSize) {
      throw new Error(`File size ${file.size} bytes is outside allowed range`);
    }

    // Validate MIME type
    if (!storageConfig.allowedMimeTypes.includes(file.mimeType)) {
      throw new Error(`Unsupported file type: ${file.mimeType}`);
    }

    // Validate file extension
    if (storageConfig.security.contentValidation.validateFileExtension) {
      const extension = file.originalName.split('.').pop()?.toLowerCase();
      const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx', 'xlsx', 'txt', 'zip'];
      if (!extension || !validExtensions.includes(extension)) {
        throw new Error(`Invalid file extension: ${extension}`);
      }
    }

    // Additional security checks can be added here
    return true;
  }

  /**
   * Deletes file and associated metadata
   * @param fileId File identifier
   * @returns Promise<boolean> Deletion result
   * @throws Error if deletion fails
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const fileModel = await FileModel.findOne({ where: { id: fileId } });
      if (!fileModel) {
        throw new Error('File not found');
      }

      // Delete from S3
      const deleteCommand = new DeleteObjectCommand({
        Bucket: storageConfig.s3.bucket,
        Key: fileModel.path,
      });
      await this.s3Client.send(deleteCommand);

      // Remove from cache
      const cacheKey = `file:${fileId}`;
      await this.cacheManager.del(cacheKey);

      // Delete metadata
      await FileModel.delete(fileId);

      this.logger.log(`File deleted successfully: ${fileId}`);
      return true;

    } catch (error) {
      this.logger.error(`File deletion failed: ${error.message}`, error.stack);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }
}