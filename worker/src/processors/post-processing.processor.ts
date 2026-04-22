import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import { ImageUtils } from '../utils/image.utils';
import { StorageService } from '../services/storage.service';
import { RedisService } from '../services/redis.service';
import { PostProcessingJobData, ImageGenerationJobResult } from '../shared/interfaces/image-generation.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PostProcessingProcessor {
  private readonly logger = new Logger(PostProcessingProcessor.name);
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  constructor(private readonly storageService: StorageService, private readonly redisService: RedisService) {}

  async processImagePostProcessing(jobData: PostProcessingJobData): Promise<ImageGenerationJobResult> {
    const { jobId, userId, userEmail, imageUrl } = jobData;
    // Determine if this is an edit job or generation job
    const isEditJob = !!jobData.editImageParams;
    try {
      this.logger.log(`Starting post-processing for job ${jobId} (user=${userId})`);

      // 1. Download image buffer
      const downloaded = await this.storageService.getImageBuffer(imageUrl);
      if (!downloaded.success || !downloaded.data) {
        throw new Error('Failed to download generated image');
      }
      const buffer = downloaded.data;

      // Generate identifiers early
      const attributeId = this.generateUUID();
      const version = this.generateUUID();
      const timestamp = Date.now();
      const fileName = `${timestamp}_${attributeId}.webp`;
      const thumbnailFileName = `${timestamp}_${attributeId}_thumb.webp`;

      // Download image and start parallel processing pipeline
      this.logger.log(`Downloading and processing image...`);
      const imageBuffer = buffer; // already downloaded above

      // Extract metadata and preserve the original full-resolution buffer (no conversion)
      const imageMetadata = await sharp(imageBuffer).metadata();
      const { width, height, format } = imageMetadata || { width: undefined, height: undefined, format: undefined };

      // Force output to PNG for both full-resolution and thumbnail
      const ext = 'png';
      const mapFormatToMime = (_fmt?: string) => 'image/png';

      // Decide whether we should watermark (server may set flag in multiple places)
      const shouldWatermarkFlag = Boolean(
        (jobData as any).shouldWatermark ||
          jobData.generateImageParams?.shouldWatermark ||
          jobData.editImageParams?.shouldWatermark
      );

      const originalBuffer = imageBuffer; // preserve original
      let processedBuffer = originalBuffer;

      // placeholders for upload results
      let originalUploadResult: any = null;
      let originalThumbnailUploadResult: any = null;
      let uploadResult: any = null;
      let thumbnailUploadResult: any = null;
      const canUploadToGcs = this.storageService.isUploadConfigured();

      if (canUploadToGcs) {
        if (shouldWatermarkFlag) {
          // Try to apply watermark; if it fails, fall back to original but still upload original artifact
          try {
            processedBuffer = await ImageUtils.applyWatermark(originalBuffer);
          } catch (wmErr) {
            this.logger.warn(
              `Watermarking failed for job ${jobId}: ${wmErr.message}. Falling back to original image for processed artifact.`
            );
            processedBuffer = originalBuffer;
          }

          // Prepare buffers
          const finalProcessedBuf = await sharp(processedBuffer).toFormat('png').toBuffer();
          const processedThumbnailBuf = await sharp(processedBuffer).resize({ width: 500 }).toFormat('png').toBuffer();

          // Original artifact: keep original format
          const originalExt = format || 'bin';
          const originalBufThumbnail = await sharp(originalBuffer).resize({ width: 500 }).toFormat('png').toBuffer();

          // Filenames
          const resolvedProcessedFileName = `${timestamp}_${attributeId}.${ext}`;
          const resolvedProcessedThumb = `${timestamp}_${attributeId}_thumb.${ext}`;
          const resolvedOriginalFileName = `${timestamp}_${attributeId}_original.${originalExt}`;
          const resolvedOriginalThumb = `${timestamp}_${attributeId}_original_thumb.${ext}`;

          this.logger.log(`Uploading original + processed image + thumbnails to GCS in parallel...`);
          const results = await Promise.all([
            // original
            this.storageService.uploadBufferToGcs(
              originalBuffer,
              `images/users/${userId}/${resolvedOriginalFileName}`,
              mapFormatToMime(format),
              {
                userId,
                customFileName: `images/users/${userId}/${resolvedOriginalFileName}`,
              }
            ),
            // original thumbnail
            this.storageService.uploadBufferToGcs(
              originalBufThumbnail,
              `images/users/${userId}/${resolvedOriginalThumb}`,
              mapFormatToMime('png'),
              {
                userId,
                customFileName: `images/users/${userId}/${resolvedOriginalThumb}`,
              }
            ),
            // processed (watermarked) full
            this.storageService.uploadBufferToGcs(
              finalProcessedBuf,
              `images/users/${userId}/${resolvedProcessedFileName}`,
              mapFormatToMime('png'),
              {
                userId,
                customFileName: `images/users/${userId}/${resolvedProcessedFileName}`,
              }
            ),
            // processed thumbnail
            this.storageService.uploadBufferToGcs(
              processedThumbnailBuf,
              `images/users/${userId}/${resolvedProcessedThumb}`,
              mapFormatToMime('png'),
              {
                userId,
                customFileName: `images/users/${userId}/${resolvedProcessedThumb}`,
              }
            ),
          ]);

          originalUploadResult = results[0];
          originalThumbnailUploadResult = results[1];
          uploadResult = results[2];
          thumbnailUploadResult = results[3];
        } else {
          // No watermark: upload only the processed (which is the original) image and thumbnail
          const finalBuf = await sharp(processedBuffer).toFormat('png').toBuffer();
          const thumbBuf = await sharp(processedBuffer).resize({ width: 500 }).toFormat('png').toBuffer();

          const resolvedFileName = `${timestamp}_${attributeId}.${ext}`;
          const resolvedThumbnailFileName = `${timestamp}_${attributeId}_thumb.${ext}`;

          this.logger.log(`Uploading processed image + thumbnail to GCS in parallel...`);
          const results = await Promise.all([
            this.storageService.uploadBufferToGcs(
              finalBuf,
              `images/users/${userId}/${resolvedFileName}`,
              mapFormatToMime('png'),
              {
                userId,
                customFileName: `images/users/${userId}/${resolvedFileName}`,
              }
            ),
            this.storageService.uploadBufferToGcs(
              thumbBuf,
              `images/users/${userId}/${resolvedThumbnailFileName}`,
              mapFormatToMime('png'),
              {
                userId,
                customFileName: `images/users/${userId}/${resolvedThumbnailFileName}`,
              }
            ),
          ]);

          uploadResult = results[0];
          thumbnailUploadResult = results[1];
        }
      } else {
        if (shouldWatermarkFlag) {
          this.logger.warn(
            `Watermark requested for job ${jobId}, but GCS is not configured. Applying watermark locally.`
          );
          processedBuffer = await ImageUtils.applyWatermark(originalBuffer);
        }

        // Save images locally
        const uploadsDir = path.join(__dirname, '..', '..', '..', 'server-api', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const localFileName = `${timestamp}_${attributeId}.png`;
        const localThumbnailFileName = `${timestamp}_${attributeId}_thumb.png`;
        const localFilePath = path.join(uploadsDir, localFileName);
        const localThumbnailPath = path.join(uploadsDir, localThumbnailFileName);

        // Save full image
        await fs.promises.writeFile(localFilePath, processedBuffer);
        this.logger.log(`Saved image locally: ${localFilePath}`);
        if (fs.existsSync(localFilePath)) {
          this.logger.log(`✅ Image file exists: ${localFilePath}`);
        } else {
          this.logger.error(`❌ Image file not found after save: ${localFilePath}`);
        }

        // Save thumbnail
        const thumbnailBuffer = await sharp(processedBuffer).resize({ width: 500 }).png().toBuffer();
        await fs.promises.writeFile(localThumbnailPath, thumbnailBuffer);
        this.logger.log(`Saved thumbnail locally: ${localThumbnailPath}`);
        if (fs.existsSync(localThumbnailPath)) {
          this.logger.log(`✅ Thumbnail file exists: ${localThumbnailPath}`);
        } else {
          this.logger.error(`❌ Thumbnail file not found after save: ${localThumbnailPath}`);
        }

        // Construct local URLs
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        uploadResult = {
          location: `${baseUrl}/uploads/${localFileName}`,
          eTag: '',
          bucket: 'local',
        };
        thumbnailUploadResult = {
          location: `${baseUrl}/uploads/${localThumbnailFileName}`,
        };
      }

      // Create the job result structure (support both generation and editing)
      const params = isEditJob ? jobData.editImageParams : jobData.generateImageParams;

      // Extract generation metadata from params.data
      const generationData = params?.data || {};
      const creationType = generationData.creationType;
      const inputType = generationData.inputType;
      const selectedStyle = generationData.selectedStyle;
      const prompt = generationData.prompt || generationData.enhancedPrompt || '';

      const jobResult = {
        jobId,
        requestId: jobData.requestId, // Pass through requestId for batch grouping
        attributeId,
        version,
        // Support both generateImageParams and editImageParams
        ...(isEditJob
          ? {
              editImageParams: {
                userId: userId,
                userEmail: userEmail,
                method: params?.method || 'OBJECT_REMOVAL',
                data: params?.data || {},
                projectId: params?.projectId,
                folderId: params?.folderId,
                batchEditId: params?.batchEditId, // Pass batchEditId for grouping related edits
              },
            }
          : {
              generateImageParams: {
                userId: userId,
                userEmail: userEmail,
                method: params?.method || 'BASIC_TEXT_TO_IMAGE',
                data: params?.data || {},
                projectId: params?.projectId,
                folderId: params?.folderId,
              },
            }),
        generatedImage: Object.assign(
          {
            location: uploadResult.location,
            eTag: uploadResult.eTag,
            bucket: uploadResult.bucket,
            key: attributeId,
            thumbnail: thumbnailUploadResult.location,
            dimensions: width && height ? `${width}x${height}` : '',
            creationType,
            inputType,
            selectedStyle,
            prompt,
          },
          shouldWatermarkFlag && originalUploadResult
            ? {
                original: {
                  location: originalUploadResult.location,
                  eTag: originalUploadResult.eTag,
                  bucket: originalUploadResult.bucket,
                  thumbnail: originalThumbnailUploadResult?.location,
                },
              }
            : {}
        ),
        method: jobData.generateImageParams?.method || 'BASIC_TEXT_TO_IMAGE',
        generatedAt: new Date(),
      } as unknown as ImageGenerationJobResult;

      // 4. Update Redis job result to 'ready'
      const finalResult: ImageGenerationJobResult = {
        jobId,
        requestId: jobData.requestId, // Pass through requestId for batch grouping
        attributeId: jobResult.attributeId || jobId,
        version: jobResult.version || version,
        previousImageId: undefined,
        // Support both generateImageParams and editImageParams
        ...(isEditJob
          ? {
              editImageParams: jobData.editImageParams,
            }
          : {
              generateImageParams: jobData.generateImageParams,
            }),
        generatedImage: jobResult.generatedImage as any,
        method: jobData.method as unknown as string,
        credit: jobData.credit || 0,

        shouldWatermark: shouldWatermarkFlag,
        generatedAt: new Date(),
        model: jobData.metadata?.model || jobData.endpoint,
      };

      await this.redisService.setJobResult(jobId, { ...finalResult, status: 'ready' });

      // Clean up temporary input images from GCS (uploaded before queuing)
      await this.storageService.deleteTemporaryInputImages(jobData.editImageParams);

      // Clean up worker-side Redis entries after successful post-processing
      try {
        await this.redisService.cleanupCompletedJob(jobId);
        this.logger.debug(`🧹 Cleaned up worker Redis entries for job ${jobId}`);
      } catch (cleanupError) {
        this.logger.warn(`Failed to cleanup worker Redis entries for job ${jobId}: ${cleanupError.message}`);
      }

      this.logger.log(`Post-processing complete for job ${jobId}`);

      return finalResult;
    } catch (error) {
      this.logger.error(`Post-processing failed for job ${jobId}: ${error.message}`);
      // mark job as failed in redis
      try {
        await this.redisService.setJobResult(jobId, { jobId, status: 'failed', error: error.message });
      } catch (e) {
        this.logger.error(`Failed to mark job ${jobId} failed in redis: ${e.message}`);
      }
      throw error;
    }
  }
}
