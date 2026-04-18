import { Logger, LoggerService } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import rawBodyMiddleware from './app/rawBody.middleware';
import * as bodyParser from 'body-parser';
import { FileLogger } from './service/logger-service/file-logger.service';

async function bootstrap() {
  const environment = process.env.NODE_ENV || 'development';
  const isDeploymentEnvironment = ['staging', 'production'].includes(environment);
  let logger: LoggerService;
  // Setup logger based on environment
  if (isDeploymentEnvironment) {
    logger = new FileLogger();
  } else {
    logger = new Logger('main');
  }

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false, // Disable default body parser to use custom configuration
    logger: isDeploymentEnvironment ? logger : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Configure body parser with increased limits for large base64 image uploads
  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

  // Trust proxy for proper HTTPS/WSS handling
  const expresspp = app.getHttpAdapter().getInstance();
  expresspp.set('trust proxy', 1);
  // Enable CORS
  app.enableCors({
    origin: (process.env.ALLOWED_CORS_DOMAINS || '').split(','),
    methods: 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
    allowedHeaders: '*',
    credentials: true,
  });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Initialize Firebase Admin
  const configService: ConfigService = app.get(ConfigService);
  const firebaseConfig = {
    type: configService.get<string>('TYPE'),
    project_id: configService.get<string>('PROJECT_ID'),
    private_key_id: configService.get<string>('PRIVATE_KEY_ID'),
    private_key: configService.get<string>('PRIVATE_KEY')?.replace(/\\n/g, '\n'),
    client_email: configService.get<string>('CLIENT_EMAIL'),
    client_id: configService.get<string>('CLIENT_ID'),
    auth_uri: configService.get<string>('AUTH_URI'),
    token_uri: configService.get<string>('TOKEN_URI'),
    auth_provider_x509_cert_url: configService.get<string>('AUTH_CERT_URL'),
    client_x509_cert_url: configService.get<string>('CLIENT_CERT_URL'),
    universe_domain: configService.get<string>('UNIVERSAL_DOMAIN'),
  } as admin.ServiceAccount;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
    });
  }

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Bobby API')
    .setDescription('The Bobby API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  // Raw body middleware for Stripe webhooks
  app.use(rawBodyMiddleware());

  // Limit request body size
  app.use(bodyParser.json({ limit: '50mb' }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 Swagger documentation: http://localhost:${port}/${globalPrefix}/docs`);

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    Logger.log(`\n⚠️  Received ${signal}, starting graceful shutdown...`);

    try {
      await app.close();
      Logger.log('✅ Application closed successfully');
      process.exit(0);
    } catch (error) {
      Logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap();
