import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GoogleConnector } from '../../connectors/google.connector';
import { EnhancePromptDto } from './dto/enhance-prompt.dto';
import { EnhancePromptResponseDto } from './dto/enhance-prompt-response.dto';

@Injectable()
export class PromptEnhancementService {
  private readonly logger = new Logger(PromptEnhancementService.name);

  constructor(private readonly googleConnector: GoogleConnector) {}

  async enhancePrompt(
    enhancePromptDto: EnhancePromptDto,
  ): Promise<any> {
    try {
      // Check if Google Gemini is configured
      if (!this.googleConnector.isConfigured()) {
        throw new BadRequestException(
          'Prompt enhancement service is not available - Google Gemini not configured',
        );
      }

      // Validate input
      if (
        !enhancePromptDto.originalPrompt ||
        enhancePromptDto.originalPrompt.trim().length === 0
      ) {
        throw new BadRequestException('Original prompt cannot be empty');
      }

      // Call Google Gemini connector with input type for specialized enhancement
      const result = await this.googleConnector.enhancePrompt({
        originalPrompt: enhancePromptDto.originalPrompt,
        maxTokens: enhancePromptDto.maxTokens,
        temperature: enhancePromptDto.temperature,
        inputType: enhancePromptDto.inputType,
      });

      this.logger.log(
        `Prompt enhancement successful for prompt: "${enhancePromptDto.originalPrompt}" with inputType: ${enhancePromptDto.inputType || 'TEXT_PROMPT'}`,
      );

      return {
        ...result,
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to enhance prompt: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to enhance prompt: ${error.message}`,
      );
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      return await this.googleConnector.testConnection();
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`);
      return false;
    }
  }

  isServiceAvailable(): boolean {
    return this.googleConnector.isConfigured();
  }
}
