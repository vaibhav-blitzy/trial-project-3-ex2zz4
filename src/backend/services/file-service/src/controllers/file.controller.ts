import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  UseGuards, 
  UseInterceptors,
  UploadedFile,
  Param,
  Req,
  StreamableFile,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { FileService } from '../services/file.service';
import { IFile } from '../../../shared/interfaces/file.interface';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { QuotaGuard } from '../guards/quota.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { OwnershipGuard } from '../guards/ownership.guard';
import { storageConfig } from '../config/storage.config';

/**
 * Controller handling secure file operations with comprehensive validation,
 * audit logging, and GDPR compliance measures
 * @class FileController
 */
@Controller('files')
@UseGuards(AuthGuard())
@UseInterceptors(LoggingInterceptor)
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(private readonly fileService: FileService) {}

  /**
   * Handles secure file upload with validation, virus scanning, and quota checks
   * @param file Uploaded file buffer and metadata
   * @param req Express request object for user context
   * @returns Promise<IFile> Uploaded file metadata with CDN URL
   * @throws BadRequestException for validation failures
   * @throws ForbiddenException for quota or permission issues
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: storageConfig.limits.maxFileSize,
    },
  }))
  @UseGuards(QuotaGuard)
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request
  ): Promise<IFile> {
    try {
      this.logger.log(`File upload initiated by user ${req.user?.['id']}`);

      if (!file) {
        throw new BadRequestException('No file provided');
      }

      const fileUpload = {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        buffer: file.buffer
      };

      // Perform comprehensive validation
      await this.fileService.validateFile(fileUpload);

      // Scan file for viruses if enabled
      if (storageConfig.security.virusScan.enabled) {
        await this.fileService.scanFile(fileUpload.buffer);
      }

      // Process upload with enhanced metadata
      const uploadedFile = await this.fileService.uploadFile({
        ...fileUpload,
        userId: req.user?.['id'],
        metadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          uploadTimestamp: new Date().toISOString()
        }
      });

      this.logger.log(`File uploaded successfully: ${uploadedFile.id}`);
      return uploadedFile;

    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Retrieves file with streaming support and access control
   * @param id File identifier
   * @param req Express request object for user context
   * @returns Promise<StreamableFile> File stream with metadata
   * @throws NotFoundException if file not found
   * @throws ForbiddenException if access denied
   */
  @Get(':id')
  @UseGuards(PermissionGuard)
  async getFile(
    @Param('id') id: string,
    @Req() req: Request
  ): Promise<StreamableFile> {
    try {
      this.logger.log(`File download requested: ${id} by user ${req.user?.['id']}`);

      const file = await this.fileService.getFile(id);
      if (!file) {
        throw new NotFoundException('File not found');
      }

      // Log access for audit purposes
      this.logger.log(`File access granted: ${id} to user ${req.user?.['id']}`);

      return new StreamableFile(await this.fileService.getFileStream(id), {
        type: file.mimeType,
        disposition: `attachment; filename="${file.originalName}"`,
        length: file.size
      });

    } catch (error) {
      this.logger.error(`File retrieval failed: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`File retrieval failed: ${error.message}`);
    }
  }

  /**
   * Securely deletes file with proper cleanup and audit logging
   * @param id File identifier
   * @param req Express request object for user context
   * @returns Promise<void> Deletion confirmation
   * @throws NotFoundException if file not found
   * @throws ForbiddenException if deletion not allowed
   */
  @Delete(':id')
  @UseGuards(OwnershipGuard)
  async deleteFile(
    @Param('id') id: string,
    @Req() req: Request
  ): Promise<void> {
    try {
      this.logger.log(`File deletion requested: ${id} by user ${req.user?.['id']}`);

      const file = await this.fileService.getFile(id);
      if (!file) {
        throw new NotFoundException('File not found');
      }

      await this.fileService.deleteFile(id);

      // Log deletion for audit purposes
      this.logger.log(`File deleted successfully: ${id} by user ${req.user?.['id']}`);

    } catch (error) {
      this.logger.error(`File deletion failed: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`File deletion failed: ${error.message}`);
    }
  }
}