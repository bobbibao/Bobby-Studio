import { NestFactory } from '@nestjs/core';
import { Logger, LoggerService } from '@nestjs/common';
import { Worker, Job, Queue } from 'bullmq';
import { WorkerModule } from './worker.module';
import { PythonModelProcessor } from './processors/python-model.processor';
import { PostProcessingProcessor } from './processors/post-processing.processor';
import { RedisConfig } from './config/redis.config';
import { WebhookService } from './services/webhook.service';
import {
  ImageGenerationJobData,
  JobProgress,
  PostProcessingJobData,
} from './shared/interfaces/image-generation.interface';
import { QUEUE_NAMES } from './shared/constants/queue.constants';
import { RedisService } from './services/redis.service';
import { FileLogger } from './services/file-logger.service';

const CONCURRENCY = process.env.WORKER_CONCURRENCY
  ? parseInt(process.env.WORKER_CONCURRENCY)
  : 4;

async function bootstrap() {
  const environment = process.env.NODE_ENV || 'development';
  const isDeploymentEnvironment = ['staging', 'production'].includes(environment);
  const logger: LoggerService = isDeploymentEnvironment
    ? new FileLogger()
    : new Logger('WorkerBootstrap');

  try {
    const app = await NestFactory.create(WorkerModule, {
      logger: isDeploymentEnvironment ? logger : ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    const pythonModelProcessor = app.get(PythonModelProcessor);
    const redisConfig = app.get(RedisConfig);
    const webhookService = app.get(WebhookService);
    const redisService = app.get(RedisService);
    const postProcessingQueue = new Queue(QUEUE_NAMES.IMAGE_POST_PROCESSING, {
      connection: redisConfig.connectionConfig,
    });

    logger.log('Worker application context created successfully');

    if (!redisConfig.isEnabled) {
      logger.warn('REDIS_HOST/REDIS_PORT missing or placeholder. Workers are disabled for local dev.');
      setInterval(() => {
        logger.debug('Worker idle (Redis disabled)');
      }, 5 * 60 * 1000);
      return;
    }

    const imageWorker = new Worker(
      QUEUE_NAMES.IMAGE_GENERATION,
      async (job: Job<ImageGenerationJobData>) => {
        const { jobId } = job.data as { jobId?: string };
        const imageParams = job.data.generateImageParams ?? job.data.editImageParams;

        if (!imageParams) {
          throw new Error('Missing image parameters in job data (expected generateImageParams or editImageParams)');
        }

        const { userId, method } = imageParams;
        logger.log(`[INFO] Job ${jobId} queued for Bobby Python Model Service (user=${userId}, method=${method})`);

        const progressCallback = async (progress: JobProgress) => {
          await job.updateProgress(progress.percentage);
          if (job.data.jobId) {
            await webhookService.notifyJobProgress(job.data, progress.percentage);
          }
        };

        try {
          await job.updateProgress(0);
          await webhookService.notifyJobActive(job.data);
          const result = await pythonModelProcessor.processImageGeneration(job.data, progressCallback);
          const temporaryImageUrl = result.generatedImage?.location;

          if (!temporaryImageUrl) {
            throw new Error('Bobby AI completed without a temporary image URL');
          }

          const postProcessingJob: PostProcessingJobData = {
            jobId: result.jobId,
            requestId: result.requestId || job.data.requestId,
            userId,
            userEmail: imageParams.userEmail,
            sourceJobId: result.jobId,
            imageUrl: temporaryImageUrl,
            generateImageParams: result.generateImageParams || job.data.generateImageParams,
            editImageParams: result.editImageParams || job.data.editImageParams,
            method,
            credit: result.credit || imageParams.credit || 0,
            shouldWatermark: result.shouldWatermark || imageParams.shouldWatermark || false,
            endpoint: job.data.endpoint,
            metadata: {
              creativityValue: imageParams.data?.creativityValue,
              inputValue: imageParams.data?.inputValue,
              styleValue: imageParams.data?.styleValue,
              aspectRatio: imageParams.data?.aspectRatio || '1:1',
              lora: imageParams.data?.lora,
              model: job.data.endpoint,
            },
          };

          await postProcessingQueue.add('post-process', postProcessingJob, {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            delay: 0,
            jobId: `${result.jobId}:post-process`,
            removeOnComplete: true,
            removeOnFail: true,
          });

          logger.log(`[INFO] Job ${jobId} completed successfully`);
          return result;
        } catch (error) {
          logger.error(`Job ${jobId} failed: ${error.message}`);
          throw error;
        }
      },
      {
        connection: redisConfig.connectionConfig,
        concurrency: Math.max(2, Math.min(4, CONCURRENCY)),
        removeOnComplete: { age: 24 * 60 * 60, count: 100 },
        removeOnFail: { age: 24 * 60 * 60, count: 100 },
      },
    );

    imageWorker.on('ready', async () => {
      logger.log('Image generation worker is ready and waiting for Bobby AI jobs');
    });

    imageWorker.on('failed', async (job, err) => {
      try {
        const imageParams = job?.data.generateImageParams ?? job?.data?.editImageParams;
        const attemptsExhausted = job?.attemptsMade >= (job?.opts?.attempts || 3);

        if (attemptsExhausted && job?.data?.jobId) {
          try {
            await webhookService.notifyJobFailed(job.data.jobId, err);
            logger.log(`Notified webhook of job failure after ${job.attemptsMade} attempts: ${job.data.jobId}`);
          } catch (webhookError) {
            logger.warn(`Failed to send failure webhook for job ${job.data.jobId}: ${webhookError.message}`);
          }
        } else if (job?.data?.jobId) {
          logger.warn(`Job ${job.data.jobId} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts || 3}), will retry...`);
        }

        if (attemptsExhausted) {
          if (job?.id && imageParams?.userId) {
            await redisService.batchDeleteJobData(job.id, imageParams.userId);
            logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts: ${err.message} - metadata cleaned up`);
          } else {
            logger.error(`Job ${job?.id} failed after all retries: ${err.message} - no cleanup possible due to missing data`);
          }
        }
      } catch (error) {
        logger.error(`Failed to handle failed job ${job?.id}: ${error.message}`);
      }
    });

    imageWorker.on('stalled', (jobId) => {
      logger.warn(`Image job ${jobId} stalled`);
    });

    imageWorker.on('error', (err) => {
      logger.error(`Image worker error: ${err.message}`, err.stack);
    });

    const postProcessingWorker = new Worker(
      QUEUE_NAMES.IMAGE_POST_PROCESSING,
      async (job: Job<PostProcessingJobData>) => {
        const postProcessor = app.get(PostProcessingProcessor) as PostProcessingProcessor;
        return await postProcessor.processImagePostProcessing(job.data);
      },
      {
        connection: redisConfig.connectionConfig,
        concurrency: 6,
        removeOnComplete: { age: 24 * 60 * 60, count: 100 },
        removeOnFail: { age: 24 * 60 * 60, count: 100 },
      },
    );

    postProcessingWorker.on('ready', async () => {
      logger.log('Post-processing worker is ready and waiting for Bobby image jobs');
    });

    postProcessingWorker.on('completed', async (job, result) => {
      const jobData = job?.data as PostProcessingJobData | undefined;
      const resultData = result as { jobId?: string } | undefined;
      const completedJobId = jobData?.jobId ?? resultData?.jobId ?? job.id;
      logger.log(`Post-processing job ${completedJobId} completed successfully`);

      try {
        webhookService
          .notifyJobCompleted(result)
          .catch((err) => logger.warn(`Webhook notifyJobCompleted failed for job ${completedJobId}: ${err?.message || err}`));
        if (jobData?.userId) {
          await redisService.batchDeleteJobData(completedJobId, jobData.userId);
        }
      } catch (error) {
        logger.error(`Failed post-processing cleanup for job ${job.id}: ${error.message}`);
      }
    });

    postProcessingWorker.on('failed', async (job, err) => {
      const jobData = job?.data as PostProcessingJobData | undefined;
      const failedJobId = jobData?.jobId ?? job.id;
      const attemptsExhausted = job?.attemptsMade >= (job?.opts?.attempts || 3);

      if (attemptsExhausted) {
        logger.error(`Post-processing job ${failedJobId} failed after ${job?.attemptsMade} attempts: ${err.message}`);

        if (failedJobId) {
          try {
            await webhookService.notifyJobFailed(failedJobId, err);
            logger.log(`Notified webhook of post-processing job failure after ${job?.attemptsMade} attempts: ${failedJobId}`);
          } catch (webhookError) {
            logger.warn(`Failed to send failure webhook for job ${failedJobId}: ${webhookError.message}`);
          }
        }

        try {
          if (jobData?.jobId && jobData?.userId) {
            await redisService.batchDeleteJobData(jobData.jobId, jobData.userId);
          }
        } catch (e) {
          logger.error(`Failed post-processing cleanup for job ${job.id}: ${e.message}`);
        }
      } else {
        logger.warn(
          `Post-processing job ${failedJobId} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts || 3}), will retry...`,
        );
      }
    });

    postProcessingWorker.on('error', (err) => {
      logger.error(`Post-processing worker error: ${err.message}`, err.stack);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.log(`Received ${signal}, shutting down gracefully...`);

      try {
        await Promise.all([
          imageWorker.close(),
          postProcessingWorker.close(),
          postProcessingQueue.close(),
        ]);
        logger.log('Workers closed successfully');
        await app.close();
        logger.log('Application context closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error(`Error during shutdown: ${error.message}`, error.stack);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    setInterval(async () => {
      try {
        const isHealthy = await webhookService.healthCheck();
        logger.debug(`Health check: ${isHealthy ? 'OK' : 'FAILED'}`);
      } catch (error) {
        logger.warn(`Health check failed: ${error.message}`);
      }
    }, 5 * 60 * 1000);

    logger.log('Bobby Worker started successfully');
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`Queues: ${QUEUE_NAMES.IMAGE_GENERATION}, ${QUEUE_NAMES.IMAGE_POST_PROCESSING}`);
    logger.log(`Concurrency: Image=${Math.max(2, Math.min(4, CONCURRENCY))}, PostProcessing=6`);
  } catch (error) {
    logger.error(`Failed to start worker: ${error.message}`, error.stack);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logger.error(`Uncaught Exception: ${error.message}`, error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error(`Unhandled Rejection at: ${JSON.stringify(promise)}, reason: ${reason}`);
  process.exit(1);
});

bootstrap();
