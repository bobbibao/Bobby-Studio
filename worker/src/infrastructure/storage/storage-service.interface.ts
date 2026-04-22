import { ProcessingResult } from '@/shared/interfaces/api-response.interface';

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface IStorageService {
  isUploadConfigured(): boolean;
  getImageBuffer(source: string): Promise<ProcessingResult<Buffer>>;
  downloadSourceImage(imagePath: string): Promise<ProcessingResult<Buffer>>;
  uploadBufferToGcs(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    options?: Record<string, unknown>,
  ): Promise<any>;
  deleteTemporaryInputImages(params?: any): Promise<void>;
}
