import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeysConfig {
  constructor(private configService: ConfigService) {}

  get gcpProjectId(): string {
    return this.configService.get<string>('BOBBY_GCP_PROJECT_ID', '');
  }

  get gcsBucketName(): string {
    return this.configService.get<string>('BOBBY_GCS_BUCKET_NAME', '');
  }

  get gcpPrivateKeyId(): string {
    return this.configService.get<string>('BOBBY_GCP_PRIVATE_KEY_ID', '');
  }

  get gcpPrivateKey(): string {
    return this.configService.get<string>('BOBBY_GCP_PRIVATE_KEY', '');
  }

  get gcpClientId(): string {
    return this.configService.get<string>('BOBBY_GCP_CLIENT_ID', '');
  }

  get gcpClientEmail(): string {
    return this.configService.get<string>('BOBBY_GCP_CLIENT_EMAIL', '');
  }

  get webhookUrl(): string {
    return this.configService.get<string>('IMAGE_GENERATION_WEBHOOK_URL', '');
  }

  get webhookSecret(): string {
    return this.configService.get<string>('IMAGE_GENERATION_WEBHOOK_SECRET', '');
  }

  get editWebhookUrl(): string {
    return this.configService.get<string>('IMAGE_EDIT_WEBHOOK_URL', '');
  }

  get editWebhookSecret(): string {
    return this.configService.get<string>('IMAGE_EDIT_WEBHOOK_SECRET', '');
  }

  get pythonModelBaseUrl(): string {
    return this.configService.get<string>('BOBBY_AI_API_URL', 'https://genimageapi.dpdns.org');
  }

  get pythonModelTimeout(): number {
    return this.configService.get<number>('BOBBY_AI_TIMEOUT', 1800000);
  }

  get pythonModelForce(): boolean {
    const raw = this.configService.get<string>('BOBBY_AI_FORCE', 'true');
    return String(raw).toLowerCase() === 'true';
  }

  get databaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL', '');
  }

  get environment(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get isDevelopment(): boolean {
    return this.environment === 'development';
  }

  get isProduction(): boolean {
    return this.environment === 'production';
  }

  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', this.isDevelopment ? 'debug' : 'info');
  }
}
