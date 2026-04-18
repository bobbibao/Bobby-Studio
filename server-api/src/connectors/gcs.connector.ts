import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import { ImageUtils, ImageResizeOptions } from '../utils/image.utils';

export interface GCSUploadResult {
  Key: string;
  Location: string;
  ETag: string;
  Bucket: string;
}

export enum ImageFolderType {
  USER_GENERATED = 'images/users/{userId}',
}

export interface GCSUploadOptions {
  folderType?: ImageFolderType;
  userId?: string;
  projectId?: string;
  customFolder?: string;
  customFileName?: string;
  resizeImage?: boolean;
  resizeOptions?: ImageResizeOptions;
}

@Injectable()
export class GCSConnector {
  private storage: Storage;
  private bucketName: string;
  private readonly logger = new Logger(GCSConnector.name);

  constructor(private readonly configService: ConfigService) {
    this.storage = new Storage({
      projectId: this.configService.get<string>('BOBBY_GCP_PROJECT_ID'),
      credentials: {
        type: 'service_account',
        project_id: this.configService.get<string>('BOBBY_GCP_PROJECT_ID'),
        private_key_id: this.configService.get<string>(
          'BOBBY_GCP_PRIVATE_KEY_ID',
        ),
        private_key: this.configService
          .get<string>('BOBBY_GCP_PRIVATE_KEY')
          ?.replace(/\\n/g, '\n'),
        client_email: this.configService.get<string>('BOBBY_GCP_CLIENT_EMAIL'),
        client_id: this.configService.get<string>('BOBBY_GCP_CLIENT_ID'),
        // auth_uri: this.configService.get<string>('BOBBY_GCP_AUTH_URI'),
        // token_uri: this.configService.get<string>('BOBBY_GCP_TOKEN_URI'),
        // auth_provider_x509_cert_url: this.configService.get<string>('BOBBY_GCP_AUTH_PROVIDER_X509_CERT_URL'),
        // client_x509_cert_url: this.configService.get<string>('BOBBY_GCP_CLIENT_X509_CERT_URL'),
        // universe_domain: this.configService.get<string>('BOBBY_GCP_UNIVERSE_DOMAIN')
      },
    });
    this.bucketName = this.configService.get<string>('BOBBY_GCS_BUCKET_NAME');
  }

  private buildImagePath(options: GCSUploadOptions = {}): string {
    if (options.customFolder) {
      return options.customFolder.endsWith('/')
        ? options.customFolder
        : `${options.customFolder}/`;
    }
    if (options.folderType) {
      let folderPath: string = options.folderType;

      // Replace userId placeholder if provided
      if (options.userId) {
        folderPath = folderPath.replace('{userId}', options.userId);
      }

      return folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    }

    return 'images/misc/'; // Default folder
  }

  private async ensureFolderExists(folderPath: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const normalizedPath = folderPath.endsWith('/')
        ? folderPath
        : `${folderPath}/`;

      // Check if folder exists by trying to list files with the prefix
      const [files] = await bucket.getFiles({
        prefix: normalizedPath,
        maxResults: 1,
      });

      // If no files found with this prefix, create the folder
      if (files.length === 0) {
        console.log(`Folder created: ${normalizedPath}`);
      }
    } catch (error) {
      console.error('Error ensuring folder exists:', error);
      // Don't throw here, let the upload continue
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const normalizedPath = folderPath.endsWith('/')
        ? folderPath
        : `${folderPath}/`;
    } catch (error) {
      console.error('Error creating folder in GCS:', error);
      throw new Error('Folder creation in GCS failed');
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    options: GCSUploadOptions = {},
  ): Promise<GCSUploadResult> {
    try {
      let bufferToUpload = file.buffer;
      let mimeTypeToUse = file.mimetype;
      let fileNameToUse =
        options.customFileName || `${Date.now()}-${file.originalname}`;

      // Apply image resizing if enabled
      if (options.resizeImage) {
        const resizeResult = await ImageUtils.resizeUploadedImage(
          file.buffer,
          file.mimetype,
          options.resizeOptions,
        );
        bufferToUpload = resizeResult.buffer;
        mimeTypeToUse = ImageUtils.formatToMimeType(
          resizeResult.metadata.format,
        );

        // Update filename to reflect new format if it changed
        const extension = ImageUtils.mimeTypeToFormat(mimeTypeToUse);
        const originalNameWithoutExt = file.originalname.split('.')[0];
        fileNameToUse =
          options.customFileName ||
          `${Date.now()}-${originalNameWithoutExt}.${extension}`;
      }

      const folderPath = this.buildImagePath(options);

      // Ensure the folder exists before uploading
      await this.ensureFolderExists(folderPath);

      const fullPath = `${folderPath}${fileNameToUse}`;

      const bucket = this.storage.bucket(this.bucketName);
      const fileObject = bucket.file(fullPath);

      const stream = fileObject.createWriteStream({
        metadata: {
          contentType: mimeTypeToUse,
        },
        resumable: false,
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          console.error('Error uploading file to GCS:', error);
          reject(new Error('File upload to GCS failed'));
        });

        stream.on('finish', () => {
          const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fullPath}`;
          resolve({
            Key: fullPath,
            Location: publicUrl,
            ETag: '"mockETag"',
            Bucket: this.bucketName,
          });
        });

        stream.end(bufferToUpload);
      });
    } catch (error) {
      this.logger.error(`Error uploading file to GCS: ${error.message}`);
      throw new Error('File upload to GCS failed');
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType = 'image/jpeg',
    options: GCSUploadOptions = {},
  ): Promise<GCSUploadResult> {
    try {
      const folderPath = this.buildImagePath(options);

      // Ensure the folder exists before uploading
      await this.ensureFolderExists(folderPath);

      const fileName =
        options.customFileName || `${Date.now()}-${originalName}`;
      const fullPath = `${folderPath}${fileName}`;

      const bucket = this.storage.bucket(this.bucketName);
      const fileObject = bucket.file(fullPath);

      const stream = fileObject.createWriteStream({
        metadata: {
          contentType: mimeType,
        },
        resumable: false,
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          console.error('Error uploading buffer to GCS:', error);
          reject(new Error('Buffer upload to GCS failed'));
        });

        stream.on('finish', () => {
          const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fullPath}`;
          resolve({
            Key: fullPath,
            Location: publicUrl,
            ETag: '"mockETag"',
            Bucket: this.bucketName,
          });
        });

        stream.end(buffer);
      });
    } catch (error) {
      console.error('Error uploading buffer to GCS:', error);
      throw new Error('Buffer upload to GCS failed');
    }
  }

  async downloadFile(filePath: string): Promise<string> {
    try {
      let fileName: string = filePath;

      if (filePath.includes('storage.googleapis.com')) {
        fileName = this.extractGcsFilePath(filePath);
      }

      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const [fileBuffer] = await file.download();
      return fileBuffer.toString('base64');
    } catch (error) {
      console.error('Error downloading file from GCS:', error);
      throw new Error('File download from GCS failed');
    }
  }

  async listFilesInFolder(folderPath: string): Promise<string[]> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const normalizedPath = folderPath.endsWith('/')
        ? folderPath
        : `${folderPath}/`;

      const [files] = await bucket.getFiles({
        prefix: normalizedPath,
      });

      return files.map((file) => file.name);
    } catch (error) {
      console.error('Error listing files in folder:', error);
      throw new Error('Failed to list files in folder');
    }
  }

  async deleteFolder(folderPath: string): Promise<void> {
    try {
      const files = await this.listFilesInFolder(folderPath);
      const bucket = this.storage.bucket(this.bucketName);

      const deletePromises = files.map((fileName) =>
        bucket.file(fileName).delete(),
      );
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw new Error('Failed to delete folder');
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      let fileName: string = filePath;

      if (filePath.includes('storage.googleapis.com')) {
        fileName = this.extractGcsFilePath(filePath);
      }

      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      // Check if file exists before attempting to delete
      const [exists] = await file.exists();
      if (!exists) {
        console.warn(`File not found in GCS: ${fileName}`);
        return false;
      }

      await file.delete();
      return true;
    } catch (error) {
      console.error('Error deleting file from GCS:', error);
      throw new Error('File deletion from GCS failed');
    }
  }

  getFileStream(filePath: string): NodeJS.ReadableStream {
    const bucket = this.storage.bucket(this.bucketName);
    let fileName: string = filePath;

    if (filePath.includes('storage.googleapis.com')) {
      fileName = this.extractGcsFilePath(filePath);
    }

    const file = bucket.file(fileName);
    const stream = file.createReadStream({
      validation: false,
      decompress: false,
    });

    process.nextTick(() => {
      stream.on('error', (err) => {
        this.logger.error(`Error reading file from GCS: ${err.message}`);
        stream.destroy(err);
      });
    });

    return stream;
  }

  private extractGcsFilePath(url: string): string {
    const urlParts = url.split(`storage.googleapis.com/${this.bucketName}/`);
    return urlParts.length > 1 ? urlParts[1] : url.split('/').pop();
  }
}
