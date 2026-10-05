import 'dotenv/config';
import { Logger, LoggerService } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DelayedError, Job, UnrecoverableError, Worker } from 'bullmq';
import { ApiRejectedError } from './api/internal-api-client';
import { ConfigError, loadWorkerConfig, WorkerRuntimeConfig } from './config/worker-config';
import { UnsupportedQueueMessageError } from './contracts/queue-message';
import { GenerationProcessor, RetryLaterError } from './generation/generation-processor';
import { startHealthServer } from './health/health-server';
import { FileLogger } from './services/file-logger.service';
import { GENERATION_PROCESSOR, WORKER_CONFIG, WorkerModule } from './worker.module';

const QUEUE_NAME = 'generation-jobs';

async function bootstrap() {
  let config: WorkerRuntimeConfig;
  try {
    config = loadWorkerConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      // Field names and reasons only; values are never printed.
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  const logger: LoggerService = config.isDeployed ? new FileLogger() : new Logger('Worker');
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: config.isDeployed ? logger : ['log', 'error', 'warn', 'debug'],
  });
  const processor = app.get<GenerationProcessor>(GENERATION_PROCESSOR);
  void app.get<WorkerRuntimeConfig>(WORKER_CONFIG);

  let shuttingDown = false;
  const healthServer = startHealthServer(config, () => shuttingDown);

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job, token?: string) => {
      try {
        return await processor.process(job.data);
      } catch (error) {
        if (error instanceof RetryLaterError) {
          await job.moveToDelayed(Date.now() + error.delayMs, token);
          throw new DelayedError();
        }
        if (error instanceof UnsupportedQueueMessageError) throw new UnrecoverableError(error.message);
        if (error instanceof ApiRejectedError) {
          logger.error(`job=${job.id} rejected by the API (HTTP ${error.status}); check WORKER_SERVICE_SECRET and API_INTERNAL_URL`);
          throw new UnrecoverableError(error.message);
        }
        throw error;
      }
    },
    {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        maxRetriesPerRequest: null,
      },
      concurrency: config.concurrency,
      // Provider calls can take tens of seconds; the lock is renewed while this process is alive.
      lockDuration: 60_000,
      stalledInterval: 30_000,
      maxStalledCount: 1,
    },
  );

  worker.on('ready', () => logger.log(`Worker ready (concurrency ${config.concurrency}, provider ${config.imageProvider.id}/${config.imageProvider.mode})`));
  worker.on('failed', (job, error) => logger.warn(`job=${job?.id} failed in the queue: ${error.message}`));
  worker.on('error', (error) => logger.error(`worker error: ${error.message}`));

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, draining`);
    shuttingDown = true;
    try {
      healthServer.close();
      await worker.close(); // waits for active jobs to finish
      await app.close();
      process.exit(0);
    } catch (error) {
      logger.error(`Shutdown error: ${(error as Error).message}`);
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

process.on('uncaughtException', (error) => {
  new Logger('UncaughtException').error(`${error.message}`, error.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  new Logger('UnhandledRejection').error(`${String(reason)}`);
  process.exit(1);
});

void bootstrap();
