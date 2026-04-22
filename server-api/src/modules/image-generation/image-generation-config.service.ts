import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ImageGenerationConfigService {
  readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>(
      'IMAGE_GENERATION_WEBHOOK_SECRET',
      '',
    );
  }

  getWebhookSecret(): string {
    return this.webhookSecret;
  }
}
