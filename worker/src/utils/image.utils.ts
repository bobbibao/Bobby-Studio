import * as sharp from 'sharp';

export class ImageUtils {
  static validateAspectRatio(aspectRatio: string): boolean {
    const validAspectRatios = ['21:9', '16:9', '3:2', '4:3', '1:1', '3:4', '2:3', '9:16', '9:21'];

    return validAspectRatios.includes(aspectRatio);
  }

  static parseImageSize(imageSize: string): { width: number; height: number } {
    const [width, height] = imageSize.split(':').map(Number);

    if (!width || !height || width <= 0 || height <= 0) {
      throw new Error(`Invalid image size format: ${imageSize}`);
    }

    return { width, height };
  }

  static calculateAspectRatio(width: number, height: number): string {
    const gcd = this.greatestCommonDivisor(width, height);
    const ratioWidth = width / gcd;
    const ratioHeight = height / gcd;

    return `${ratioWidth}:${ratioHeight}`;
  }

  /**
   * Parallel WebP conversion with thumbnail generation
   * @param imageBuffer Original image buffer
   * @param options Configuration options for processing
   * @returns Promise resolving to both main and thumbnail buffers
   */
  static async parallelWebPConversion(
    imageBuffer: Buffer,
    options: {
      generateThumbnail?: boolean;
      thumbnailWidth?: number;
      thumbnailQuality?: number;
      mainQuality?: number;
    } = {}
  ): Promise<{ webpBuffer: Buffer; thumbnailBuffer?: Buffer }> {
    const { generateThumbnail = true, thumbnailWidth = 500, thumbnailQuality = 80, mainQuality = 90 } = options;

    const [webpBuffer, thumbnailBuffer] = await Promise.all([
      sharp(imageBuffer).webp({ quality: mainQuality }).toBuffer(),
      generateThumbnail
        ? sharp(imageBuffer).resize({ width: thumbnailWidth }).webp({ quality: thumbnailQuality }).toBuffer()
        : Promise.resolve(undefined),
    ]);

    return {
      webpBuffer,
      thumbnailBuffer,
    };
  }

  static resizeToFit(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let newWidth = originalWidth;
    let newHeight = originalHeight;

    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspectRatio;
    }

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight),
    };
  }

  static validateImageFormat(mimeType: string): boolean {
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    return supportedFormats.includes(mimeType.toLowerCase());
  }

  static getImageExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };

    return extensions[mimeType.toLowerCase()] || 'jpg';
  }

  static generateImageFileName(userId: string, method: string, extension = 'jpg'): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const methodSlug = method.toLowerCase().replace(/[^a-z0-9]/g, '-');

    return `${userId}_${methodSlug}_${timestamp}_${randomId}.${extension}`;
  }

  static estimateImageFileSize(width: number, height: number, quality = 0.8): number {
    // Rough estimation for JPEG file size in bytes
    const pixelCount = width * height;
    const baseSize = pixelCount * 3; // 3 bytes per pixel for RGB
    const compressionRatio = quality * 0.3; // JPEG compression

    return Math.round(baseSize * compressionRatio);
  }

  static validateImageBuffer(buffer: Buffer): { isValid: boolean; mimeType?: string } {
    if (!buffer || buffer.length === 0) {
      return { isValid: false };
    }

    // Check for JPEG signature
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      return { isValid: true, mimeType: 'image/jpeg' };
    }

    // Check for PNG signature
    if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return { isValid: true, mimeType: 'image/png' };
    }

    // Check for WebP signature
    if (buffer.slice(0, 4).equals(Buffer.from('RIFF', 'ascii')) && buffer.slice(8, 12).equals(Buffer.from('WEBP', 'ascii'))) {
      return { isValid: true, mimeType: 'image/webp' };
    }

    return { isValid: false };
  }

  static cropToSquare(width: number, height: number): { x: number; y: number; size: number } {
    const size = Math.min(width, height);
    const x = Math.floor((width - size) / 2);
    const y = Math.floor((height - size) / 2);

    return { x, y, size };
  }

  static calculateScaleFactor(fromWidth: number, fromHeight: number, toWidth: number, toHeight: number): number {
    const scaleX = toWidth / fromWidth;
    const scaleY = toHeight / fromHeight;

    return Math.min(scaleX, scaleY);
  }

  static normalizePromptStrength(value: number): number {
    return Math.max(0, Math.min(1, Math.round(value / 10) / 10));
  }

  /**
   * Apply a simple text watermark to an image buffer using SVG overlay.
   * Returns a new buffer with the watermark composited.
   */
  static async applyWatermark(
    imageBuffer: Buffer,
    options: {
      opacity?: number; // 0..1
      fontSize?: number; // px
      margin?: number; // px from edges
    } = {},
  ): Promise<Buffer> {
    const {
      opacity = 0.95,
      fontSize = 30,
      margin = 24,
    } = options;

    const meta = await sharp(imageBuffer).metadata();
    const width = meta.width || 1024;
    const height = meta.height || 1024;
    const lines = [
      'Preview only. Commercial use unlocked with a Bobby subscription.',
      'Vorschauversion. Kommerzielle Nutzung mit einem Bobby-Abonnement freigeschaltet.'
    ];

    const availableWidth = Math.max(1, width - margin * 2);

    // Approximate average character width relative to font-size. Tweak if needed.
    const avgCharWidthFactor = 0.6;
    const longestLineLength = Math.max(...lines.map((l) => l.length));

    const estimatedTextWidthAtDefault = longestLineLength * fontSize * avgCharWidthFactor;
    let scale = 1;
    if (estimatedTextWidthAtDefault > availableWidth) {
      scale = availableWidth / estimatedTextWidthAtDefault;
    }

    const minFontSize = 10;
    const fontSizeScaled = Math.max(minFontSize, Math.floor(fontSize * scale));

    // Stroke width scales with font size to keep contrast
    const strokeWidth = Math.max(1, Math.round(fontSizeScaled / 15));

    // Render multi-line bottom-centered watermark using <tspan>
    const centerX = Math.floor(width / 2);

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .watermark {
              font-family: Arial, Helvetica, sans-serif;
              font-weight: 600;
              font-size: ${fontSizeScaled}px;
            }
          </style>
        </defs>
        <text x="${centerX}" y="${height - margin}" class="watermark" text-anchor="middle" dominant-baseline="text-after-edge">
          <tspan
            x="${centerX}"
            dy="0"
            fill="rgba(255, 255, 255, ${Math.min(1, opacity)})"
            stroke="rgba(0, 0, 0, ${Math.min(0.7, opacity + 0.2)})"
            stroke-width="${strokeWidth}"
            stroke-linejoin="round"
            stroke-linecap="round"
            paint-order="stroke fill"
          >${lines[0]}</tspan>
          <tspan
            x="${centerX}"
            dy="-1.05em"
            fill="rgba(255, 255, 255, ${Math.min(1, opacity)})"
            stroke="rgba(0, 0, 0, ${Math.min(0.7, opacity + 0.2)})"
            stroke-width="${strokeWidth}"
            stroke-linejoin="round"
            stroke-linecap="round"
            paint-order="stroke fill"
          >${lines[1]}</tspan>
        </text>
      </svg>
    `;

    const svgBuffer = Buffer.from(svg);

    const out = await sharp(imageBuffer)
      .composite([
        {
          input: svgBuffer,
          top: 0,
          left: 0,
        },
      ])
      .toBuffer();

    return out;
  }

  private static greatestCommonDivisor(a: number, b: number): number {
    return b === 0 ? a : this.greatestCommonDivisor(b, a % b);
  }
}
