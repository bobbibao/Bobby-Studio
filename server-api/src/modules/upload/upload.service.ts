import { Injectable } from '@nestjs/common';
import { GCSConnector, GCSUploadResult, GCSUploadOptions } from '../../connectors/gcs.connector';
import { ConfigService } from '@nestjs/config';

@Injectable()
export default class UploadService {
  private gcsConnector: GCSConnector;

  constructor(private readonly configService: ConfigService) {
    this.gcsConnector = new GCSConnector(this.configService);
  }

  async uploadFileToGCS(file: Express.Multer.File, options: GCSUploadOptions | string): Promise<string> {
    try {
      // Handle backward compatibility - if string is passed, convert to options
      const uploadOptions: GCSUploadOptions = typeof options === 'string' 
        ? { customFolder: options }
        : options;

      const result: GCSUploadResult = await this.gcsConnector.uploadFile(file, uploadOptions);
      return result.Location;
    } catch (error) {
      console.error('GCS upload error:', error);
      throw new Error('Failed to upload file to GCS');
    }
  }

  async uploadBase64ToGCS(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    options: GCSUploadOptions | string
  ): Promise<string> {
    try {
      // Handle backward compatibility - if string is passed, convert to options
      const uploadOptions: GCSUploadOptions = typeof options === 'string' 
        ? { customFolder: options }
        : options;

      const result: GCSUploadResult = await this.gcsConnector.uploadBuffer(buffer, fileName, mimeType, uploadOptions);
      return result.Location;
    } catch (error) {
      console.error('GCS upload error:', error);
      throw new Error('Failed to upload base64 file to GCS');
    }
  }
}

