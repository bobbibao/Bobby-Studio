import { Injectable, Logger } from '@nestjs/common';
import { Storage, Bucket } from '@google-cloud/storage';
import { ApiKeysConfig } from '../../config/api-keys.config';
import { ProcessingResult } from '../../shared/interfaces/api-response.interface';
import { ImageUtils } from '../../utils/image.utils';
import { isEnvValueSet } from '../../shared/utils/env.utils';
export interface GCSUploadResult {
  key: string;
  location: string;
  eTag: string;
  bucket: string;
  thumbnail?: string;
}

export enum ImageFolderType {
  USER_GENERATED = 'images/users/{userId}',
}

export interface GCSUploadOptions {
  folderType?: ImageFolderType;
  userId?: string;
  userEmail?: string;
  projectId?: string;
  customFolder?: string;
  customFileName?: string;
  generateThumbnail?: boolean;
}

@Injectable()
export class GCSConnector {
  private readonly logger = new Logger(GCSConnector.name);
  private readonly storage: Storage;
  private readonly bucketName: string;
  private readonly configured: boolean;

  constructor(private readonly apiKeysConfig: ApiKeysConfig) {
    this.storage = new Storage({
      projectId: this.apiKeysConfig.gcpProjectId,
      credentials: {
        type: 'service_account',
        project_id: this.apiKeysConfig.gcpProjectId,
        private_key_id: this.apiKeysConfig.gcpPrivateKeyId,
        private_key: this.apiKeysConfig.gcpPrivateKey?.replace(/\\n/g, '\n'),
        client_email: this.apiKeysConfig.gcpClientEmail,
        client_id: this.apiKeysConfig.gcpClientId,
      },
    });
    this.bucketName = this.apiKeysConfig.gcsBucketName;
    this.configured = isEnvValueSet(this.bucketName);

    if (!this.configured) {
      this.logger.warn(
        'BOBBY_GCS_BUCKET_NAME is not configured. Upload operations will be bypassed in local mode.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.configured;
  }

  async uploadImage(imageBuffer: Buffer, options: GCSUploadOptions = {}): Promise<ProcessingResult<GCSUploadResult>> {
    try {
      // Parallel buffer conversion: Generate main webp image and thumbnail webp in parallel
      this.logger.log(`Starting parallel buffer conversion for image processing`);

      const { webpBuffer, thumbnailBuffer } = await ImageUtils.parallelWebPConversion(imageBuffer, {
        generateThumbnail: options.generateThumbnail,
        thumbnailWidth: 500,
        thumbnailQuality: 80,
        mainQuality: 90,
      });

      const fileName = this.generateFileNameWithExt(options, 'webp');
      const bucket = this.storage.bucket(this.bucketName);

      this.logger.log(`Starting parallel uploads for image: ${fileName}`);

      // Parallel uploads: Upload main image and thumbnail concurrently
      const uploadPromises: Promise<unknown>[] = [];

      // Main image upload
      const mainImagePromise = this.uploadSingleImage(bucket, fileName, webpBuffer, options);
      uploadPromises.push(mainImagePromise);

      // Thumbnail upload (if needed)
      let thumbnailPromise: Promise<string | undefined> = Promise.resolve(undefined);
      if (options.generateThumbnail && thumbnailBuffer) {
        const thumbnailFileName = fileName.replace(/\.webp$/, '_thumb.webp');
        thumbnailPromise = this.uploadThumbnailImage(bucket, thumbnailFileName, thumbnailBuffer).catch((error) => {
          // Log thumbnail upload errors as warnings but don't fail the operation
          this.logger.warn(`Thumbnail upload failed for ${thumbnailFileName}: ${error.message}`);
          return undefined;
        });
        uploadPromises.push(thumbnailPromise);
      }

      // Wait for both uploads to complete
      const [mainUploadResult, thumbnailUrl] = await Promise.all([mainImagePromise, thumbnailPromise]);

      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;

      const result: GCSUploadResult = {
        key: fileName,
        location: publicUrl,
        eTag: mainUploadResult.etag || '',
        bucket: this.bucketName,
        thumbnail: thumbnailUrl,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to upload image to GCS: ${error.message}`);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Upload a raw buffer to GCS at a specified path/filename.
   * Returns a simplified GCSUploadResult (key, location, eTag, bucket).
   */
  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType = 'image/jpeg',
    options: GCSUploadOptions = {}
  ): Promise<GCSUploadResult> {
    const fileName = options.customFileName || originalName;
    const fullPath = fileName; // assume caller provides proper folder prefix when needed

    const bucket = this.storage.bucket(this.bucketName);
    const fileObject = bucket.file(fullPath);

    await fileObject.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          userId: options.userId,
          uploadedAt: new Date().toISOString(),
          generatedBy: 'bobby-worker',
        },
      },
    });

    const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fullPath}`;

    return {
      key: fullPath,
      location: publicUrl,
      eTag: fileObject.metadata?.etag || '',
      bucket: this.bucketName,
    };
  }

  async downloadImage(imagePath: string): Promise<ProcessingResult<Buffer>> {
    try {
      this.logger.log(`Downloading image from GCS: ${imagePath}`);

      const bucket = this.storage.bucket(this.bucketName);
      const normalizedPath = this.extractGcsPath(imagePath, this.bucketName);
      const file = bucket.file(normalizedPath);

      const [buffer] = await file.download();

      return {
        success: true,
        data: buffer,
      };
    } catch (error) {
      this.logger.error(`Failed to download image from GCS: ${error.message}`);

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async deleteImage(imagePath: string): Promise<ProcessingResult<void>> {
    try {
      this.logger.log(`Deleting image from GCS: ${imagePath}`);

      const bucket = this.storage.bucket(this.bucketName);
      const normalizedPath = this.extractGcsPath(imagePath, this.bucketName);
      const file = bucket.file(normalizedPath);

      await file.delete();

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to delete image from GCS: ${error.message}`);

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private generateFileNameWithExt(options: GCSUploadOptions, ext: string): string {
    if (options.customFileName) {
      return options.customFileName;
    }
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}_${randomId}.${ext}`;
    if (options.customFolder) {
      return `${options.customFolder}/${fileName}`;
    }

    if (options.folderType) {
      let folderPath = options.folderType as string;
      if (folderPath.includes('{userId}') && options.userId) {
        folderPath = folderPath.replace('{userId}', options.userId);
      }
      return `${folderPath}/${fileName}`;
    }
    return `generated/${fileName}`;
  }

  /**
   * Uploads a single image to GCS bucket
   */
  private async uploadSingleImage(
    bucket: Bucket,
    fileName: string,
    buffer: Buffer,
    options: GCSUploadOptions
  ): Promise<{ etag?: string }> {
    const file = bucket.file(fileName);

    await file.save(buffer, {
      metadata: {
        contentType: 'image/webp',
        metadata: {
          userId: options.userId,
          uploadedAt: new Date().toISOString(),
          generatedBy: 'bobby-worker',
        },
      },
    });

    return {
      etag: file.metadata?.etag || '',
    };
  }

  /**
   * Uploads a thumbnail image to GCS bucket
   */
  private async uploadThumbnailImage(bucket: Bucket, thumbnailFileName: string, thumbnailBuffer: Buffer): Promise<string> {
    const thumbnailFile = bucket.file(thumbnailFileName);

    await thumbnailFile.save(thumbnailBuffer, {
      metadata: {
        contentType: 'image/webp',
        metadata: {
          isThumbnail: 'true',
          uploadedAt: new Date().toISOString(),
          generatedBy: 'bobby-worker',
        },
      },
    });

    return `https://storage.googleapis.com/${this.bucketName}/${thumbnailFileName}`;
  }

  private extractGcsPath(imageUrl: string, bucketName: string): string {
    try {
      const url = new URL(imageUrl);
      const path = url.pathname;

      const normalized = path.replace(new RegExp(`^/?${bucketName}/`), '');
      return decodeURIComponent(normalized);
    } catch {
      // If URL parsing fails, try to extract path directly and decode
      try {
        const bucketPrefix = `https://storage.googleapis.com/${bucketName}/`;
        if (imageUrl.startsWith(bucketPrefix)) {
          const pathPart = imageUrl.substring(bucketPrefix.length);
          return decodeURIComponent(pathPart);
        }
      } catch {
        // Fall back to original string if decoding fails
      }
      return imageUrl;
    }
  }
}
