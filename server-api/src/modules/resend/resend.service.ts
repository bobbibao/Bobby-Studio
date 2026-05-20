// resend.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { isEnvValueSet } from 'src/shared/utils/env.utils';

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private resend?: Resend;
  private isConfigured = false;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'no-reply@localhost';

    if (isEnvValueSet(resendApiKey)) {
      this.resend = new Resend(resendApiKey);
      this.isConfigured = true;
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not set. Email sending is disabled for this environment.',
      );
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    if (!this.isConfigured || !this.resend) {
      this.logger.warn(
        `Skipping email send to ${to} because Resend is not configured.`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
    } catch (error) {
      Logger.error('Resend send email failed', error);
      throw error;
    }
  }
}
