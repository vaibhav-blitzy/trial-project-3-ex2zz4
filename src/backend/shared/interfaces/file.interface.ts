/**
 * Core interface for file metadata storage and management across the application.
 * Supports both database (PostgreSQL) and object storage (AWS S3) requirements.
 * @interface IFile
 */
export interface IFile {
  /** Unique identifier for the file */
  id: string;

  /** Sanitized file name used for storage */
  name: string;

  /** Original file name as uploaded by user */
  originalName: string;

  /** MIME type of the file */
  mimeType: string;

  /** File size in bytes */
  size: number;

  /** Storage path/key in object storage */
  path: string;

  /** Public access URL for the file */
  url: string;

  /** Timestamp when file was created */
  createdAt: Date;

  /** Timestamp when file was last updated */
  updatedAt: Date;
}

/**
 * Interface for handling incoming file upload requests.
 * Manages both file content and metadata during the upload process.
 * @interface IFileUpload
 */
export interface IFileUpload {
  /** Original file name from upload request */
  originalName: string;

  /** MIME type of uploaded file */
  mimeType: string;

  /** Size of uploaded file in bytes */
  size: number;

  /** Binary content of the file */
  buffer: Buffer;
}