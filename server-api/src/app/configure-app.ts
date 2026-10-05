import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { RuntimeConfig } from '../config/runtime-config';

/** Request bodies are small metadata documents; images travel through the upload endpoints. */
export const JSON_BODY_LIMIT = '1mb';

/** HTTP-level setup shared by the real bootstrap and the integration tests. */
export function configureApp(app: INestApplication, config: RuntimeConfig): void {
  const express = app as NestExpressApplication;
  express.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  express.useBodyParser('urlencoded', { limit: JSON_BODY_LIMIT, extended: true });

  // Trust the first proxy for correct HTTPS/WSS handling.
  express.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.enableCors({
    origin: config.corsOrigins,
    methods: 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
    credentials: true,
  });
  app.setGlobalPrefix('api');
}
