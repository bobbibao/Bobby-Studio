import { Controller, Get, Header, Headers, Inject, NotFoundException, Optional, UnauthorizedException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { GENERATION_QUEUE, GenerationQueue } from '../../application/generation/ports';
import { Public } from '../auth/public.decorator';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Prometheus text exposition with bounded label cardinality (status only; never user or job ids).
 * Disabled (404) unless METRICS_TOKEN is configured, and then requires it as a Bearer token.
 */
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(GENERATION_QUEUE) private readonly queue?: GenerationQueue,
  ) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async metrics(@Headers('authorization') authorization?: string): Promise<string> {
    const expected = process.env.METRICS_TOKEN;
    if (!expected) throw new NotFoundException();
    const presented = /^Bearer\s+(.+)$/i.exec((authorization ?? '').trim())?.[1] ?? '';
    if (!presented || !timingSafeEqual(digest(presented), digest(expected))) throw new UnauthorizedException();

    const [byStatus] = await Promise.all([
      this.prisma.$queryRaw<Array<{ status: string; n: bigint }>>`
        SELECT status, count(*) AS n FROM "ImageJob" WHERE "createdAt" > now() - interval '24 hours' GROUP BY status`,
    ]);
    const [scalars] = await this.prisma.$queryRaw<
      Array<{ oldest_pending: number | null; outbox_unpublished: bigint; outbox_lag: number | null; active: bigint; unknown24: bigint; stale_reservations: bigint; expired_assets: bigint; failed_attempts: bigint }>
    >`
      SELECT
        (SELECT EXTRACT(EPOCH FROM now() - min("createdAt")) FROM "ImageJob" WHERE status = 'PENDING') AS oldest_pending,
        (SELECT count(*) FROM "GenerationOutbox" WHERE "publishedAt" IS NULL) AS outbox_unpublished,
        (SELECT EXTRACT(EPOCH FROM now() - min("createdAt")) FROM "GenerationOutbox" WHERE "publishedAt" IS NULL) AS outbox_lag,
        (SELECT count(*) FROM "ImageJob" WHERE "attemptId" IS NOT NULL AND "executionFinishedAt" IS NULL) AS active,
        (SELECT count(*) FROM "ImageJob" WHERE "errorCode" = 'PROVIDER_OUTCOME_UNKNOWN' AND "createdAt" > now() - interval '24 hours') AS unknown24,
        (SELECT count(*) FROM "CreditReservation" WHERE status = 'RESERVED' AND "createdAt" < now() - interval '10 minutes') AS stale_reservations,
        (SELECT count(*) FROM "Asset" WHERE retention <> 'saved' AND "expiresAt" < now()) AS expired_assets,
        (SELECT count(*) FROM "ImageJob" WHERE status = 'FAILED' AND "createdAt" > now() - interval '24 hours') AS failed_attempts`;
    const waiting = this.queue ? await this.queue.waitingCount().catch(() => -1) : -1;

    const lines: string[] = [];
    const gauge = (name: string, help: string, value: number | bigint | null, labels = '') => {
      if (!lines.some((line) => line.startsWith(`# HELP ${name} `))) {
        lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} gauge`);
      }
      lines.push(`${name}${labels} ${value === null ? 'NaN' : Number(value)}`);
    };
    for (const row of byStatus) gauge('bobby_generation_jobs_24h', 'Generation jobs created in the last 24 hours by status', row.n, `{status="${row.status}"}`);
    gauge('bobby_generation_oldest_pending_seconds', 'Age of the oldest job still waiting for dispatch', scalars.oldest_pending ?? 0);
    gauge('bobby_outbox_unpublished', 'Outbox rows not yet published to the queue', scalars.outbox_unpublished);
    gauge('bobby_outbox_lag_seconds', 'Age of the oldest unpublished outbox row', scalars.outbox_lag ?? 0);
    gauge('bobby_generation_active_executions', 'Claimed executions that have not finished (including cancelled but still running)', scalars.active);
    gauge('bobby_generation_unknown_outcomes_24h', 'Jobs that ended with an unknown paid provider outcome in the last 24 hours', scalars.unknown24);
    gauge('bobby_generation_failed_24h', 'Failed generation jobs in the last 24 hours', scalars.failed_attempts);
    gauge('bobby_credit_reservations_stale', 'Credit reservations held longer than 10 minutes', scalars.stale_reservations);
    gauge('bobby_assets_expired_pending_cleanup', 'Expired assets awaiting cleanup', scalars.expired_assets);
    gauge('bobby_queue_waiting', 'Entries waiting in the generation queue (-1 when unavailable)', waiting);
    return `${lines.join('\n')}\n`;
  }
}
