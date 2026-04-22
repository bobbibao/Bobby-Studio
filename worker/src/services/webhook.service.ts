import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Agent as HttpsAgent } from 'https';
import { ApiKeysConfig } from '../config/api-keys.config';
import { WebhookPayload } from '../shared/interfaces/api-response.interface';
import { ImageGenerationJobData, ImageGenerationJobResult } from '../shared/interfaces/image-generation.interface';

export interface WebhookEvent {
  event: 'job.completed' | 'job.failed' | 'job.active' | 'job.progress' | 'job.cancelled' | 'job.waiting';
  data: unknown;
  timestamp: Date;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly apiKeysConfig: ApiKeysConfig) {}

  async notifyJobCompleted(result: ImageGenerationJobResult): Promise<void> {
    // Sanitize the result to remove large fields that can cause 413 errors
    const sanitizedResult = this.sanitizeResultForWebhook(result);

    const payload: WebhookPayload = {
      event: 'job.completed',
      data: sanitizedResult,
    };

    await this.sendWebhook(payload);
  }

  /**
   * Remove large fields from the result object to prevent 413 Payload Too Large errors
   */
  private sanitizeResultForWebhook(result: ImageGenerationJobResult): ImageGenerationJobResult {
    const sanitized = { ...result };

    // If editImageParams exists, remove large fields like mask
    if (sanitized.editImageParams && sanitized.editImageParams.data) {
      sanitized.editImageParams = {
        ...sanitized.editImageParams,
        data: this.sanitizeGenerationData(sanitized.editImageParams.data),
      };

    }

    // Similarly, sanitize generateImageParams if needed
    if (sanitized.generateImageParams && sanitized.generateImageParams.data) {
      sanitized.generateImageParams = {
        ...sanitized.generateImageParams,
        data: this.sanitizeGenerationData(sanitized.generateImageParams.data),
      };
    }

    return sanitized;
  }

  private sanitizeGenerationData(data: Record<string, any>): Record<string, any> {
    const sanitizedData = { ...data };

    for (const key of ['image', 'mask', 'crop', 'input_image', 'control_image', 'sourceImageUrl', 'styleImageUrl']) {
      if (typeof sanitizedData[key] === 'string' && sanitizedData[key].length > 512) {
        sanitizedData[key] = '[omitted-large-image-input]';
      }
    }

    if (sanitizedData.sdxlParams && typeof sanitizedData.sdxlParams === 'object') {
      sanitizedData.sdxlParams = { ...sanitizedData.sdxlParams };
      if (typeof sanitizedData.sdxlParams.image === 'string' && sanitizedData.sdxlParams.image.length > 512) {
        sanitizedData.sdxlParams.image = '[omitted-large-image-input]';
      }
    }

    return sanitizedData;
  }

  async notifyJobFailed(jobId: string, error: unknown): Promise<void> {
    const payload: WebhookPayload = {
      event: 'job.failed',
      data: {
        jobId,
        error: {
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
        },
      },
    };

    await this.sendWebhook(payload);
  }

  async notifyJobCancelled(jobId: string, reason = 'Generation cancelled'): Promise<void> {
    const payload: WebhookPayload = {
      event: 'job.cancelled',
      data: {
        jobId,
        reason,
        timestamp: new Date(),
      },
    };

    await this.sendWebhook(payload);
  }

  async notifyJobActive(job: ImageGenerationJobData): Promise<void> {
    this.logger.log(`Notifying job active: ${job.jobId}`);

    // Sanitize job data to remove large fields
    const sanitizedJob = this.sanitizeJobDataForWebhook(job);

    const payload: WebhookPayload = {
      event: 'job.active',
      data: sanitizedJob,
    };

    await this.sendWebhook(payload);
  }

  async notifyJobProgress(job: ImageGenerationJobData, progress: number): Promise<void> {
    this.logger.log(`Notifying job progress: ${job.jobId} progress: ${progress}%`);

    // Sanitize job data to remove large fields
    const sanitizedJob = this.sanitizeJobDataForWebhook(job);

    const payload: WebhookPayload = {
      event: 'job.progress',
      data: {
        ...sanitizedJob,
        progress,
      },
    };
    await this.sendWebhook(payload);
  }

  /**
   * Remove large fields from job data to prevent 413 Payload Too Large errors
   */
  private sanitizeJobDataForWebhook(job: ImageGenerationJobData): ImageGenerationJobData {
    const sanitized = { ...job };

    if (sanitized.generateImageParams?.data) {
      sanitized.generateImageParams = {
        ...sanitized.generateImageParams,
        data: this.sanitizeGenerationData(sanitized.generateImageParams.data),
      };
    }

    if (sanitized.editImageParams?.data) {
      sanitized.editImageParams = {
        ...sanitized.editImageParams,
        data: this.sanitizeGenerationData(sanitized.editImageParams.data),
      };
    }

    return sanitized;
  }

  private async sendWebhook(payload: WebhookPayload): Promise<void> {
    const webhookUrl = payload.data.editImageParams ? this.apiKeysConfig.editWebhookUrl : this.apiKeysConfig.webhookUrl;

    if (!webhookUrl) {
      this.logger.debug('Webhook URL not configured, skipping webhook notification');
      return;
    }
    try {
      // Create axios instance with keep-alive to reuse TCP/TLS connections
      const axiosInstance = axios.create({
        timeout: parseInt(process.env.WEBHOOK_TIMEOUT_MS || '5000', 10),
        httpsAgent: new HttpsAgent({ keepAlive: true, maxSockets: 10 }),
        headers: {
          'x-webhook-secret': this.apiKeysConfig.webhookSecret || '',
          'Content-Type': 'application/json',
          'User-Agent': 'Bobby-Worker/1.0',
        },
      });

      const start = Date.now();
      await axiosInstance.post(webhookUrl, payload);
      const duration = Date.now() - start;

      this.logger.log(`Webhook sent successfully: ${payload.event} (duration=${duration}ms)`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send webhook: ${errMsg}`);
      // Don't throw error here - webhook failures shouldn't stop the main process
    }
  }

  async healthCheck(): Promise<boolean> {
    const webhookUrl = this.apiKeysConfig.webhookUrl;

    if (!webhookUrl) {
      return true; // Consider healthy if no webhook is configured
    }

    try {
      const healthPayload = {
        event: 'health.check',
        data: { status: 'ok' },
        timestamp: new Date(),
      };

      await axios.post(webhookUrl, healthPayload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Bobby-Worker/1.0',
          'X-Webhook-Secret': this.apiKeysConfig.webhookSecret || '',
        },
      });

      return true;
    } catch (error) {
      this.logger.warn(`Webhook health check failed: ${error.message}`);
      return false;
    }
  }
}
