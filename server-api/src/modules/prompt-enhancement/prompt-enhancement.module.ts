import { Module } from '@nestjs/common';
import { PromptEnhancementController } from './prompt-enhancement.controller';
import { PromptEnhancementService } from './prompt-enhancement.service';
import { GoogleConnector } from '../../connectors/google.connector';

@Module({
  controllers: [PromptEnhancementController],
  providers: [PromptEnhancementService, GoogleConnector],
  exports: [PromptEnhancementService, GoogleConnector],
})
export class PromptEnhancementModule {}
