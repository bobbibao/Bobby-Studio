import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GCSConnector } from 'src/connectors/gcs.connector';
import { AttributeRepository } from '../attribute/attribute.repository';

@Injectable()
export class ImageService {
  constructor(
    private readonly gcsConnector: GCSConnector,
    private readonly attributeRepository: AttributeRepository,
    private readonly logger: Logger = new Logger(ImageService.name),
  ) {}

  async getImageStream(
    imageKey: string,
    thumbnail: boolean,
  ): Promise<NodeJS.ReadableStream> {
    this.logger.log(
      `Fetching image stream for key: ${imageKey}, thumbnail: ${thumbnail}`,
    );

    // exponential backoff to improve resilience against transient DB/transaction delays.
    const maxAttempts = 5;
    let attempt = 0;
    let imagePath: string | null = null;

    while (attempt < maxAttempts && !imagePath) {
      attempt += 1;
      try {
        imagePath = await this.attributeRepository.getImagePath(
          imageKey,
          thumbnail,
        );
        this.logger.log(
          `Fetching image path (attempt ${attempt}): ${imagePath}`,
        );

        if (imagePath) break;

        const delayMs = 200 * Math.pow(2, attempt - 1); // 200, 400, 800, ...
        this.logger.warn(
          `Image path not found for key: ${imageKey}, retrying after ${delayMs}ms (attempt ${attempt})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } catch (err) {
        this.logger.error(
          `Error while fetching image path for key ${imageKey}: ${err?.message || err}`,
        );
        // wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (!imagePath) {
      this.logger.error(
        `Image path not found for key: ${imageKey} after ${maxAttempts} attempts`,
      );
      throw new NotFoundException('Image not found');
    }

    try {
      return this.gcsConnector.getFileStream(imagePath);
    } catch (err) {
      this.logger.error(`Error creating stream: ${err.message}`);
    }
  }
}
