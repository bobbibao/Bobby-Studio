import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Headers,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { ImageGenerationService } from './image-generation.service';
import { AuthGuard } from '../auth/auth.guard';
import { Public } from '../auth/public.decorator';

import { SdxlGenerateImageDto } from './dto/sdxl-generation.dto';
import { JobStatusResponseDto, JobResultDto } from './dto/image-response.dto';
import { InputTypeEnum } from 'src/constant/attribute-type.enum';
import { DEFAULT_USER_ROLE } from 'src/config/roles.config';
import { GenerateImageCommand } from '../../application/generation/commands/generate-image.command';
import { RetryGenerationCommand } from '../../application/generation/commands/retry-generation.command';
import { CancelGenerationCommand } from '../../application/generation/commands/cancel-generation.command';
import { GetGenerationStatusQuery } from '../../application/generation/queries/get-generation-status.query';
import { GetGenerationResultQuery } from '../../application/generation/queries/get-generation-result.query';
import { GetGenerationHistoryQuery } from '../../application/generation/queries/get-generation-history.query';
import { CancelGenerationResult } from '../../application/generation/handlers/cancel-generation.handler';

@ApiTags('Image Generation')
@Controller('image-generation')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ImageGenerationController {
  constructor(
    private readonly imageGenerationService: ImageGenerationService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('generate-webhook')
  @Public()
  @ApiOperation({
    summary:
      'Handle image generation webhook notifications from various providers',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handleGenerateWebhook(
    @Headers() headers: Record<string, string>,
    @Body() webhookData: Record<string, unknown>,
    @Query('jobId') jobId?: string,
  ): Promise<{ status: string }> {
    return this.forwardGenerateWebhook(headers, webhookData, jobId);
  }

  @Post('webhook')
  @Public()
  @ApiOperation({
    summary:
      'Backward-compatible webhook endpoint for image generation providers',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handleGenerateWebhookLegacy(
    @Headers() headers: Record<string, string>,
    @Body() webhookData: Record<string, unknown>,
    @Query('jobId') jobId?: string,
  ): Promise<{ status: string }> {
    return this.forwardGenerateWebhook(headers, webhookData, jobId);
  }

  private forwardGenerateWebhook(
    headers: Record<string, string>,
    webhookData: Record<string, unknown>,
    jobId?: string,
  ): Promise<{ status: string }> {
    return this.imageGenerationService.handleGenerateWebhook(
      headers['x-webhook-secret'],
      webhookData,
      jobId,
    );
  }

  @Post('generate-sdxl')
  @ApiOperation({
    summary:
      'Queue an SDXL generation using the unified Python /api/v2/generate contract',
  })
  async generateSdxlImage(
    @Body() generateDto: SdxlGenerateImageDto,
    @Request() req,
  ): Promise<{ jobIds: string[]; requestId: string; message: string }> {
    const currentRole = req.currentUser?.role || DEFAULT_USER_ROLE;
    const currentUser = req.currentUser;

    return this.commandBus.execute(
      new GenerateImageCommand({
        ...generateDto,
        userId: generateDto.userId || currentUser?.id,
        userEmail: generateDto.userEmail || currentUser?.email,
      }, currentRole),
    );
  }

  @Post('job/:jobId/retry')
  @ApiOperation({ summary: 'Retry a failed or cancelled image generation job' })
  @ApiParam({ name: 'jobId', description: 'Job identifier', type: String })
  async retryJob(
    @Param('jobId') jobId: string,
    @Request() req,
  ): Promise<{ jobIds: string[]; requestId: string; message: string }> {
    const currentRole = req.currentUser?.role || DEFAULT_USER_ROLE;
    return this.commandBus.execute(
      new RetryGenerationCommand(jobId, currentRole),
    );
  }

  @Post('job/:jobId/cancel')
  @ApiOperation({ summary: 'Cancel an image generation job' })
  @ApiParam({ name: 'jobId', description: 'Job identifier', type: String })
  async cancelJob(
    @Param('jobId') jobId: string,
  ): Promise<CancelGenerationResult> {
    return this.commandBus.execute(
      new CancelGenerationCommand(jobId),
    );
  }

  @Get('job/:jobId/status')
  @Public()
  @ApiOperation({ summary: 'Check the status of an image generation job' })
  @ApiParam({ name: 'jobId', description: 'Job identifier', type: String })
  @ApiResponse({
    status: 200,
    description: 'Job status retrieved successfully',
    type: JobStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobStatus(
    @Param('jobId') jobId: string,
  ): Promise<JobStatusResponseDto> {
    return this.queryBus.execute(
      new GetGenerationStatusQuery(jobId),
    );
  }

  @Get('job/:jobId/result')
  @Public()
  @ApiOperation({
    summary: 'Get the result of a completed image generation job',
  })
  @ApiParam({ name: 'jobId', description: 'Job identifier', type: String })
  @ApiResponse({
    status: 200,
    description: 'Job result retrieved successfully',
    type: JobResultDto,
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 409, description: 'Job not completed yet' })
  async getJobResult(@Param('jobId') jobId: string): Promise<JobResultDto> {
    return this.queryBus.execute(
      new GetGenerationResultQuery(jobId),
    );
  }

  @Get('queue/stats')
  @Public()
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics retrieved successfully',
  })
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    return this.imageGenerationService.getQueueStats();
  }

  @Get('user/:userId/jobs')
  @Public()
  @ApiOperation({ summary: 'Get user job history' })
  @ApiParam({ name: 'userId', description: 'User identifier', type: String })
  @ApiResponse({
    status: 200,
    description: 'User jobs retrieved successfully',
    type: [JobStatusResponseDto],
  })
  async getUserJobs(
    @Param('userId') userId: string,
    @Query('limit') limit: number,
    @Query('inputType') inputType?: InputTypeEnum[],
    @Query('type') type?: string,
  ): Promise<JobStatusResponseDto[]> {
    return this.queryBus.execute(
      new GetGenerationHistoryQuery(userId, limit, inputType, type),
    );
  }

  @Get('health')
  @ApiOperation({ summary: 'Check service health' })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
  })
  async healthCheck(): Promise<{ status: string; details: any }> {
    return this.imageGenerationService.healthCheck();
  }
}
