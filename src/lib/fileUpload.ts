import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { prisma } from './db';
import { FileAttachment } from '@/types';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default

export class FileUploadManager {
  private uploadDir: string;
  private maxFileSize: number;

  constructor(uploadDir: string = UPLOAD_DIR, maxFileSize: number = MAX_FILE_SIZE) {
    this.uploadDir = uploadDir;
    this.maxFileSize = maxFileSize;
  }

  async ensureUploadDir(): Promise<void> {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: File,
    userId: string,
    projectId?: string,
    conversationId?: string,
    messageId?: string
  ): Promise<FileAttachment> {
    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
    }

    // Ensure upload directory exists
    await this.ensureUploadDir();

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.name);
    const filename = `${timestamp}_${randomString}${extension}`;
    const filePath = path.join(this.uploadDir, filename);

    try {
      // Convert File to Buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Extract text content if possible
      const extractedText = await this.extractTextContent(file, buffer);

      // Save file metadata to database
      const fileRecord = await prisma.file.create({
        data: {
          filename,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          path: filePath,
          extractedText,
          processed: !!extractedText,
          projectId,
          conversationId,
          messageId,
        },
      });

      return {
        id: fileRecord.id,
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
        path: fileRecord.path,
        processed: fileRecord.processed,
        extractedText: fileRecord.extractedText || undefined,
        createdAt: fileRecord.createdAt,
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  async uploadMultipleFiles(
    files: File[],
    userId: string,
    projectId?: string,
    conversationId?: string,
    messageId?: string
  ): Promise<FileAttachment[]> {
    const uploadPromises = files.map(file =>
      this.uploadFile(file, userId, projectId, conversationId, messageId)
    );

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Multiple file upload error:', error);
      throw new Error('Failed to upload one or more files');
    }
  }

  private async extractTextContent(file: File, buffer: Buffer): Promise<string | null> {
    try {
      const mimeType = file.type.toLowerCase();

      // Handle text files
      if (mimeType.startsWith('text/') || mimeType === 'application/json') {
        return buffer.toString('utf-8');
      }

      // Handle markdown files
      if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        return buffer.toString('utf-8');
      }

      // Handle code files
      const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.css', '.html', '.xml', '.yaml', '.yml'];
      const hasCodeExtension = codeExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      if (hasCodeExtension) {
        return buffer.toString('utf-8');
      }

      // For other file types, we'll need additional libraries
      // This is a basic implementation - you can extend it with libraries like:
      // - pdf-parse for PDFs
      // - mammoth for Word documents
      // - xlsx for Excel files
      // - etc.

      return null;
    } catch (error) {
      console.error('Text extraction error:', error);
      return null;
    }
  }

  async getFileById(fileId: string): Promise<FileAttachment | null> {
    try {
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        return null;
      }

      return {
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        path: file.path,
        processed: file.processed,
        extractedText: file.extractedText || undefined,
        createdAt: file.createdAt,
      };
    } catch (error) {
      console.error('Get file error:', error);
      return null;
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        return false;
      }

      // Delete from database
      await prisma.file.delete({
        where: { id: fileId },
      });

      // TODO: Delete physical file from filesystem
      // This would require additional file system operations

      return true;
    } catch (error) {
      console.error('Delete file error:', error);
      return false;
    }
  }

  getSupportedFileTypes(): string[] {
    return [
      // Text files
      'text/plain',
      'text/markdown',
      'application/json',
      
      // Code files
      'text/javascript',
      'text/typescript',
      'text/html',
      'text/css',
      'text/xml',
      'application/xml',
      'text/yaml',
      'application/yaml',
      
      // Documents (for future implementation)
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
  }
}

export const fileUploadManager = new FileUploadManager();
