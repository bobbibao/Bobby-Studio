import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** Bounded multipart image uploads: size, file count and declared type are enforced before buffering. */
export const imageUploadOptions: MulterOptions = {
  limits: { fileSize: MAX_IMAGE_UPLOAD_BYTES, files: 10, fields: 10, parts: 20 },
  fileFilter: (_request, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      callback(new BadRequestException('Only PNG, JPEG and WebP images are accepted'), false);
      return;
    }
    callback(null, true);
  },
};
