import { InspirationMethodEnum } from '@/constants/attribute-enum';

export type GenerateImageResponseType = {
  userId: string;
  attributeId: string;
  imagePath?: string;
  generatedImage: {
    location: string;
    eTag: string;
    bucket: string;
    key: string;
    thumbnail?: string;
  };
  method?: InspirationMethodEnum;
};

export type PromptEnhancementRequest = {
  originalPrompt: string;
  inputType?: string;
  maxTokens?: number;
  temperature?: number;
};

export type PromptEnhancementResponse = {
  enhancedPrompt: string;
  originalPrompt: string;
  tokensUsed: number;
  processingTime: number;
  success: boolean;
};

