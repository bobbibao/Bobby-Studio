import { InputTypeEnum } from '../../../constant/attribute-type.enum';

export const PROMPT_ENHANCER = Symbol('PROMPT_ENHANCER');

export interface PromptEnhancementInput {
  originalPrompt: string;
  maxTokens?: number;
  temperature?: number;
  inputType?: InputTypeEnum;
}

export interface PromptEnhancementOutput {
  enhancedPrompt: string;
  originalPrompt: string;
  tokensUsed: number;
  processingTime: number;
}

export interface IPromptEnhancer {
  enhancePrompt(input: PromptEnhancementInput): Promise<PromptEnhancementOutput>;
  isAvailable(): boolean;
}
