import 'dotenv/config';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserModule } from '../modules/user/user.module';
import { NotificationModule } from '../modules/notification/notification.module';
import { SubscriptionModule } from '../modules/subscription/subscription.module';
import { AuthModule } from '../modules/auth/auth.module';
import { JwtService } from '@nestjs/jwt';
import { AttributeModule } from '../modules/attribute/attribute.module';
import { ConfigurationService } from '../modules/profile-config/configuration.service';
import { ConfigurationRepository } from '../modules/profile-config/configuration.repository';
import { UserController } from '../modules/user/user.controller';
import { UserSurveyModule } from '../modules/user-survey/user-survey.module';
import { PaymentModule } from '../modules/payment/payment.module';
import { ConfigModule } from '@nestjs/config';
import { StripeWebhookModule } from '../modules/stripe-webhook/stripe-webhook.module';
import { UploadModule } from '../modules/upload/upload.module';
import { TeamModule } from '../modules/team/team.module';
import { PrivacyModule } from '../modules/privacy/privacy.module';
import { VizpointModule } from '../modules/vizpoint/vizpoint.module';
import { ImageGenerationModule } from '../modules/image-generation/image-generation.module';
import { PromptEnhancementModule } from '../modules/prompt-enhancement/prompt-enhancement.module';
import { ValidationMiddleware } from 'src/middleware';
import { BullModule } from '@nestjs/bullmq';
import { ImageModule } from 'src/modules/image/image.module';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { EntitlementModule } from '../modules/entitlement/entitlement.module';
import { ModelCatalogModule } from '../modules/model-catalog/model-catalog.module';
import { AuthController } from '../modules/auth/auth.controller';
import { AdminModule } from '../modules/admin/admin.module';
import { isRedisConfigured } from 'src/shared/utils/env.utils';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

const redisEnabled = isRedisConfigured();
const cacheModule = redisEnabled
  ? CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        password: configService.get('REDIS_PASSWORD'),
        db: configService.get('REDIS_DB', 0),
        ttl: 300, // 5 minutes default
      }),
      inject: [ConfigService],
    })
  : CacheModule.register({
      isGlobal: true,
      ttl: 300,
    });

const queueModules = redisEnabled
  ? [ImageGenerationModule]
  : [];

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    cacheModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ...(redisEnabled
      ? [
          BullModule.forRoot({
            connection: {
              host: process.env.REDIS_HOST,
              port: parseInt(process.env.REDIS_PORT),
              lazyConnect: true,
            },
          }),
        ]
      : []),
    UserModule,
    NotificationModule,
    SubscriptionModule,
    AuthModule,
    AttributeModule,
    UserSurveyModule,
    PaymentModule,
    StripeWebhookModule,
    UploadModule,
    TeamModule,
    PrivacyModule,
    VizpointModule,
    PromptEnhancementModule,
    ImageModule,
    EntitlementModule,
    ModelCatalogModule,
    AdminModule,
    ...queueModules,
  ],
  controllers: [AppController, AuthController, UserController],
  providers: [AppService, PrismaService, JwtService, ConfigurationService, ConfigurationRepository],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ValidationMiddleware).forRoutes(
      // Apply for specific routes
      'feedback',
    );
  }
}
