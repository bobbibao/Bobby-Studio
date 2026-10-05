import 'dotenv/config';
import { Logger, LoggerService } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { FileLogger } from './service/logger-service/file-logger.service';
import { ConfigError, loadRuntimeConfig } from './config/runtime-config';
import { initializeFirebaseAdmin } from './config/firebase-admin';
import { configureApp } from './app/configure-app';
import { RedisIoAdapter } from './modules/ops/redis-io.adapter';

async function bootstrap() {
  let config: ReturnType<typeof loadRuntimeConfig>;
  try {
    config = loadRuntimeConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      // Field names and reasons only; values are never printed.
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  const logger: LoggerService = config.isDeployed ? new FileLogger() : new Logger('main');

  initializeFirebaseAdmin(config);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: config.isDeployed ? logger : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  configureApp(app, config);
  const ioAdapter = new RedisIoAdapter(app, config);
  ioAdapter.connect();
  app.useWebSocketAdapter(ioAdapter);

  if (!config.isDeployed) {
    const swagger = new DocumentBuilder().setTitle('Bobby Studio API').setVersion('1.0').addBearerAuth().build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));
  }

  await app.listen(config.port);
  Logger.log(`Bobby Studio API listening on port ${config.port} (${config.appEnv})`);

  const gracefulShutdown = async (signal: string) => {
    Logger.log(`Received ${signal}, shutting down gracefully`);
    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      Logger.error('Error during shutdown', (error as Error).stack);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
}

void bootstrap();
