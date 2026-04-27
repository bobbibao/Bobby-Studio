import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PromptEnhancementService } from './prompt-enhancement.service';
import { EnhancePromptDto } from './dto/enhance-prompt.dto';
import { EnhancePromptResponseDto } from './dto/enhance-prompt-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

@ApiTags('Prompt Enhancement')
@Controller('prompt-enhancement')
// @UseGuards(JwtAuthGuard)
// @ApiBearerAuth()
export class PromptEnhancementController {
  constructor(
    private readonly promptEnhancementService: PromptEnhancementService,
  ) {}

  @Post('enhance')
  @Public() //TODO: REMOMVE THIS
  @ApiOperation({
    summary: 'Enhance a prompt using AI',
    description:
      'Takes a user prompt and enhances it using Gemini to make it more detailed, creative, technical, or concise based on the enhancement type specified.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Prompt successfully enhanced',
    type: EnhancePromptResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or service not available',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async enhancePrompt(
    @Body() enhancePromptDto: EnhancePromptDto,
  ): Promise<EnhancePromptResponseDto> {
    console.log('Received enhance prompt request:', enhancePromptDto);
    return await this.promptEnhancementService.enhancePrompt(enhancePromptDto);
  }

  @Get('health')
  @ApiOperation({
    summary: 'Check prompt enhancement service health',
    description:
      'Returns the health status of the prompt enhancement service and Gemini connection.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean' },
        configured: { type: 'boolean' },
        connectionTest: { type: 'boolean' },
      },
    },
  })
  async getServiceHealth() {
    const configured = this.promptEnhancementService.isServiceAvailable();
    const connectionTest = configured
      ? await this.promptEnhancementService.testConnection()
      : false;

    return {
      available: configured && connectionTest,
      configured,
      connectionTest,
    };
  }
}
