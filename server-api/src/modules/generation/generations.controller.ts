import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CancelGenerationUseCase } from '../../application/generation/cancel-generation';
import {
  CreateGenerationDto,
  GenerationAccepted,
  GenerationPage,
  GenerationSnapshot,
  SaveGenerationResponse,
  StudioSessionResponse,
} from '../../application/generation/contracts';
import { GenerationQueries } from '../../application/generation/generation-queries';
import { RetryGenerationUseCase } from '../../application/generation/retry-generation';
import { SaveGenerationUseCase } from '../../application/generation/save-generation';
import { SubmitGenerationUseCase } from '../../application/generation/submit-generation';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedRequest } from '../identity/principal';

/** Whitelist + forbid unknown fields: client-supplied identity, prices or endpoints are rejected. */
const strictBody = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

@ApiTags('Generations')
@ApiBearerAuth()
@Controller()
export class GenerationsController {
  constructor(
    private readonly submit: SubmitGenerationUseCase,
    private readonly retry: RetryGenerationUseCase,
    private readonly cancel: CancelGenerationUseCase,
    private readonly save: SaveGenerationUseCase,
    private readonly queries: GenerationQueries,
    private readonly prisma: PrismaService,
  ) {}

  @Post('studio-sessions')
  async createSession(@Request() req: AuthenticatedRequest): Promise<StudioSessionResponse> {
    const session = await this.prisma.studioSession.create({ data: { userId: req.currentUser.id } });
    return { id: session.id, latestRevision: session.latestRevision };
  }

  @Post('generations')
  @HttpCode(202)
  @UsePipes(strictBody)
  create(
    @Request() req: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: CreateGenerationDto,
  ): Promise<GenerationAccepted> {
    return this.submit.execute({ principal: req.currentUser, idempotencyKey, request: body });
  }

  @Get('generations')
  list(
    @Request() req: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('studioSessionId') studioSessionId?: string,
  ): Promise<GenerationPage> {
    return this.queries.list(req.currentUser.id, { cursor, limit: limit ? Number(limit) : undefined, studioSessionId });
  }

  @Get('generations/:id')
  get(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string): Promise<GenerationSnapshot> {
    return this.queries.get(req.currentUser.id, id);
  }

  @Post('generations/:id/cancel')
  @HttpCode(200)
  cancelJob(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string): Promise<GenerationSnapshot> {
    return this.cancel.execute(req.currentUser.id, id);
  }

  @Post('generations/:id/retry')
  @HttpCode(202)
  retryJob(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<GenerationAccepted> {
    return this.retry.execute(req.currentUser, id, idempotencyKey);
  }

  @Post('generations/:id/save')
  @HttpCode(200)
  saveJob(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string): Promise<SaveGenerationResponse> {
    return this.save.execute(req.currentUser.id, id);
  }
}
