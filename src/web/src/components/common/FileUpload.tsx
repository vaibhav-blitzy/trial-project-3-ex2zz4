/**
 * @fileoverview Material Design 3.0 File Upload Component
 * Implements WCAG 2.1 Level AA accessibility with drag-and-drop support
 * @version 1.0.0
 */

import React, { useCallback, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { CloudUpload } from '@mui/icons-material';
import { LinearProgress } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
import Button from './Button';
import Loading from './Loading';
import StorageService from '../../services/storage.service';
import { COLORS, SPACING, TRANSITIONS, TYPOGRAPHY } from '../../constants/theme.constants';

// File upload container with drag-and-drop support
const DropZone = styled.div<{ isDragging: boolean; disabled: boolean }>`
  border: 2px dashed ${({ isDragging, theme }) =>
    isDragging ? COLORS.light.primary.main : COLORS.light.text.secondary};
  border-radius: 8px;
  padding: ${SPACING.scale[4]};
  background-color: ${({ isDragging, disabled }) =>
    disabled
      ? COLORS.light.background.paper
      : isDragging
      ? `${COLORS.light.primary.main}10`
      : COLORS.light.background.default};
  transition: all ${TRANSITIONS.duration.shorter} ${TRANSITIONS.easing.easeInOut};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${SPACING.scale[3]};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
  
  &:focus-visible {
    outline: 2px solid ${COLORS.light.primary.main};
    outline-offset: 2px;
  }
`;

const FileList = styled.ul`
  list-style: none;
  padding: 0;
  margin: ${SPACING.scale[3]} 0;
  width: 100%;
`;

const FileItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${SPACING.scale[2]};
  border-radius: 4px;
  background-color: ${COLORS.light.background.paper};
  margin-bottom: ${SPACING.scale[2]};
  font-family: ${TYPOGRAPHY.fontFamilies.primary};
`;

interface FileUploadProps {
  accept?: string[];
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  chunkSize?: number;
  compression?: boolean;
  onUpload: (files: File[]) => Promise<void>;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  accept = ['*/*'],
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 10,
  chunkSize = 1024 * 1024, // 1MB chunks
  compression = false,
  onUpload,
  onProgress,
  onError,
  onCancel,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storageService = new StorageService();

  const validateFiles = useCallback(async (newFiles: File[]): Promise<File[]> => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of newFiles) {
      // Check file type
      if (!accept.includes('*/*') && !accept.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`);
        continue;
      }

      // Check file size
      if (file.size > maxSize) {
        errors.push(`${file.name}: File size exceeds ${maxSize / 1024 / 1024}MB limit`);
        continue;
      }

      // Validate file content and check for malware
      try {
        await storageService.validateFile(file);
        validFiles.push(file);
      } catch (error) {
        errors.push(`${file.name}: ${(error as Error).message}`);
      }
    }

    if (errors.length > 0) {
      onError?.(new Error(errors.join('\n')));
    }

    return validFiles;
  }, [accept, maxSize, onError]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = Array.from(event.dataTransfer.files);
    if (!multiple && droppedFiles.length > 1) {
      onError?.(new Error('Multiple file upload is not allowed'));
      return;
    }

    if (droppedFiles.length + files.length > maxFiles) {
      onError?.(new Error(`Maximum ${maxFiles} files allowed`));
      return;
    }

    const validFiles = await validateFiles(droppedFiles);
    setFiles(prev => [...prev, ...validFiles]);
  }, [disabled, multiple, maxFiles, files, validateFiles, onError]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;

    const selectedFiles = Array.from(event.target.files);
    const validFiles = await validateFiles(selectedFiles);
    setFiles(prev => [...prev, ...validFiles]);
  }, [validateFiles]);

  const handleUpload = useCallback(async () => {
    if (!files.length || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await onUpload(files);
      setFiles([]);
      setUploadProgress(100);
      // Announce completion to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = 'Upload completed successfully';
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsUploading(false);
    }
  }, [files, isUploading, onUpload, onError]);

  const handleCancel = useCallback(() => {
    if (isUploading) {
      onCancel?.();
    }
    setFiles([]);
    setUploadProgress(0);
    setIsUploading(false);
  }, [isUploading, onCancel]);

  return (
    <ErrorBoundary
      fallback={<div role="alert">Error loading upload component</div>}
      onError={onError}
    >
      <div role="region" aria-label="File upload">
        <DropZone
          isDragging={isDragging}
          disabled={disabled}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-disabled={disabled}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept.join(',')}
            multiple={multiple}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
          <CloudUpload sx={{ fontSize: 48, color: COLORS.light.primary.main }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: SPACING.scale[2] }}>
              {isDragging ? 'Drop files here' : 'Drag and drop files or click to browse'}
            </p>
            <p style={{ fontSize: TYPOGRAPHY.fontSizes.sm, color: COLORS.light.text.secondary }}>
              {`Maximum file size: ${maxSize / 1024 / 1024}MB`}
            </p>
          </div>
        </DropZone>

        {files.length > 0 && (
          <FileList role="list" aria-label="Selected files">
            {files.map((file, index) => (
              <FileItem key={`${file.name}-${index}`} role="listitem">
                <span>{file.name}</span>
                <span>{`${(file.size / 1024).toFixed(1)} KB`}</span>
              </FileItem>
            ))}
          </FileList>
        )}

        {isUploading && (
          <div role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{ marginY: SPACING.scale[2] }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: SPACING.scale[2], marginTop: SPACING.scale[3] }}>
          <Button
            variant="PRIMARY"
            disabled={!files.length || disabled}
            onClick={handleUpload}
            loading={isUploading}
            ariaLabel="Upload files"
          >
            {isUploading ? <Loading size="small" /> : 'Upload'}
          </Button>
          <Button
            variant="OUTLINED"
            onClick={handleCancel}
            disabled={!files.length && !isUploading}
            ariaLabel="Cancel upload"
          >
            Cancel
          </Button>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default FileUpload;