import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ApplyWorkerEventUseCase } from '../../application/generation/apply-worker-event';
import { ClaimGenerationUseCase } from '../../application/generation/claim-generation';
import { ClaimResponse, parseWorkerEvent, WorkerEventAck } from '../../application/generation/contracts';
import { ApiException } from '../../application/generation/api-error';
import { Public } from '../auth/public.decorator';
import { WorkerAuthGuard } from '../auth/worker-auth.guard';

/** Worker-facing API. Authenticated by the service credential, never by a user token. */
@ApiExcludeController()
@Public()
@UseGuards(WorkerAuthGuard)
@Controller('internal/generations')
export class InternalGenerationsController {
  constructor(
    private readonly claimUseCase: ClaimGenerationUseCase,
    private readonly events: ApplyWorkerEventUseCase,
  ) {}

  @Post(':id/claim')
  @HttpCode(200)
  claim(@Param('id', ParseUUIDPipe) id: string): Promise<ClaimResponse> {
    return this.claimUseCase.execute(id);
  }

  @Post(':id/events')
  @HttpCode(200)
  async event(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown): Promise<WorkerEventAck> {
    const event = parseWorkerEvent(body);
    if (event.jobId !== id) throw new ApiException(400, 'INVALID_INPUT', 'jobId does not match the route');
    return this.events.execute(id, event);
  }
}
