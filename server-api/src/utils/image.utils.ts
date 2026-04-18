import * as sharp from 'sharp';
import { Logger } from '@nestjs/common';

export interface ImageResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  maintainAspectRatio?: boolean;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

/**
 * Image utility class for processing and validating images
 * Ensures images are properly sized for AI model processing
 */
export class ImageUtils {
  private static readonly logger = new Logger(ImageUtils.name);

  /**
   * Maximum dimensions for AI model processing
   * Most AI models can handle images up to 4096x4096
   * but optimal range is 512-2048 for most operations
   */
  static readonly MAX_IMAGE_WIDTH = 4096;
  static readonly MAX_IMAGE_HEIGHT = 4096;
  static readonly OPTIMAL_MAX_WIDTH = 2048;
  static readonly OPTIMAL_MAX_HEIGHT = 2048;

  /**
   * Minimum dimensions for AI model processing
   * Most models require at least 64x64 pixels
   */
  static readonly MIN_IMAGE_WIDTH = 64;
  static readonly MIN_IMAGE_HEIGHT = 64;

  /**
   * Resizes an uploaded image to be compatible with AI models
   * Maintains aspect ratio and converts to optimized format
   *
   * @param buffer Image buffer to resize
   * @param originalMimeType Original image MIME type
   * @param options Resize options
   * @returns Promise<{ buffer: Buffer; metadata: ImageMetadata }>
   */
  static async resizeUploadedImage(
    buffer: Buffer,
    originalMimeType: string,
    options: ImageResizeOptions = {},
  ): Promise<{ buffer: Buffer; metadata: ImageMetadata }> {
    try {
      const {
        maxWidth = this.OPTIMAL_MAX_WIDTH,
        maxHeight = this.OPTIMAL_MAX_HEIGHT,
        quality = 90,
        format = 'jpeg',
        maintainAspectRatio = true,
      } = options;

      // Get original image metadata
      const image = sharp(buffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to determine image dimensions');
      }

      this.logger.log(
        `Processing image: ${metadata.width}x${metadata.height} (${metadata.format})`,
      );

      // Calculate new dimensions while maintaining aspect ratio
      let newWidth = metadata.width;
      let newHeight = metadata.height;

      if (maintainAspectRatio) {
        const aspectRatio = metadata.width / metadata.height;

        if (newWidth > maxWidth) {
          newWidth = maxWidth;
          newHeight = Math.round(newWidth / aspectRatio);
        }

        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          newWidth = Math.round(newHeight * aspectRatio);
        }
      } else {
        // Fit within dimensions without maintaining aspect ratio
        newWidth = Math.min(newWidth, maxWidth);
        newHeight = Math.min(newHeight, maxHeight);
      }

      // Ensure minimum dimensions
      newWidth = Math.max(newWidth, this.MIN_IMAGE_WIDTH);
      newHeight = Math.max(newHeight, this.MIN_IMAGE_HEIGHT);

      this.logger.log(
        `Resizing to: ${newWidth}x${newHeight}, format: ${format}, quality: ${quality}`,
      );

      // Apply resize and format conversion
      let resizedImage = image.resize(newWidth, newHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      // Convert to specified format with quality settings
      switch (format) {
        case 'webp':
          resizedImage = resizedImage.webp({ quality });
          break;
        case 'png':
          resizedImage = resizedImage.png({ progressive: true });
          break;
        case 'jpeg':
        default:
          resizedImage = resizedImage.jpeg({ quality, progressive: true });
          break;
      }

      const resizedBuffer = await resizedImage.toBuffer();
      const finalMetadata = await sharp(resizedBuffer).metadata();

      this.logger.log(
        `Image processed successfully: ${finalMetadata.width}x${finalMetadata.height}, size: ${resizedBuffer.length} bytes`,
      );

      return {
        buffer: resizedBuffer,
        metadata: {
          width: finalMetadata.width || newWidth,
          height: finalMetadata.height || newHeight,
          format: format,
          size: resizedBuffer.length,
        },
      };
    } catch (error) {
      this.logger.error(`Error resizing image: ${error.message}`);
      throw new Error(`Image resize failed: ${error.message}`);
    }
  }

  /**
   * Converts MIME type to image format
   *
   * @param mimeType MIME type string
   * @returns 'jpeg' | 'png' | 'webp'
   */
  static mimeTypeToFormat(mimeType: string): 'jpeg' | 'png' | 'webp' {
    const lowerMime = mimeType.toLowerCase();

    if (lowerMime.includes('png')) return 'png';
    if (lowerMime.includes('webp')) return 'webp';
    return 'jpeg'; // Default to JPEG
  }

  /**
   * Gets MIME type for image format
   *
   * @param format Image format
   * @returns MIME type string
   */
  static formatToMimeType(format: string): string {
    const mimeMap: Record<string, string> = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };

    return mimeMap[format.toLowerCase()] || 'image/jpeg';
  }
}
