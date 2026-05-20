import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {}

  async buildVerificationEmail(language: string, verifyLink: string) {
    const labelKey = this.getTemplateLabelKey(language);
    const layoutTemplate = await this.getLayoutTemplate('VERIFICATION_EMAIL_LAYOUT_TEMPLATE');
    const labels = await this.getEmailLabels(labelKey);
    
    const htmlContent = this.injectLabelsIntoTemplate(
      layoutTemplate,
      labels,
      verifyLink,
    );
    
    return {
      subject: labels.email_title,
      html: htmlContent,
    };
  }

  private getTemplateLabelKey(language: string): string {
    const languageMap = {
      'de': 'TEMPLATE_VERIFICATION_EMAIL_DE',
      'vi': 'TEMPLATE_VERIFICATION_EMAIL_VI',
      'en': 'TEMPLATE_VERIFICATION_EMAIL_EN',
    };
    return languageMap[language] || languageMap['en'];
  }

  private async getLayoutTemplate(templateKey: string): Promise<string> {
    const configs = await this.configService.getConfigsByKey(templateKey);
    if (!configs?.length) {
      throw new Error(`${templateKey} not found`);
    }
    return configs[0].configValue;
  }

  private async getEmailLabels(labelKey: string): Promise<Record<string, string>> {
    const configs = await this.configService.getConfigsByKey(labelKey);
    if (!configs?.length) {
      throw new Error(`Email labels for ${labelKey} not found`);
    }
    return JSON.parse(configs[0].configValue);
  }

  private injectLabelsIntoTemplate(
    template: string,
    labels: Record<string, string>,
    verifyLink: string,
  ): string {
    let result = template.replace('{{verification_Link}}', verifyLink);
    
    for (const [key, value] of Object.entries(labels)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }
}
