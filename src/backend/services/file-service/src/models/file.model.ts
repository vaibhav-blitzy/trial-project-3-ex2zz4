import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index
} from 'typeorm'; // v0.3.x
import { IFile } from '../../../shared/interfaces/file.interface';
import { storageConfig } from '../config/storage.config';

/**
 * Enhanced database model for file metadata storage with CDN support and validation
 * Implements comprehensive indexing strategy for optimized query performance
 * @class FileModel
 */
@Entity('files')
@Index(['name', 'mimeType'])
@Index(['createdAt'])
export class FileModel implements IFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    name: 'original_name'
  })
  originalName: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    name: 'mime_type'
  })
  mimeType: string;

  @Column({
    type: 'bigint',
    nullable: false
  })
  size: number;

  @Column({
    type: 'varchar',
    length: 1024,
    nullable: false
  })
  path: string;

  @Column({
    type: 'varchar',
    length: 2048,
    nullable: true
  })
  url: string;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at'
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at'
  })
  updatedAt: Date;

  /**
   * Generates optimized public URL for file access with CDN support
   * Implements fallback strategy and URL validation
   * @returns {string} Complete public URL for file access
   * @throws {Error} If file path is invalid or URL generation fails
   */
  getPublicUrl(): string {
    if (!this.path) {
      throw new Error('File path is not defined');
    }

    try {
      // Check if CDN is configured and use CDN URL if available
      if (storageConfig.s3.cdnDomain) {
        const cdnUrl = new URL(storageConfig.s3.cdnDomain);
        cdnUrl.pathname = encodeURI(this.path);
        
        // Ensure proper SSL configuration
        cdnUrl.protocol = 'https:';
        
        return cdnUrl.toString();
      }

      // Fallback to direct S3 URL if CDN is not configured
      const s3Domain = `${storageConfig.s3.bucket}.s3.${storageConfig.s3.region}.amazonaws.com`;
      const s3Url = new URL(`https://${s3Domain}`);
      s3Url.pathname = encodeURI(this.path);

      return s3Url.toString();
    } catch (error) {
      throw new Error(`Failed to generate public URL: ${error.message}`);
    }
  }

  /**
   * Validates file metadata before saving
   * @returns {boolean} Validation result
   * @throws {Error} If validation fails
   */
  @Column({
    type: 'boolean',
    name: 'is_valid',
    default: false
  })
  private validateMetadata(): boolean {
    if (!this.name || !this.originalName || !this.mimeType) {
      throw new Error('Required file metadata is missing');
    }

    if (!storageConfig.allowedMimeTypes.includes(this.mimeType)) {
      throw new Error(`Unsupported file type: ${this.mimeType}`);
    }

    if (this.size < storageConfig.limits.minFileSize || 
        this.size > storageConfig.limits.maxFileSize) {
      throw new Error(`File size ${this.size} bytes is outside allowed range`);
    }

    return true;
  }
}