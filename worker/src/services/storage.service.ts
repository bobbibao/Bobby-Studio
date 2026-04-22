import { Injectable, Logger } from '@nestjs/common';
import { GCSConnector, GCSUploadOptions, GCSUploadResult } from './connectors/gcs.connector';
import { ProcessingResult } from '../shared/interfaces/api-response.interface';
import { IStorageService } from '@/infrastructure/storage/storage-service.interface';

export interface ImageProcessingOptions {
  generateThumbnail?: boolean;
  thumbnailWidth?: number;
  thumbnailQuality?: number;
  mainQuality?: number;
}

@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly gcsConnector: GCSConnector) {}

  isUploadConfigured(): boolean {
    return this.gcsConnector.isConfigured;
  }

  /**
   * Upload generated image with parallel processing and thumbnail generation
   * @param imageBuffer Original image buffer
   * @param userId User ID
   * @param userEmail User email for folder structure
   * @param options Upload and processing options
   * @returns Promise with upload result containing both main image and thumbnail URLs
   */
  async uploadGeneratedImage(
    imageBuffer: Buffer,
    userId: string,
    userEmail: string,
    options: Partial<GCSUploadOptions & ImageProcessingOptions> = {}
  ): Promise<ProcessingResult<GCSUploadResult>> {
    const uploadOptions: GCSUploadOptions = {
      folderType: options.folderType,
      userId,
      userEmail,
      generateThumbnail: options.generateThumbnail !== false, // Default to true
      ...options,
    };

    this.logger.log(`Starting parallel upload for user ${userId} (thumbnail: ${uploadOptions.generateThumbnail})`);

    const uploadResult = await this.gcsConnector.uploadImage(imageBuffer, uploadOptions);

    if (uploadResult.success) {
      this.logger.log(
        `Successfully uploaded image and ${
          uploadResult.data?.thumbnail ? 'thumbnail' : 'no thumbnail'
        } for user ${userId}`
      );
    } else {
      this.logger.error(`Failed to upload image for user ${userId}: ${uploadResult.error?.message}`);
    }

    return uploadResult;
  }

  async downloadSourceImage(imagePath: string): Promise<ProcessingResult<Buffer>> {
    return this.gcsConnector.downloadImage(imagePath);
  }

  async cleanupTempFiles(imagePaths: string[]): Promise<void> {
    this.logger.log(`Cleaning up ${imagePaths.length} temporary files`);

    const deletePromises = imagePaths.map((path) => this.gcsConnector.deleteImage(path));

    const results = await Promise.allSettled(deletePromises);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(`Failed to delete ${imagePaths[index]}: ${result.reason}`);
      }
    });
  }

  async getImageBuffer(imageUrl: string): Promise<ProcessingResult<Buffer>> {
    this.logger.log(`Fetching image buffer from URL: ${imageUrl}`);

    try {
      // ✅ rewrite localhost -> production domain
      imageUrl = imageUrl.replace(/^http:\/\/localhost:8001/, 'https://genimageapi.dpdns.org');

      if (imageUrl.startsWith('data:image/')) {
        const base64Data = imageUrl.replace(/^data:image\/[^;]+;base64,/, '');
        return {
          success: true,
          data: Buffer.from(base64Data, 'base64'),
        };
      }

      if (/^[A-Za-z0-9+/=\r\n]+$/.test(imageUrl) && imageUrl.length > 256) {
        return {
          success: true,
          data: Buffer.from(imageUrl.replace(/\s/g, ''), 'base64'),
        };
      }

      const axios = await import('axios');
      const { Agent } = await import('https');

      const httpsAgent = new Agent({
        keepAlive: true,
        maxSockets: 20,
        maxFreeSockets: 5,
      });

      const response = await axios.default.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        httpsAgent,
        maxRedirects: 5,
      });

      return {
        success: true,
        data: Buffer.from(response.data),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch image buffer: ${error.message}`);

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Upload a raw buffer to GCS using the underlying connector.
   * This is a small wrapper to avoid reaching into private connector fields from callers.
   */
  async uploadBufferToGcs(
    buffer: Buffer,
    fileName: string,
    mimeType = 'image/webp',
    options: Partial<GCSUploadOptions> = {}
  ): Promise<GCSUploadResult> {
    return this.gcsConnector.uploadBuffer(buffer, fileName, mimeType, options as GCSUploadOptions);
  }

  async convertBase64ToBuffer(base64String: string): Promise<Buffer> {
    // Remove data URL prefix if present
    const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  async convertBufferToBase64(buffer: Buffer): Promise<string> {
    return buffer.toString('base64');
  }

  generateUniqueFileName(userId: string, extension = 'jpg'): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    return `${userId}_${timestamp}_${randomId}.${extension}`;
  }

  getImageDimensions(imageSize: string): { width: number; height: number } {
    const [width, height] = imageSize.split('x').map(Number);
    return { width: width || 1024, height: height || 1024 };
  }

  /**
   * Delete temporary input images from GCS
   * Handles editImageParams image inputs.
   */
  async deleteTemporaryInputImages(imageParams?: any): Promise<void> {
    try {
      const filesToDelete: string[] = [];
      // Extract from editImageParams (image editing jobs)
      if (imageParams?.data) {
        const data = imageParams.data;
        if (data.imagePath && typeof data.imagePath === 'string' && data.imagePathToDelete) {
          filesToDelete.push(data.imagePath);
        }
        if (data.mask && typeof data.mask === 'string') {
          filesToDelete.push(data.mask);
        }
        if (data.crop && typeof data.crop === 'string') {
          filesToDelete.push(data.crop);
        }
        if (data.referenceImages && Array.isArray(data.referenceImages)) {
          const referenceUrls = data.referenceImages.filter((url: unknown) => typeof url === 'string');
          filesToDelete.push(...referenceUrls);
        }
      }

      // Delete all temporary files in parallel
      if (filesToDelete.length > 0) {
        await Promise.all(filesToDelete.map((url) => this.gcsConnector.deleteImage(url)));
        this.logger.log(`🗑️ Deleted ${filesToDelete.length} temporary input images`);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete temporary input images: ${(error as Error).message}`);
      // Non-blocking - don't throw
    }
  }
}
