import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Cache } from '@nestjs/cache-manager';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ClamAV } from '@djsolutions/clamav';
import { FileService } from '../src/services/file.service';
import { IFile, IFileUpload } from '../../../shared/interfaces/file.interface';
import { FileModel } from '../src/models/file.model';
import { storageConfig } from '../src/config/storage.config';

// Mock external dependencies
jest.mock('@aws-sdk/client-s3');
jest.mock('@djsolutions/clamav');
jest.mock('../src/models/file.model');

describe('FileService', () => {
  let fileService: FileService;
  let configService: ConfigService;
  let cacheManager: Cache;

  const mockS3Client = {
    send: jest.fn()
  };

  const mockVirusScanner = {
    scanBuffer: jest.fn()
  };

  const mockFile: IFileUpload = {
    originalName: 'test-document.pdf',
    mimeType: 'application/pdf',
    size: 1024 * 1024, // 1MB
    buffer: Buffer.from('test file content')
  };

  const mockFileMetadata: IFile = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'test-document.pdf',
    originalName: 'test-document.pdf',
    mimeType: 'application/pdf',
    size: 1024 * 1024,
    path: 'uploads/test-document.pdf',
    url: 'https://cdn.example.com/uploads/test-document.pdf',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FileService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              return storageConfig[key];
            })
          }
        },
        {
          provide: Cache,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn()
          }
        }
      ]
    }).compile();

    fileService = module.get<FileService>(FileService);
    configService = module.get<ConfigService>(ConfigService);
    cacheManager = module.get<Cache>(Cache);

    // Mock S3 client implementation
    (S3Client as jest.Mock).mockImplementation(() => mockS3Client);
    (ClamAV as jest.Mock).mockImplementation(() => mockVirusScanner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should successfully upload a file with virus scanning', async () => {
      // Mock virus scan result
      mockVirusScanner.scanBuffer.mockResolvedValue({ isClean: true });

      // Mock S3 upload
      mockS3Client.send.mockResolvedValue({});

      // Mock file model creation
      (FileModel as any).mockImplementation(() => ({
        ...mockFileMetadata,
        save: jest.fn().mockResolvedValue(mockFileMetadata),
        getPublicUrl: jest.fn().mockReturnValue(mockFileMetadata.url)
      }));

      const result = await fileService.uploadFile(mockFile);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockFileMetadata.id);
      expect(mockVirusScanner.scanBuffer).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should reject upload when virus is detected', async () => {
      mockVirusScanner.scanBuffer.mockResolvedValue({
        isClean: false,
        viruses: ['EICAR-TEST-SIGNATURE']
      });

      await expect(fileService.uploadFile(mockFile)).rejects.toThrow('Virus detected');
    });

    it('should validate file size limits', async () => {
      const oversizedFile: IFileUpload = {
        ...mockFile,
        size: storageConfig.limits.maxFileSize + 1
      };

      await expect(fileService.uploadFile(oversizedFile)).rejects.toThrow('File size');
    });

    it('should validate mime type', async () => {
      const invalidMimeTypeFile: IFileUpload = {
        ...mockFile,
        mimeType: 'application/invalid'
      };

      await expect(fileService.uploadFile(invalidMimeTypeFile)).rejects.toThrow('Unsupported file type');
    });
  });

  describe('getFile', () => {
    it('should return cached file if available', async () => {
      cacheManager.get.mockResolvedValue(mockFileMetadata);

      const result = await fileService.getFile(mockFileMetadata.id);

      expect(result).toEqual(mockFileMetadata);
      expect(cacheManager.get).toHaveBeenCalledWith(`file:${mockFileMetadata.id}`);
      expect(FileModel.findOne).not.toHaveBeenCalled();
    });

    it('should fetch and cache file if not in cache', async () => {
      cacheManager.get.mockResolvedValue(null);
      (FileModel.findOne as jest.Mock).mockResolvedValue({
        ...mockFileMetadata,
        getPublicUrl: jest.fn().mockReturnValue(mockFileMetadata.url)
      });

      const result = await fileService.getFile(mockFileMetadata.id);

      expect(result).toEqual(mockFileMetadata);
      expect(FileModel.findOne).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should throw error if file not found', async () => {
      cacheManager.get.mockResolvedValue(null);
      (FileModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(fileService.getFile('non-existent-id')).rejects.toThrow('File not found');
    });
  });

  describe('deleteFile', () => {
    it('should successfully delete file and metadata', async () => {
      (FileModel.findOne as jest.Mock).mockResolvedValue({
        ...mockFileMetadata,
        path: mockFileMetadata.path
      });
      mockS3Client.send.mockResolvedValue({});
      (FileModel.delete as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await fileService.deleteFile(mockFileMetadata.id);

      expect(result).toBe(true);
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
      expect(cacheManager.del).toHaveBeenCalledWith(`file:${mockFileMetadata.id}`);
      expect(FileModel.delete).toHaveBeenCalledWith(mockFileMetadata.id);
    });

    it('should throw error if file not found during deletion', async () => {
      (FileModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(fileService.deleteFile('non-existent-id')).rejects.toThrow('File not found');
    });

    it('should handle S3 deletion errors', async () => {
      (FileModel.findOne as jest.Mock).mockResolvedValue(mockFileMetadata);
      mockS3Client.send.mockRejectedValue(new Error('S3 error'));

      await expect(fileService.deleteFile(mockFileMetadata.id)).rejects.toThrow('File deletion failed');
    });
  });
});