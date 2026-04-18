import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import {
  textPromptSystemPrompt,
  defaultUserEnhancePrompt,
  lineDrawing3DModelSystemPrompt,
  referenceImageSystemPrompt,
} from 'src/constant/google.configuration';
import { InputTypeEnum } from 'src/constant/attribute-type.enum';

export interface PromptEnhancementParams {
  originalPrompt: string;
  maxTokens?: number;
  temperature?: number;
  inputType?: InputTypeEnum;
}

export interface PromptEnhancementResult {
  enhancedPrompt: string;
  originalPrompt: string;
  tokensUsed: number;
  processingTime: number;
}

@Injectable()
export class GoogleConnector {
  private readonly logger = new Logger(GoogleConnector.name);
  private genAI: GoogleGenAI;
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('Gemini API key not configured');
      return;
    }

    this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
  }

  /**
   * Enhance a prompt using Google Gemini 2.5 Flash API
   */
  async enhancePrompt(
    params: PromptEnhancementParams,
  ): Promise<PromptEnhancementResult> {
    if (!this.genAI) {
      throw new Error('Gemini not configured - missing API key');
    }

    const startTime = Date.now();
    const {
      originalPrompt,
      maxTokens = 500,
      temperature = 0.7,
      inputType,
    } = params;

    // Validate input
    if (!originalPrompt || originalPrompt.trim().length === 0) {
      throw new Error('Original prompt cannot be empty');
    }

    try {
      this.logger.log(
        `Enhancing prompt with Gemini 2.5 Flash: "${originalPrompt}" with inputType: ${inputType || 'TEXT_PROMPT'}, maxTokens: ${maxTokens}, temperature: ${temperature}`,
      );

      const systemPrompt = this.getSystemPrompt(inputType);
      const userPrompt = this.getUserPrompt(originalPrompt);
      // Combine system and user prompt for Gemini
      const combinedPrompt = `${userPrompt}${systemPrompt}`;
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: combinedPrompt,
      });
      const enhancedPrompt = response.text.trim() || originalPrompt;

      this.logger.log(`Google Gemini response received for prompt enhancement`);

      // Estimate tokens used (approximate since Gemini doesn't return exact token count)
      const tokensUsed = Math.ceil(
        (combinedPrompt.length + enhancedPrompt.length) / 4,
      );
      const processingTime = Date.now() - startTime;

      this.logger.log(
        `Prompt enhancement completed in ${processingTime}ms, estimated tokens used: ${tokensUsed}`,
      );

      return {
        enhancedPrompt,
        originalPrompt,
        tokensUsed,
        processingTime,
      };
    } catch (error) {
      this.logger.error(
        `Error enhancing prompt: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to enhance prompt: ${error.message}`);
    }
  }

  /**
   * Get system prompt based on enhancement type
   */
  private getSystemPrompt(inputType?: InputTypeEnum): string {
    switch (inputType) {
      case InputTypeEnum.LINE_DRAWING:
      case InputTypeEnum.MODEL_3D:
        return lineDrawing3DModelSystemPrompt;
      case InputTypeEnum.REFERENCE:
        return referenceImageSystemPrompt;
      case InputTypeEnum.TEXT_PROMPT:
        return textPromptSystemPrompt;
      default:
        return textPromptSystemPrompt;
    }
  }

  /**
   * Get user prompt template
   */
  private getUserPrompt(originalPrompt: string): string {
    const baseUserPrompt = defaultUserEnhancePrompt;
    return baseUserPrompt.replace('originalPrompt', originalPrompt);
  }

  /**
   * Test connection to Google Gemini API
   */
  async testConnection(): Promise<boolean> {
    if (!this.genAI) {
      return false;
    }

    try {
      // Test with a simple content generation request
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Hello',
      });
      this.logger.log('Google Gemini connection test successful');
      return !!response.text;
    } catch (error) {
      this.logger.error(
        `Google Gemini connection test failed: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Check if Google Gemini is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.genAI;
  }
}
