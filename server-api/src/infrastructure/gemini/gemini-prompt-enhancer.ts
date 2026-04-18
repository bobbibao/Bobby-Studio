import { Injectable } from '@nestjs/common';
import {
  IPromptEnhancer,
  PromptEnhancementInput,
  PromptEnhancementOutput,
} from '../../application/generation/interfaces/prompt-enhancer.interface';
import { GoogleConnector } from '../../connectors/google.connector';

@Injectable()
export class GeminiPromptEnhancer implements IPromptEnhancer {
  constructor(private readonly googleConnector: GoogleConnector) {}

  enhancePrompt(input: PromptEnhancementInput): Promise<PromptEnhancementOutput> {
    return this.googleConnector.enhancePrompt(input);
  }

  isAvailable(): boolean {
    return this.googleConnector.isConfigured();
  }
}
