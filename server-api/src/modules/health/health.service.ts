import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { access, constants } from 'fs/promises';
import { PrismaService } from '../../../prisma/prisma.service';
import { RUNTIME_CONFIG, RuntimeConfig } from '../../config/runtime-config';

export type CheckStatus = 'ok' | 'failed';

export interface ReadinessReport {
  status: 'ready' | 'unavailable';
  checks: Record<string, { status: CheckStatus; detail?: string }>;
}

const CHECK_TIMEOUT_MS = 2000;

function withTimeout<T>(work: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), CHECK_TIMEOUT_MS);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Readiness reflects dependencies the API cannot serve traffic without. It never calls a
 * paid image provider and never reports secret values.
 */
@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly logger = new Logger(HealthService.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      lazyConnect: true,
      connectTimeout: CHECK_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    // Connection errors surface through the readiness report, not as unhandled events.
    this.redis.on('error', () => undefined);
  }

  async onModuleDestroy(): Promise<void> {
    this.redis.disconnect();
  }

  async readiness(): Promise<ReadinessReport> {
    const checks: ReadinessReport['checks'] = {};
    const run = async (name: string, work: () => Promise<void>) => {
      try {
        await withTimeout(work(), name);
        checks[name] = { status: 'ok' };
      } catch (error) {
        this.logger.warn(`Readiness check "${name}" failed: ${(error as Error).message}`);
        checks[name] = { status: 'failed', detail: (error as Error).message };
      }
    };

    await Promise.all([
      run('database', async () => {
        await this.prisma.$queryRaw`SELECT 1`;
      }),
      run('redis', async () => {
        if (this.redis.status === 'wait' || this.redis.status === 'end') {
          await this.redis.connect();
        }
        const reply = await this.redis.ping();
        if (reply !== 'PONG') throw new Error('unexpected PING reply');
      }),
      run('storage', async () => {
        if (this.config.storage.driver === 'local') {
          await access(this.config.storage.localRoot!, constants.R_OK | constants.W_OK);
        }
      }),
    ]);

    const ready = Object.values(checks).every((check) => check.status === 'ok');
    return { status: ready ? 'ready' : 'unavailable', checks };
  }
}
